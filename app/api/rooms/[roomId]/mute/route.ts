// ================================
// Room Mute API Route
// ================================
// POST /api/rooms/:roomId/mute - Toggle mute status

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { handleError } from '@/lib/errors/error-handler';
import { getMuteExpiry } from '@/features/mute-channels';
import type { MuteDuration } from '@/features/mute-channels';

// Zod schema for request validation
const muteDurationSchema = z.enum(['permanent', '1h', '8h', '24h', '1w']);

const muteChannelSchema = z.object({
  isMuted: z.boolean(),
  duration: muteDurationSchema.optional().default('permanent'),
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
    const { isMuted, duration } = muteChannelSchema.parse(body);

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

    // Calculate mute expiry if muting
    const mutedUntil = isMuted ? getMuteExpiry(duration as MuteDuration) : null;

    // Update mute status
    const updatedParticipant = await prisma.roomParticipant.update({
      where: {
        id: participant.id,
      },
      data: {
        isMuted,
        mutedAt: isMuted ? new Date() : null,
        mutedUntil,
      },
    });

    return NextResponse.json({
      success: true,
      roomId,
      isMuted: updatedParticipant.isMuted,
      mutedAt: updatedParticipant.mutedAt?.toISOString() || null,
      mutedUntil: updatedParticipant.mutedUntil?.toISOString() || null,
    });
  } catch (error) {
    console.error('[API /mute] Error toggling mute:', error);
    return handleError(error);
  }
}

