// ================================
// Message Edit/Delete API
// ================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { MessageService } from "@/lib/services/message.service";

// Get services from DI container
const messageService = getService<MessageService>('messageService');

interface RouteParams {
  params: {
    messageId: string;
  };
}

/**
 * PATCH /api/messages/[messageId]
 * Edit a message
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }

    const { messageId } = params;
    const { content } = await request.json();

    const updatedMessage = await messageService.editMessage(
      messageId,
      session.user.id,
      content
    );

    // Transform to match expected format
    const transformed = {
      id: updatedMessage.id,
      content: updatedMessage.content,
      type: updatedMessage.type,
      isEdited: updatedMessage.isEdited,
      updatedAt: updatedMessage.updatedAt.toISOString(),
    };

    return NextResponse.json({ message: transformed });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * DELETE /api/messages/[messageId]
 * Delete a message
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }

    const { messageId } = params;
    // Note: deleteForEveryone logic can be added to service if needed
    await messageService.deleteMessage(messageId, session.user.id);

    return NextResponse.json({ message: "Message deleted successfully" });
  } catch (error) {
    return handleError(error);
  }
}

