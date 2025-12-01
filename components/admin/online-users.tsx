// ================================
// Online Users Component
// ================================
// Real-time list of online users

"use client";

import { useEffect, useState } from "react";
import { getInitials } from "@/lib/utils";
import { Circle } from "lucide-react";
import { useOnlineUsers } from "@/hooks/use-online-users";
import { useQueryApi } from "@/hooks/use-react-query";

interface OnlineUser {
  id: string;
  name: string;
  email: string;
  status: string;
}

export function OnlineUsers() {
  // Use centralized online users hook
  const { onlineUserIdsArray } = useOnlineUsers();
  
  // Use React Query to fetch users with automatic caching
  const { data: usersData, loading } = useQueryApi<{ users: OnlineUser[] }>("/admin/users", {
    showErrorToast: false, // Don't show toast on initial load
    staleTime: 10 * 1000, // Consider data fresh for 10 seconds
  });

  const users = usersData?.users || [];

  const onlineUsers = users.filter((u) => onlineUserIdsArray.includes(u.id));

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-10 h-10 bg-surface-200 dark:bg-surface-700 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-surface-200 dark:bg-surface-700 rounded w-24" />
              <div className="h-3 bg-surface-200 dark:bg-surface-700 rounded w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (onlineUsers.length === 0) {
    return (
      <div className="text-center py-8">
        <Circle className="w-12 h-12 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
        <p className="text-surface-500">No users online</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {onlineUsers.map((user) => (
        <div
          key={user.id}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
              {getInitials(user.name)}
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-surface-900 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-surface-900 dark:text-white truncate">
              {user.name}
            </p>
            <p className="text-xs text-surface-500 truncate">{user.email}</p>
          </div>
          <span className="text-xs text-green-500 font-medium">Online</span>
        </div>
      ))}
    </div>
  );
}

