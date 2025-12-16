// ================================
// Message Replies API Route
// ================================
// GET /api/messages/:messageId/replies - Get all replies to a message

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

    // First check if the original message exists and user has access
    const originalMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
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

    if (!originalMessage) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (originalMessage.room.participants.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch all replies to this message
    const replies = await prisma.message.findMany({
      where: {
        replyToId: messageId,
        isDeleted: false,
      },
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
      },
      orderBy: { createdAt: 'asc' }, // Oldest first for thread view
    });

    // Transform replies
    const transformedReplies = replies.map((reply) => {
      // Group reactions by emoji
      const reactionsByEmoji: Record<string, Array<{ id: string; name: string; avatar: string | null }>> = {};
      reply.reactions.forEach((reaction) => {
        if (!reactionsByEmoji[reaction.emoji]) {
          reactionsByEmoji[reaction.emoji] = [];
        }
        reactionsByEmoji[reaction.emoji].push({
          id: reaction.user.id,
          name: reaction.user.name,
          avatar: reaction.user.avatar,
        });
      });

      return {
        id: reply.id,
        content: reply.content,
        type: reply.type,
        fileUrl: reply.fileUrl,
        fileName: reply.fileName,
        fileSize: reply.fileSize,
        fileType: reply.fileType,
        isEdited: reply.isEdited,
        isDeleted: reply.isDeleted,
        isPinned: reply.isPinned,
        pinnedAt: reply.pinnedAt?.toISOString() || null,
        pinnedById: reply.pinnedById || null,
        replyToId: reply.replyToId,
        replyTo: reply.replyTo ? {
          id: reply.replyTo.id,
          content: reply.replyTo.content,
          senderName: reply.replyTo.sender.name,
          senderAvatar: reply.replyTo.sender.avatar,
        } : null,
        replyCount: reply._count.replies,
        reactions: reactionsByEmoji,
        createdAt: reply.createdAt.toISOString(),
        senderId: reply.senderId,
        senderName: reply.sender.name,
        senderAvatar: reply.sender.avatar,
        roomId: reply.roomId,
      };
    });

    return NextResponse.json(transformedReplies);
  } catch (error) {
    console.error('[API /messages/:id/replies] Error:', error);
    return handleError(error);
  }
}

