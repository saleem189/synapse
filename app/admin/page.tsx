// ================================
// Admin Dashboard Page
// ================================
// Overview with real-time stats and graphs

import { Suspense } from "react";
import dynamic from "next/dynamic";
import prisma from "@/lib/prisma";
import { AdminStats } from "@/components/admin/admin-stats";
import { RecentActivity } from "@/components/admin/recent-activity";
import { OnlineUsers } from "@/components/admin/online-users";

// Code split heavy chart components for better performance
const RealtimeLineChart = dynamic(
  () => import("@/components/admin/realtime-line-chart").then((mod) => ({ default: mod.RealtimeLineChart })),
  { 
    loading: () => <div className="h-64 flex items-center justify-center text-surface-500">Loading chart...</div>,
    ssr: false // Charts don't need SSR
  }
);

const UserActivityLineChart = dynamic(
  () => import("@/components/admin/user-activity-line-chart").then((mod) => ({ default: mod.UserActivityLineChart })),
  { 
    loading: () => <div className="h-64 flex items-center justify-center text-surface-500">Loading chart...</div>,
    ssr: false
  }
);

async function getStats() {
  const [totalUsers, totalRooms, totalMessages, recentUsers] = await Promise.all([
    prisma.user.count(),
    prisma.chatRoom.count(),
    prisma.message.count(),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  // Get messages per day for last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const messagesPerDay = await prisma.message.groupBy({
    by: ["createdAt"],
    where: {
      createdAt: { gte: sevenDaysAgo },
    },
    _count: true,
  });

  return {
    totalUsers,
    totalRooms,
    totalMessages,
    recentUsers,
    messagesPerDay,
  };
}

// ISR: Revalidate every 30 seconds for admin stats
export const revalidate = 30;

export default async function AdminDashboard() {
  const stats = await getStats();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-surface-500 dark:text-surface-400">
          Real-time overview of your chat application
        </p>
      </div>

      {/* Stats Cards */}
      <Suspense fallback={<div>Loading stats...</div>}>
        <AdminStats
          totalUsers={stats.totalUsers}
          totalRooms={stats.totalRooms}
          totalMessages={stats.totalMessages}
        />
      </Suspense>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time Messages Chart */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 border border-surface-200 dark:border-surface-800">
          <RealtimeLineChart title="Messages (Real-time)" unit="msgs/min" color="#3b82f6" />
        </div>

        {/* User Activity Chart */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 border border-surface-200 dark:border-surface-800">
          <UserActivityLineChart />
        </div>
      </div>

      {/* Online Users & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Online Users */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 border border-surface-200 dark:border-surface-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
              Online Users
            </h2>
            <span className="flex items-center gap-1 text-xs text-green-500">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live
            </span>
          </div>
          <OnlineUsers />
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 border border-surface-200 dark:border-surface-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
              Recent Activity
            </h2>
          </div>
          <RecentActivity recentUsers={stats.recentUsers} />
        </div>
      </div>

    </div>
  );
}

