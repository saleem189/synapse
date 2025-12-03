// ================================
// Messages API Routes
// ================================
// GET /api/messages?roomId=xxx - Get messages for a room
// POST /api/messages - Save a new message

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { MessageService } from "@/lib/services/message.service";
import { broadcastMessage } from "@/lib/socket-server-client";
import { logApiReceive, logApiBroadcast, logError } from "@/lib/message-flow-logger";
import { messageRateLimiter, rateLimitMiddleware } from "@/lib/rate-limit";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import { validateRequest } from "@/lib/middleware/validate-request";
import { messageSchema } from "@/lib/validations";

// Get services from DI container
const messageService = getService<MessageService>('messageService');

// Route segment config for caching
export const dynamic = 'force-dynamic'; // Messages are always dynamic
export const revalidate = 10; // Revalidate every 10 seconds

/**
 * GET /api/messages
 * Get messages for a specific chat room
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (!roomId) {
      return handleError(new ValidationError('Room ID is required'));
    }

    // 3. Delegate to service
    const result = await messageService.getMessages(session.user.id, roomId, {
      limit,
      cursor: cursor || undefined,
    });

    // 4. Return response with caching headers
    // Messages are dynamic, so cache for shorter duration
    const response = NextResponse.json(result);
    response.headers.set('Cache-Control', CACHE_HEADERS.messages);
    return response;
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/messages
 * Save a new message to the database
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }

    // 2. Rate limiting
    const rateLimit = await rateLimitMiddleware(request, messageRateLimiter, session.user.id);
    if (!rateLimit.allowed) {
      return rateLimit.response as NextResponse;
    }

    // 3. Validate request body using middleware
    const validation = await validateRequest(request, messageSchema);
    if (!validation.success) {
      return validation.response;
    }
    const validatedData = validation.data;

    // 4. Log API receive
    const tempMessageId = `temp_${Date.now()}`;
    logApiReceive(tempMessageId, validatedData.roomId, session.user.id, validatedData.content || '');

    // 5. Delegate to service (service layer will do additional validation and sanitization)
    const message = await messageService.sendMessage(
      session.user.id,
      validatedData.roomId,
      validatedData.content || '',
      {
        replyToId: validatedData.replyToId || undefined,
        fileUrl: validatedData.fileUrl,
        fileName: validatedData.fileName,
        fileSize: validatedData.fileSize,
        fileType: validatedData.fileType,
        type: validatedData.type,
      }
    );

    // 6. Transform message to match expected format
    const transformedMessage = {
      id: message.id,
      content: message.content,
      type: message.type,
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      fileSize: message.fileSize,
      fileType: message.fileType,
      isEdited: message.isEdited,
      isDeleted: message.isDeleted,
      replyToId: message.replyToId,
      replyTo: message.replyTo ? {
        id: message.replyTo.id,
        content: message.replyTo.content,
        senderName: message.replyTo.sender.name,
        senderAvatar: message.replyTo.sender.avatar,
      } : null,
      reactions: {},
      isRead: false,
      createdAt: message.createdAt.toISOString(),
      senderId: message.senderId,
      senderName: message.sender.name,
      senderAvatar: message.sender.avatar,
      roomId: message.roomId,
    };

    // 7. Broadcast message via socket to other users (after saving to DB)
    // This ensures all users receive the message with the real database ID
    broadcastMessage(validatedData.roomId, {
      id: transformedMessage.id,
      content: transformedMessage.content,
      senderId: transformedMessage.senderId,
      senderName: transformedMessage.senderName,
      type: transformedMessage.type,
      fileUrl: transformedMessage.fileUrl,
      fileName: transformedMessage.fileName,
      fileSize: transformedMessage.fileSize,
      fileType: transformedMessage.fileType,
      replyToId: transformedMessage.replyToId || undefined,
      replyTo: transformedMessage.replyTo,
      createdAt: transformedMessage.createdAt,
    })
      .then(() => {
      // Log successful broadcast (will be logged in broadcastMessage function)
    })
      .catch((error) => {
        logError('API_BROADCAST', transformedMessage.id, validatedData.roomId, error, {
          senderId: transformedMessage.senderId,
        });
        console.error("Failed to broadcast message:", error);
      });

    // 8. Return response with rate limit headers
    const response = NextResponse.json({ message: transformedMessage }, { status: 201 });
    
    // Add rate limit headers
    if (rateLimit.response) {
      rateLimit.response.headers.forEach((value, key) => {
        response.headers.set(key, value);
      });
    }
    
    return response;
  } catch (error) {
    return handleError(error);
  }
}

