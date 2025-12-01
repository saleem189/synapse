// ================================
// Admin Stats API
// ================================

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { AdminService } from "@/lib/services/admin.service";

// Get services from DI container
const adminService = getService<AdminService>('adminService');

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }
    if (session.user.role !== "admin") {
      return handleError(new ForbiddenError('Admin access required'));
    }

    const stats = await adminService.getStats();
    // Add caching headers - stats can be cached for 30 seconds
    const response = NextResponse.json(stats);
    response.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60');
    return response;
  } catch (error) {
    return handleError(error);
  }
}

