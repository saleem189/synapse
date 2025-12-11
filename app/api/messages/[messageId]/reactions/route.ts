// ================================
// Message Reactions API
// ================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { MessageService } from "@/lib/services/message.service";
import { MessageRepository } from "@/lib/repositories/message.repository";
import { broadcastReactionUpdate } from "@/lib/socket-server-client";

// Services are resolved asynchronously inside route handlers

interface RouteParams {
  params: Promise<{
    messageId: string;
  }>;
}

/**
 * POST /api/messages/[messageId]/reactions
 * Add or remove a reaction to a message
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

    // Get service from DI container (async)
    const messageService = await getService<MessageService>('messageService');

    const { messageId } = await params;
    const { emoji } = await request.json();

    const result = await messageService.toggleReaction(
      messageId,
      session.user.id,
      emoji
    );

    // Get updated reactions to broadcast
    const updatedReactions = await messageService.getReactions(messageId, session.user.id);
    
    // Get message to find roomId
    const messageRepo = await getService<MessageRepository>('messageRepository');
    const message = await messageRepo.findById(messageId);
    
    // Broadcast reaction update via socket
    if (message?.roomId) {
      await broadcastReactionUpdate(message.roomId, messageId, updatedReactions);
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * GET /api/messages/[messageId]/reactions
 * Get all reactions for a message
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

    // Get service from DI container (async)
    const messageService = await getService<MessageService>('messageService');

    const { messageId } = await params;
    const reactions = await messageService.getReactions(messageId, session.user.id);

    return NextResponse.json({ reactions });
  } catch (error) {
    return handleError(error);
  }
}

