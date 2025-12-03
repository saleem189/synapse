// ================================
// Admin Analytics Page
// ================================

"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  Activity,
} from "lucide-react";
import { useOnlineUsers } from "@/hooks/use-online-users";
import { useSocket } from "@/hooks/use-socket";
import { useQueryApi } from "@/hooks/use-react-query";

// Code split heavy chart component
const MessageActivityChart = dynamic(
  () => import("@/components/admin/message-activity-chart").then((mod) => ({ default: mod.MessageActivityChart })),
  { 
    loading: () => <div className="h-64 flex items-center justify-center text-surface-500">Loading chart...</div>,
    ssr: false
  }
);

interface Stats {
  totalUsers: number;
  totalMessages: number;
  totalRooms: number;
  messagesThisHour: number;
}

export default function AnalyticsPage() {
  const [liveMessages, setLiveMessages] = useState(0);
  
  // Use centralized hooks
  const { onlineCount } = useOnlineUsers();
  const { socket } = useSocket({ emitUserConnect: true });
  
  // Fetch initial stats using React Query
  const { data: statsData } = useQueryApi<Stats>("/admin/stats", {
    showErrorToast: false,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
  });
  
  const stats: Stats = (statsData as unknown as Stats) || {
    totalUsers: 0,
    totalMessages: 0,
    totalRooms: 0,
    messagesThisHour: 0,
  };

  // Real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = () => {
      setLiveMessages((prev) => prev + 1);
    };

    socket.on("receive-message", handleReceiveMessage);

    return () => {
      socket.off("receive-message", handleReceiveMessage);
    };
  }, [socket]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
          Analytics
        </h1>
        <p className="text-surface-500 dark:text-surface-400">
          Real-time application metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          trend="+12%"
          trendUp={true}
          color="blue"
        />
        <StatCard
          title="Online Now"
          value={onlineCount}
          icon={Activity}
          live={true}
          color="green"
        />
        <StatCard
          title="Total Messages"
          value={stats.totalMessages}
          icon={MessageSquare}
          trend="+24%"
          trendUp={true}
          color="purple"
        />
        <StatCard
          title="Messages/Hour"
          value={stats.messagesThisHour + liveMessages}
          icon={TrendingUp}
          live={true}
          color="orange"
        />
      </div>

      {/* Message Activity Chart */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 border border-surface-200 dark:border-surface-800">
        <MessageActivityChart />
      </div>

      {/* Real-time Activity Feed */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 border border-surface-200 dark:border-surface-800">
        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">
          System Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatusItem
            label="Socket Server"
            status="healthy"
            detail="Connected"
          />
          <StatusItem
            label="Database"
            status="healthy"
            detail="PostgreSQL"
          />
          <StatusItem
            label="Active Connections"
            status="info"
            detail={`${onlineCount} sockets`}
          />
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
  live,
  color,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  trend?: string;
  trendUp?: boolean;
  live?: boolean;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "from-blue-500 to-cyan-500",
    green: "from-green-500 to-emerald-500",
    purple: "from-purple-500 to-pink-500",
    orange: "from-orange-500 to-red-500",
  };

  return (
    <div className="bg-white dark:bg-surface-900 rounded-2xl p-5 border border-surface-200 dark:border-surface-800">
      <div className="flex items-center justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        {live && (
          <span className="flex items-center gap-1 text-xs text-green-500">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live
          </span>
        )}
        {trend && (
          <span
            className={`flex items-center gap-1 text-xs ${
              trendUp ? "text-green-500" : "text-red-500"
            }`}
          >
            {trendUp ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-surface-900 dark:text-white">
        {value.toLocaleString()}
      </p>
      <p className="text-sm text-surface-500">{title}</p>
    </div>
  );
}

// Status Item Component
function StatusItem({
  label,
  status,
  detail,
}: {
  label: string;
  status: "healthy" | "warning" | "error" | "info";
  detail: string;
}) {
  const statusColors = {
    healthy: "bg-green-500",
    warning: "bg-yellow-500",
    error: "bg-red-500",
    info: "bg-blue-500",
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-50 dark:bg-surface-800">
      <span className={`w-3 h-3 rounded-full ${statusColors[status]}`} />
      <div>
        <p className="text-sm font-medium text-surface-900 dark:text-white">
          {label}
        </p>
        <p className="text-xs text-surface-500">{detail}</p>
      </div>
    </div>
  );
}

