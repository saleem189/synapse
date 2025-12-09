// ================================
// Chat Rooms API Routes
// ================================
// GET /api/rooms - Get user's chat rooms
// POST /api/rooms - Create a new chat room or start DM

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError, ValidationError, NotFoundError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { RoomService } from "@/lib/services/room.service";
import { UserRepository } from "@/lib/repositories/user.repository";
import { apiRateLimiter, rateLimitMiddleware } from "@/lib/rate-limit";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import { validateRequest } from "@/lib/middleware/validate-request";
import { createRoomSchema } from "@/lib/validations";
import type { ILogger } from "@/lib/logger/logger.interface";

// Services are resolved asynchronously inside route handlers

// Route segment config for caching
export const dynamic = 'force-dynamic'; // Rooms are dynamic
export const revalidate = 60; // Revalidate every 60 seconds

/**
 * GET /api/rooms
 * Get all chat rooms for the current user
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }

    // Get services from DI container (async)
    const roomService = await getService<RoomService>('roomService');

    // Rate limiting
    const rateLimit = await rateLimitMiddleware(request, apiRateLimiter, session.user.id);
    if (!rateLimit.allowed) {
      return rateLimit.response as NextResponse;
    }

    // Fetch rooms with error handling
    let rooms;
    try {
      rooms = await roomService.getUserRooms(session.user.id);
    } catch (serviceError) {
      // Log the error for debugging
      const logger = await getService<ILogger>('logger');
      logger.error(
        '[GET /api/rooms] Error fetching rooms',
        serviceError instanceof Error ? serviceError : new Error(String(serviceError)),
        { component: 'RoomsAPI', userId: session.user.id }
      );
      throw serviceError;
    }

    const response = NextResponse.json({ rooms });
    
    // Add caching headers for better performance
    response.headers.set('Cache-Control', CACHE_HEADERS.rooms);
    
    // Add rate limit headers
    if (rateLimit.response) {
      rateLimit.response.headers.forEach((value, key) => {
        response.headers.set(key, value);
      });
    }
    
    return response;
  } catch (error) {
    // Error is handled by handleError which logs to Sentry
    return handleError(error);
  }
}

/**
 * POST /api/rooms
 * Create a new chat room or find/create DM
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }

    // Get services from DI container (async)
    const roomService = await getService<RoomService>('roomService');
    const userRepo = await getService<UserRepository>('userRepository');

    // Rate limiting
    const rateLimit = await rateLimitMiddleware(request, apiRateLimiter, session.user.id);
    if (!rateLimit.allowed) {
      return rateLimit.response as NextResponse;
    }

    // Verify user exists
    const currentUser = await userRepo.findById(session.user.id);
    if (!currentUser) {
      return handleError(new NotFoundError('User not found in database. Please log out and log back in.'));
    }

    // Validate request body using middleware
    const validation = await validateRequest(request, createRoomSchema);
    if (!validation.success) {
      return validation.response;
    }
    const validatedData = validation.data;

    // Use validated data (participantIds is already validated by schema)
    const { name, description, isGroup = false, participantIds } = validatedData;

    // For DMs (1-on-1 chat)
    if (!isGroup && participantIds.length === 1) {
      const { room, existing } = await roomService.createOrFindDM(
        session.user.id,
        participantIds[0]
      );

      return NextResponse.json({
        room: {
          id: room.id,
          name: room.name,
          isGroup: false,
          participants: room.participants.map((p) => ({
            id: p.user.id,
            name: p.user.name,
            avatar: p.user.avatar,
            status: p.user.status || 'OFFLINE',
          })),
        },
        existing,
      }, { status: existing ? 200 : 201 });
    }

    // For Group chats
    const room = await roomService.createGroup(
      session.user.id,
      name || "",
      participantIds,
      description
    );

      const response = NextResponse.json({
        room: {
          id: room.id,
          name: room.name,
          isGroup: true,
          participants: room.participants.map((p) => ({
            id: p.user.id,
            name: p.user.name,
            avatar: p.user.avatar,
            status: p.user.status || 'OFFLINE',
          })),
        },
      }, { status: 201 });
      
      // Add rate limit headers
      if (rateLimit.response) {
        rateLimit.response.headers.forEach((value, key) => {
          if (key.startsWith('X-RateLimit-')) {
            response.headers.set(key, value);
          }
        });
      }
      
      return response;
  } catch (error) {
    return handleError(error);
  }
}
