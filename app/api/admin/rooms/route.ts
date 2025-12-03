// ================================
// Admin Rooms API
// ================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { AdminService } from "@/lib/services/admin.service";

// Get services from DI container
const adminService = getService<AdminService>('adminService');

/**
 * DELETE /api/admin/rooms
 * Delete a chat room
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
    const roomId = searchParams.get("roomId");

    const result = await adminService.deleteRoom(roomId || '');
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}

