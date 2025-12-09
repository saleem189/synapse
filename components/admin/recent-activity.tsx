// ================================
// Recent Activity Component
// ================================

"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/use-socket";
import { getInitials, formatMessageTime } from "@/lib/utils";
import { UserPlus, MessageSquare, Hash } from "lucide-react";
import type { MessagePayload } from "@/lib/socket";

interface RecentUser {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: Date;
}

interface Activity {
  id: string;
  type: "message" | "user_joined" | "room_created";
  user: string;
  content: string;
  time: string;
}

interface RecentActivityProps {
  recentUsers: RecentUser[];
}

export function RecentActivity({ recentUsers }: RecentActivityProps) {
  const [activities, setActivities] = useState<Activity[]>([]);

  // Initialize with recent users as activities
  useEffect(() => {
    const userActivities: Activity[] = recentUsers.map((user) => ({
      id: user.id,
      type: "user_joined" as const,
      user: user.name,
      content: "joined ChatFlow",
      time: new Date(user.createdAt).toISOString(),
    }));
    setActivities(userActivities);
  }, [recentUsers]);

  // Listen for real-time activities
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleReceiveMessage = (message: MessagePayload) => {
      const newActivity: Activity = {
        id: `msg_${Date.now()}`,
        type: "message",
        user: message.senderName,
        content: `sent a message: "${message.content.substring(0, 30)}${message.content.length > 30 ? "..." : ""}"`,
        time: new Date().toISOString(),
      };

      setActivities((prev) => [newActivity, ...prev].slice(0, 10));
    };

    socket.on("receive-message", handleReceiveMessage);

    socket.on("user-online", () => {
      // Could fetch user details here
    });

    return () => {
      socket.off("receive-message", handleReceiveMessage);
      socket.off("user-online");
    };
  }, [socket, isConnected]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "message":
        return <MessageSquare className="w-4 h-4" />;
      case "user_joined":
        return <UserPlus className="w-4 h-4" />;
      case "room_created":
        return <Hash className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "message":
        return "bg-blue-500";
      case "user_joined":
        return "bg-green-500";
      case "room_created":
        return "bg-purple-500";
      default:
        return "bg-surface-500";
    }
  };

  return (
    <div className="space-y-4">
      {activities.length === 0 ? (
        <p className="text-center text-surface-500 py-8">No recent activity</p>
      ) : (
        activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
          >
            {/* Icon */}
            <div
              className={`w-8 h-8 rounded-full ${getActivityColor(activity.type)} flex items-center justify-center text-white flex-shrink-0`}
            >
              {getActivityIcon(activity.type)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-surface-900 dark:text-white">
                <span className="font-semibold">{activity.user}</span>{" "}
                <span className="text-surface-500">{activity.content}</span>
              </p>
              <p className="text-xs text-surface-400 mt-1">
                {formatMessageTime(activity.time)}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

