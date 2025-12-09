// ================================
// Admin Users Management Page
// ================================

import { Suspense } from "react";
import dynamic from "next/dynamic";
import prisma from "@/lib/prisma";

// Lazy load heavy table component for better initial load performance
const UsersTable = dynamic(
  () => import("@/components/admin/users-table").then((mod) => ({ default: mod.UsersTable })),
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

async function getUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      lastSeen: true,
      createdAt: true,
      _count: {
        select: {
          messages: true,
          rooms: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return users;
}

export default async function AdminUsersPage() {
  const users = await getUsers();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
            Users Management
          </h1>
          <p className="text-surface-500 dark:text-surface-400">
            Manage all registered users
          </p>
        </div>
        <div className="text-sm text-surface-500">
          Total: <span className="font-bold text-surface-900 dark:text-white">{users.length}</span> users
        </div>
      </div>

      {/* Users Table */}
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
        <UsersTable initialUsers={users} />
      </Suspense>
    </div>
  );
}

