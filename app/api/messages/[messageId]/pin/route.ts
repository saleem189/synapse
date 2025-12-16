import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { broadcastPinUpdate } from '@/lib/socket-server-client';
import { z } from 'zod';
import { handleError } from '@/lib/errors/error-handler';

// Zod schema for params validation (Security Rule: Input Validation)
const pinMessageParamsSchema = z.object({
  messageId: z.string().cuid('Invalid message ID format'),
});

// POST /api/messages/:messageId/pin - Pin a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate params (Security Rule: Input Validation with Zod)
    const { messageId } = pinMessageParamsSchema.parse(await params);

    // Get message and verify access
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        room: {
          include: {
            participants: {
              where: { userId: session.user.id }
            }
          }
        }
      }
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Check if user is in room
    if (message.room.participants.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if already pinned
    if (message.isPinned) {
      return NextResponse.json({ error: 'Message already pinned' }, { status: 400 });
    }

    // Check pin limit
    const pinnedCount = await prisma.message.count({
      where: { roomId: message.roomId, isPinned: true }
    });

    if (pinnedCount >= (message.room.maxPins || 50)) {
      return NextResponse.json(
        { error: 'Pin limit reached. Unpin a message first.' },
        { status: 400 }
      );
    }

    // Pin the message
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        isPinned: true,
        pinnedAt: new Date(),
        pinnedById: session.user.id
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        pinnedBy: { select: { id: true, name: true, avatar: true } }
      }
    });

    // Broadcast pin update via socket
    try {
      await broadcastPinUpdate(
        message.roomId,
        messageId,
        true, // isPinned
        session.user.id,
        updated.pinnedAt?.toISOString() || null
      );
    } catch (socketError) {
      // Socket error shouldn't fail the API request
      console.error('Socket broadcast error:', socketError);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error pinning message:', error);
    return handleError(error);
  }
}

// DELETE /api/messages/:messageId/pin - Unpin a message
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate params (Security Rule: Input Validation with Zod)
    const { messageId } = pinMessageParamsSchema.parse(await params);

    // Get message
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        room: {
          include: {
            participants: {
              where: { userId: session.user.id }
            }
          }
        }
      }
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.room.participants.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Unpin
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        isPinned: false,
        pinnedAt: null,
        pinnedById: null
      }
    });

    // Broadcast unpin update via socket
    try {
      await broadcastPinUpdate(
        message.roomId,
        messageId,
        false, // isPinned
        session.user.id,
        null // pinnedAt is null when unpinned
      );
    } catch (socketError) {
      console.error('Socket broadcast error:', socketError);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error unpinning message:', error);
    return handleError(error);
  }
}

