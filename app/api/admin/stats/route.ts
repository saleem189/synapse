// ================================
// Admin Stats API
// ================================

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleError, UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { getService } from "@/lib/di";
import { AdminService } from "@/lib/services/admin.service";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";

// Get services from DI container
const adminService = getService<AdminService>('adminService');

// Route segment config for caching
export const dynamic = 'force-dynamic'; // Admin stats are dynamic
export const revalidate = 30; // Revalidate every 30 seconds

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return handleError(new UnauthorizedError('You must be logged in'));
    }
    if (session.user.role !== "ADMIN") {
      return handleError(new ForbiddenError('Admin access required'));
    }

    const stats = await adminService.getStats();
    // Add caching headers - stats can be cached for 30 seconds
    const response = NextResponse.json(stats);
    response.headers.set('Cache-Control', CACHE_HEADERS.adminStats);
    return response;
  } catch (error) {
    return handleError(error);
  }
}

