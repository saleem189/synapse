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

// Get services from DI container
const userService = getService<UserService>('userService');

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
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    return response;
  } catch (error) {
    return handleError(error);
  }
}

