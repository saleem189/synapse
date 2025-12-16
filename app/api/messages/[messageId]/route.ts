// ================================
// Single Message API Route
// ================================
// GET /api/messages/:messageId - Get a single message

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { handleError } from '@/lib/errors/error-handler';

const messageIdSchema = z.object({
  messageId: z.string().cuid('Invalid message ID format'),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await params;
    messageIdSchema.parse({ messageId });

    // Fetch message with relations
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
        room: {
          include: {
            participants: {
              where: {
                userId: session.user.id,
              },
            },
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Check if user has access to this message (is participant in the room)
    if (message.room.participants.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Group reactions by emoji
    const reactionsByEmoji: Record<string, Array<{ id: string; name: string; avatar: string | null }>> = {};
    message.reactions.forEach((reaction) => {
      if (!reactionsByEmoji[reaction.emoji]) {
        reactionsByEmoji[reaction.emoji] = [];
      }
      reactionsByEmoji[reaction.emoji].push({
        id: reaction.user.id,
        name: reaction.user.name,
        avatar: reaction.user.avatar,
      });
    });

    // Transform to expected format
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
      isPinned: message.isPinned,
      pinnedAt: message.pinnedAt?.toISOString() || null,
      pinnedById: message.pinnedById || null,
      replyToId: message.replyToId,
      replyTo: message.replyTo ? {
        id: message.replyTo.id,
        content: message.replyTo.content,
        senderName: message.replyTo.sender.name,
        senderAvatar: message.replyTo.sender.avatar,
      } : null,
      replyCount: message._count.replies,
      reactions: reactionsByEmoji,
      createdAt: message.createdAt.toISOString(),
      senderId: message.senderId,
      senderName: message.sender.name,
      senderAvatar: message.sender.avatar,
      roomId: message.roomId,
    };

    return NextResponse.json(transformedMessage);
  } catch (error) {
    console.error('[API /messages/:id] Error:', error);
    return handleError(error);
  }
}
