// ================================
// Users API Routes
// ================================
// GET /api/users - Get all users (for adding to rooms)

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { UserService } from "@/lib/services/user.service";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";

// Services are resolved asynchronously inside route handlers

// Route segment config for caching
export const dynamic = 'force-dynamic'; // Must be dynamic (uses headers for auth)
export const revalidate = 0; // No caching for dynamic routes

/**
 * GET /api/users
 * Get all users for adding to chat rooms
 */
export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }

    // Get service from DI container (async)
    const userService = await getService<UserService>('userService');

    // Get all users except current user
    const allUsers = await userService.getAllUsers();
    const users = allUsers
      .filter((user) => user.id !== session.user.id)
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        // Standardize date serialization: always use ISO strings
        lastSeen: user.lastSeen ? (user.lastSeen instanceof Date ? user.lastSeen.toISOString() : user.lastSeen) : null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Add caching headers - user list doesn't change frequently
    const response = NextResponse.json({ users });
    response.headers.set('Cache-Control', CACHE_HEADERS.users);
    return response;
  } catch (error) {
    return handleError(error);
  }
}

