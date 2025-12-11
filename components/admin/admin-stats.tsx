// ================================
// Admin Stats Cards Component
// ================================

"use client";

import { useEffect, useState } from "react";
import { Users, MessageSquare, Hash, TrendingUp } from "lucide-react";
import { useOnlineUsers } from "@/hooks/use-online-users";
import { useSocket } from "@/hooks/use-socket";

interface AdminStatsProps {
  totalUsers: number;
  totalRooms: number;
  totalMessages: number;
}

export function AdminStats({ totalUsers, totalRooms, totalMessages }: AdminStatsProps) {
  // Use centralized online users hook
  const { onlineCount } = useOnlineUsers();
  const [liveMessages, setLiveMessages] = useState(totalMessages);
  
  // Use centralized socket hook
  const { socket } = useSocket({ emitUserConnect: true });

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

  const stats = [
    {
      label: "Total Users",
      value: totalUsers,
      icon: Users,
      color: "from-blue-500 to-cyan-500",
      change: "+12%",
    },
    {
      label: "Online Now",
      value: onlineCount,
      icon: TrendingUp,
      color: "from-green-500 to-emerald-500",
      live: true,
    },
    {
      label: "Chat Rooms",
      value: totalRooms,
      icon: Hash,
      color: "from-purple-500 to-pink-500",
      change: "+5%",
    },
    {
      label: "Total Messages",
      value: liveMessages,
      icon: MessageSquare,
      color: "from-orange-500 to-red-500",
      live: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-card rounded-2xl p-5 border border-border relative overflow-hidden"
        >
          {/* Background gradient */}
          <div
            className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${stat.color} opacity-10 rounded-full -translate-y-1/2 translate-x-1/2`}
          />

          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}
              >
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              {stat.live && (
                <span className="flex items-center gap-1 text-xs text-green-500 font-medium">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Live
                </span>
              )}
              {stat.change && (
                <span className="text-xs text-green-500 font-medium">
                  {stat.change}
                </span>
              )}
            </div>

            <p className="text-2xl font-bold text-foreground">
              {stat.value.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">
              {stat.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

