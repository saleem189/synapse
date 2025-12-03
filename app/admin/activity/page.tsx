// ================================
// Admin Live Activity Page
// ================================

"use client";

import { useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";
import {
  Activity,
  MessageSquare,
  UserPlus,
  Hash,
  Users,
  TrendingUp,
  Clock,
} from "lucide-react";
import { RelativeTime } from "@/components/admin/relative-time";
import { useOnlineUsers, useSocket } from "@/hooks";


interface ActivityItem {
  id: string;
  type: "message" | "user_joined" | "user_left" | "room_created" | "user_online" | "user_offline";
  user?: string;
  userId?: string;
  content?: string;
  roomId?: string;
  roomName?: string;
  timestamp: string;
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [messagesPerMinute, setMessagesPerMinute] = useState(0);
  const [activeRooms, setActiveRooms] = useState<Set<string>>(new Set());
  const messageCountRef = useState(0)[0];
  const [messageCount, setMessageCount] = useState(0);
  // Use centralized online users hook
  const { onlineCount } = useOnlineUsers();
  
  // Use centralized socket hook
  const { socket, isConnected } = useSocket({ emitUserConnect: true });

  // Define addActivity before useEffect so it's available
  const addActivity = useCallback((activity: ActivityItem) => {
    setActivities((prev) => {
      // Add new activity at the beginning, keep last 100
      const updated = [activity, ...prev];
      return updated.slice(0, 100);
    });
  }, []);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    // Listen for user online/offline events for activity feed
    const handleUserOnline = (userId: string) => {
      console.log("🟢 Activity Feed: User online", userId);
      addActivity({
        id: `online_${Date.now()}_${Math.random()}`,
        type: "user_online",
        userId,
        timestamp: new Date().toISOString(),
      });
    };

    const handleUserOffline = (userId: string) => {
      console.log("🔴 Activity Feed: User offline", userId);
      addActivity({
        id: `offline_${Date.now()}_${Math.random()}`,
        type: "user_offline",
        userId,
        timestamp: new Date().toISOString(),
      });
    };

    const handleReceiveMessage = (message: any) => {
      console.log("💬 Activity Feed: Message received", message);
      setMessageCount((prev) => prev + 1);
      setActiveRooms((prev) => new Set([...prev, message.roomId]));

      addActivity({
        id: `msg_${Date.now()}_${Math.random()}`,
        type: "message",
        user: message.senderName,
        userId: message.senderId,
        content: message.content,
        roomId: message.roomId,
        timestamp: message.createdAt || new Date().toISOString(),
      });
    };

    socket.on("user-online", handleUserOnline);
    socket.on("user-offline", handleUserOffline);
    socket.on("receive-message", handleReceiveMessage);

    return () => {
      socket.off("user-online", handleUserOnline);
      socket.off("user-offline", handleUserOffline);
      socket.off("receive-message", handleReceiveMessage);
    };
  }, [socket, addActivity]);

  // Calculate messages per minute
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageCount((prev) => {
        setMessagesPerMinute(prev * 20); // Approximate
        return 0; // Reset for next interval
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "message":
        return <MessageSquare className="w-4 h-4" />;
      case "user_joined":
        return <UserPlus className="w-4 h-4" />;
      case "user_online":
        return <TrendingUp className="w-4 h-4" />;
      case "user_offline":
        return <Users className="w-4 h-4" />;
      case "room_created":
        return <Hash className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "message":
        return "bg-blue-500";
      case "user_joined":
      case "user_online":
        return "bg-green-500";
      case "user_offline":
        return "bg-red-500";
      case "room_created":
        return "bg-purple-500";
      default:
        return "bg-surface-500";
    }
  };

  const getActivityText = (activity: ActivityItem) => {
    switch (activity.type) {
      case "message":
        return `${activity.user} sent a message`;
      case "user_online":
        return "User came online";
      case "user_offline":
        return "User went offline";
      case "user_joined":
        return `${activity.user} joined`;
      case "room_created":
        return `Room "${activity.roomName}" created`;
      default:
        return "Activity";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
          Live Activity
        </h1>
        <p className="text-surface-500 dark:text-surface-400">
          Real-time monitoring of all application activity
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-surface-900 rounded-2xl p-5 border border-surface-200 dark:border-surface-800">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span className="flex items-center gap-1 text-xs text-green-500">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-2xl font-bold text-surface-900 dark:text-white">
            {onlineCount}
          </p>
          <p className="text-sm text-surface-500">Online Users</p>
        </div>

        <div className="bg-white dark:bg-surface-900 rounded-2xl p-5 border border-surface-200 dark:border-surface-800">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="flex items-center gap-1 text-xs text-green-500">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-2xl font-bold text-surface-900 dark:text-white">
            {messagesPerMinute}
          </p>
          <p className="text-sm text-surface-500">Messages/Min</p>
        </div>

        <div className="bg-white dark:bg-surface-900 rounded-2xl p-5 border border-surface-200 dark:border-surface-800">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center">
              <Hash className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-surface-900 dark:text-white">
            {activeRooms.size}
          </p>
          <p className="text-sm text-surface-500">Active Rooms</p>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 border border-surface-200 dark:border-surface-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Activity Feed
          </h2>
          <div className="flex items-center gap-2 text-xs">
            {isConnected ? (
              <>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-green-500">Connected</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-red-500">Disconnected</span>
              </>
            )}
          </div>
        </div>

        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {activities.length === 0 ? (
            <div className="text-center py-12 text-surface-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-surface-300" />
              <p className="font-medium mb-2">Waiting for activity...</p>
              {!isConnected ? (
                <div className="text-sm">
                  <p className="text-red-500 mb-1">⚠️ Not connected to socket server</p>
                  <p className="text-xs">Make sure the backend server is running on port 3001</p>
                  <p className="text-xs mt-1">Run: <code className="bg-surface-100 dark:bg-surface-800 px-2 py-1 rounded">npm run server</code></p>
                </div>
              ) : (
                <p className="text-xs">Activity will appear here in real-time</p>
              )}
            </div>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors border border-surface-100 dark:border-surface-800"
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
                    <span className="font-semibold">{getActivityText(activity)}</span>
                    {activity.content && (
                      <span className="text-surface-500 ml-2">
                        "{activity.content.substring(0, 50)}
                        {activity.content.length > 50 ? "..." : ""}"
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-surface-400">
                      <RelativeTime timestamp={activity.timestamp} />
                    </p>
                    {activity.roomId && (
                      <span className="text-xs text-surface-400">• Room: {activity.roomId.substring(0, 8)}...</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

