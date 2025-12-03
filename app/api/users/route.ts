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

// Get services from DI container
const userService = getService<UserService>('userService');

// Route segment config for caching
export const dynamic = 'auto'; // Can be cached
export const revalidate = 300; // Revalidate every 5 minutes

/**
 * GET /api/users
 * Get all users for adding to chat rooms
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }

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
        lastSeen: user.lastSeen,
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

