import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getIO } from '@/lib/socket-server-client';

// POST /api/messages/:messageId/pin - Pin a message
export async function POST(
  req: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const messageId = params.messageId;

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

    // Emit socket event
    try {
      const io = getIO();
      io.to(message.roomId).emit('message:pinned', {
        messageId,
        roomId: message.roomId,
        pinnedBy: updated.pinnedBy
      });
    } catch (socketError) {
      // Socket error shouldn't fail the API request
      console.error('Socket emit error:', socketError);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error pinning message:', error);
    return NextResponse.json(
      { error: 'Failed to pin message' },
      { status: 500 }
    );
  }
}

// DELETE /api/messages/:messageId/pin - Unpin a message
export async function DELETE(
  req: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const messageId = params.messageId;

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

    // Emit socket event
    try {
      const io = getIO();
      io.to(message.roomId).emit('message:unpinned', {
        messageId,
        roomId: message.roomId,
        unpinnedBy: { id: session.user.id, name: session.user.name }
      });
    } catch (socketError) {
      console.error('Socket emit error:', socketError);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error unpinning message:', error);
    return NextResponse.json(
      { error: 'Failed to unpin message' },
      { status: 500 }
    );
  }
}

