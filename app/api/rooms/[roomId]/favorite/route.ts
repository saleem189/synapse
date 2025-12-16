// ================================
// Room Favorite API Route
// ================================
// POST /api/rooms/:roomId/favorite - Toggle favorite status

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { handleError } from '@/lib/errors/error-handler';

// Zod schema for request validation
const toggleFavoriteSchema = z.object({
  isFavorite: z.boolean(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomId } = await params;
    const body = await req.json();
    
    // Validate request body
    const { isFavorite } = toggleFavoriteSchema.parse(body);

    // Check if user is a participant in this room
    const participant = await prisma.roomParticipant.findUnique({
      where: {
        userId_roomId: {
          userId: session.user.id,
          roomId,
        },
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'You are not a member of this room' },
        { status: 403 }
      );
    }

    // Update favorite status
    const updatedParticipant = await prisma.roomParticipant.update({
      where: {
        id: participant.id,
      },
      data: {
        isFavorite,
        favoritedAt: isFavorite ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      roomId,
      isFavorite: updatedParticipant.isFavorite,
      favoritedAt: updatedParticipant.favoritedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error('[API /favorite] Error toggling favorite:', error);
    return handleError(error);
  }
}

