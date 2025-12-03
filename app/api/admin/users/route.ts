// ================================
// Admin Users API
// ================================
// GET - List all users
// PATCH - Update user
// DELETE - Delete user

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { AdminService } from "@/lib/services/admin.service";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";

// Get services from DI container
const adminService = getService<AdminService>('adminService');

// Route segment config for caching
export const dynamic = 'force-dynamic'; // Admin users are dynamic
export const revalidate = 60; // Revalidate every 60 seconds

/**
 * GET /api/admin/users
 * Get all users with pagination and search
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }
    if (session.user.role !== "ADMIN") {
      return handleError(new ForbiddenError('Admin access required'));
    }

    // Parse query parameters for pagination and search
    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get("skip") || "0", 10);
    const take = parseInt(searchParams.get("take") || "50", 10);
    const search = searchParams.get("search") || undefined;

    const users = await adminService.getAllUsers({
      skip,
      take: Math.min(take, 100), // Cap at 100
      search,
    });
    
    // Add caching headers - user list can be cached for 60 seconds
    const response = NextResponse.json({ users });
    response.headers.set('Cache-Control', CACHE_HEADERS.adminUsers);
    return response;
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PATCH /api/admin/users
 * Update a user
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }
    if (session.user.role !== "ADMIN") {
      return handleError(new ForbiddenError('Admin access required'));
    }

    const body = await request.json();
    const { userId, name, email, role, status } = body;

    const user = await adminService.updateUser(userId, { name, email, role, status });
    return NextResponse.json({ user });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * DELETE /api/admin/users
 * Delete a user
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }
    if (session.user.role !== "ADMIN") {
      return handleError(new ForbiddenError('Admin access required'));
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const result = await adminService.deleteUser(userId || '');
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}

