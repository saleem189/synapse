// ================================
// Admin Chat Rooms Management Page
// ================================

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { getService } from "@/lib/di";
import { AdminService } from "@/lib/services/admin.service";

// Lazy load heavy table component for better initial load performance
const RoomsTable = dynamic(
  () => import("@/components/admin/rooms-table").then((mod) => ({ default: mod.RoomsTable })),
  {
    loading: () => (
      <div className="bg-white dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-800 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-surface-200 dark:bg-surface-800 rounded w-1/4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-surface-200 dark:bg-surface-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    ),
  }
);

async function getRooms() {
  // Use AdminService instead of direct Prisma access
  const adminService = await getService<AdminService>('adminService');
  const rooms = await adminService.getAllRooms();
  return rooms;
}

export default async function AdminRoomsPage() {
  const rooms = await getRooms();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
            Chat Rooms Management
          </h1>
          <p className="text-surface-500 dark:text-surface-400">
            Manage all chat rooms and conversations
          </p>
        </div>
        <div className="text-sm text-surface-500">
          Total: <span className="font-bold text-surface-900 dark:text-white">{rooms.length}</span> rooms
        </div>
      </div>

      {/* Rooms Table */}
      <Suspense fallback={
        <div className="bg-white dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-800 p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-surface-200 dark:bg-surface-800 rounded w-1/4"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-surface-200 dark:bg-surface-800 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      }>
        <RoomsTable initialRooms={rooms} />
      </Suspense>
    </div>
  );
}

