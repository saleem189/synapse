import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { handleError } from '@/lib/errors/error-handler';

// Zod schema for params validation (Security Rule: Input Validation)
const getPinnedMessagesSchema = z.object({
  roomId: z.string().cuid('Invalid room ID format'),
});

// GET /api/rooms/:roomId/pinned - Get all pinned messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate params (Security Rule: Input Validation with Zod)
    const { roomId } = getPinnedMessagesSchema.parse(await params);

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
    console.error('[API /pinned] Error fetching pinned messages:', error);
    return handleError(error);
  }
}

