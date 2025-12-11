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

  const users = (usersData && typeof usersData === 'object' && 'users' in usersData ? (usersData as { users: OnlineUser[] }).users : []) || [];

  const onlineUsers = users.filter((u: OnlineUser) => onlineUserIdsArray.includes(u.id));

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-10 h-10 bg-muted rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-24" />
              <div className="h-3 bg-muted rounded w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (onlineUsers.length === 0) {
    return (
      <div className="text-center py-8">
        <Circle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No users online</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {onlineUsers.map((user: OnlineUser) => (
        <div
          key={user.id}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold text-sm">
              {getInitials(user.name)}
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">
              {user.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <span className="text-xs text-green-500 font-medium">Online</span>
        </div>
      ))}
    </div>
  );
}

