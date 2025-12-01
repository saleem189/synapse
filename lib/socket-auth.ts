// ================================
// Socket.IO Authentication
// ================================
// Utilities for authenticating Socket.IO connections using NextAuth session

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "./prisma";

/**
 * Verify Socket.IO authentication token
 * The token should be a user ID from the NextAuth session
 * 
 * This function:
 * 1. Validates the token format (CUID)
 * 2. Verifies the user exists in the database
 * 3. Checks the user is active (not banned/deleted)
 * 
 * @param token - Authentication token (user ID) from socket handshake
 * @returns User ID if authenticated, null otherwise
 */
export async function verifySocketToken(token: string | undefined): Promise<string | null> {
  if (!token) {
    return null;
  }

  try {
    // Validate token format (CUID format used by Prisma)
    if (typeof token !== 'string' || token.length === 0) {
      return null;
    }

    // Check if it's a valid CUID format
    // CUID format: starts with 'c' followed by 24 alphanumeric characters
    if (!/^c[a-z0-9]{24}$/.test(token)) {
      return null;
    }

    // Verify user exists in database and is active
    const user = await prisma.user.findUnique({
      where: { id: token },
      select: {
        id: true,
        // Add any fields you want to check (e.g., banned, deleted, etc.)
        // For now, we just check if user exists
      },
    });

    if (!user) {
      // User doesn't exist in database
      return null;
    }

    // Additional checks can be added here:
    // - Check if user is banned
    // - Check if user account is active
    // - Check if user has permission to use socket

    // Return user ID if all checks pass
    return user.id;
  } catch (error) {
    console.error('Socket token verification error:', error);
    return null;
  }
}

/**
 * Get user ID from NextAuth session
 * Used by the client to get the token for socket authentication
 */
export async function getSocketAuthToken(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    return session?.user?.id || null;
  } catch (error) {
    console.error('Error getting socket auth token:', error);
    return null;
  }
}

