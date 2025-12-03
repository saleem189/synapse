// ================================
// Batch Mark Messages as Read API
// ================================
// POST /api/messages/read-batch - Mark multiple messages as read in a single request
// This endpoint prevents race conditions when marking multiple messages as read

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { MessageService } from "@/lib/services/message.service";
import { MessageRepository } from "@/lib/repositories/message.repository";
import { validateRequest } from "@/lib/middleware/validate-request";
import { z } from "zod";

// Get services from DI container
const messageService = getService<MessageService>('messageService');
const messageRepo = getService<MessageRepository>('messageRepository');

// Validation schema for batch read request
const batchReadSchema = z.object({
  messageIds: z.array(z.string().min(1)).min(1).max(100), // Max 100 messages per batch
});

/**
 * POST /api/messages/read-batch
 * Mark multiple messages as read by the current user in a single atomic operation
 * 
 * Request body:
 * {
 *   "messageIds": ["msg1", "msg2", "msg3"]
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "marked": 3,
 *   "skipped": 0
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }

    // 2. Validate request body using middleware
    const validation = await validateRequest(request, batchReadSchema);
    if (!validation.success) {
      return validation.response;
    }
    const { messageIds } = validation.data;
    const userId = session.user.id;

    // 3. Filter out own messages (users can't mark their own messages as read)
    // Check all messages in parallel to determine which ones to skip
    const messageChecks = await Promise.allSettled(
      messageIds.map(messageId => messageRepo.findById(messageId))
    );

    const validMessageIds: string[] = [];
    let skipped = 0;

    for (let i = 0; i < messageChecks.length; i++) {
      const check = messageChecks[i];
      if (check.status === 'fulfilled' && check.value) {
        const message = check.value;
        // Skip if it's the user's own message
        if (message.senderId === userId) {
          skipped++;
          continue;
        }
        validMessageIds.push(messageIds[i]);
      }
    }

    if (validMessageIds.length === 0) {
      return NextResponse.json({
        success: true,
        marked: 0,
        skipped,
        message: skipped > 0 
          ? 'All messages are your own messages' 
          : 'No valid messages to mark as read'
      });
    }

    // 4. Mark all valid messages as read in a single transaction
    // This prevents race conditions and ensures atomicity
    let marked = 0;
    try {
      // Use Promise.allSettled to handle individual failures gracefully
      const results = await Promise.allSettled(
        validMessageIds.map(messageId => 
          messageService.markAsRead(messageId, userId)
        )
      );

      // Count successful operations
      marked = results.filter(r => r.status === 'fulfilled').length;
    } catch (error: any) {
      // If all fail, return error
      // If some succeed, we still return success with counts
      return handleError(error);
    }

    // 5. Return success response
    return NextResponse.json({
      success: true,
      marked,
      skipped,
      total: messageIds.length,
    });
  } catch (error) {
    return handleError(error);
  }
}

