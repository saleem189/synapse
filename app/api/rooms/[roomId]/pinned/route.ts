import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/rooms/:roomId/pinned - Get all pinned messages
export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roomId = params.roomId;

    // Check room access
    const participant = await prisma.roomParticipant.findUnique({
      where: {
        userId_roomId: {
          roomId,
          userId: session.user.id
        }
      }
    });

    if (!participant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get pinned messages
    const pinned = await prisma.message.findMany({
      where: { roomId, isPinned: true, isDeleted: false },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        pinnedBy: { select: { id: true, name: true, avatar: true } },
        reactions: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        }
      },
      orderBy: { pinnedAt: 'desc' },
      take: 50 // Limit to 50 most recent
    });

    return NextResponse.json(pinned);
  } catch (error) {
    console.error('Error fetching pinned messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pinned messages' },
      { status: 500 }
    );
  }
}

