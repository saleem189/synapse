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

// Get services from DI container
const adminService = getService<AdminService>('adminService');

/**
 * GET /api/admin/users
 * Get all users
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }
    if (session.user.role !== "admin") {
      return handleError(new ForbiddenError('Admin access required'));
    }

    const users = await adminService.getAllUsers();
    // Add caching headers - user list can be cached for 60 seconds
    const response = NextResponse.json({ users });
    response.headers.set('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=120');
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
    if (session.user.role !== "admin") {
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
    if (session.user.role !== "admin") {
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

