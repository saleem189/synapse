// ================================
// Mark Message as Read API
// ================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { MessageService } from "@/lib/services/message.service";
import { MessageRepository } from "@/lib/repositories/message.repository";

// Get services from DI container
const messageService = getService<MessageService>('messageService');
const messageRepo = getService<MessageRepository>('messageRepository');

interface RouteParams {
  params: {
    messageId: string;
  };
}

/**
 * POST /api/messages/[messageId]/read
 * Mark a message as read by the current user
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }

    const { messageId } = params;
    
    // Check if it's own message (don't mark as read)
    const message = await messageRepo.findById(messageId);
    if (message && message.senderId === session.user.id) {
      return NextResponse.json({ message: "Cannot mark own message as read" });
    }

    await messageService.markAsRead(messageId, session.user.id);
    return NextResponse.json({ message: "Message marked as read" });
  } catch (error: any) {
    // Handle Prisma unique constraint errors gracefully
    // This can happen due to race conditions when multiple requests try to mark the same message as read
    if (error?.code === 'P2002' || error?.meta?.target?.includes('messageId')) {
      // Message is already marked as read - this is not an error
      return NextResponse.json({ message: "Message already marked as read" }, { status: 200 });
    }
    return handleError(error);
  }
}

/**
 * GET /api/messages/[messageId]/read
 * Get read receipts for a message
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }

    const { messageId } = params;
    const readReceipts = await messageService.getReadReceipts(messageId, session.user.id);

    return NextResponse.json({ readReceipts });
  } catch (error) {
    return handleError(error);
  }
}

