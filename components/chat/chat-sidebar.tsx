// ================================
// Chat Sidebar Component
// ================================
// Displays chat rooms list with REAL-TIME updates for ALL rooms

"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  MessageCircle,
  Plus,
  Search,
  LogOut,
  Settings,
  Users,
  Hash,
  Menu,
  X,
  Shield,
  Filter,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, getInitials, formatChatListTime } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { ThemeToggle } from "@/components/ui/theme-toggle";
// Code split modals for better initial load performance
import dynamic from "next/dynamic";

const CreateRoomModal = dynamic(
  () => import("./create-room-modal").then((mod) => ({ default: mod.CreateRoomModal })),
  { ssr: false }
);

const SettingsModal = dynamic(
  () => import("./settings-modal").then((mod) => ({ default: mod.SettingsModal })),
  { ssr: false }
);
import { useSocket } from "@/hooks/use-socket";
import { useQueryApi } from "@/hooks/use-react-query";
import { useOnlineUsers } from "@/hooks";
import { useRoomsStore, useUserStore, useUIStore } from "@/lib/store";
import type { RoomResponse, Participant } from "@/lib/types";
import type { MessagePayload } from "@/lib/socket";
import type { UserStatus } from "@/lib/types/user.types";

interface ChatRoomItem {
  id: string;
  name: string;
  isGroup: boolean;
  lastMessage?: {
    content: string;
    createdAt: string;
    senderName: string;
  };
  participants: {
    id: string;
    name: string;
    avatar?: string | null;
    status?: string;
  }[];
  unreadCount?: number;
}

export function ChatSidebar() {
  // Get user from store (no shallow needed for primitive/null)
  const user = useUserStore((state) => state.user);
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  // Use UI store for modals and sidebar
  // Use individual selectors to prevent unnecessary re-renders
  const isCreateRoomModalOpen = useUIStore((state) => state.isCreateRoomModalOpen);
  const isSettingsModalOpen = useUIStore((state) => state.isSettingsModalOpen);
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
  const openCreateRoomModal = useUIStore((state) => state.openCreateRoomModal);
  const closeCreateRoomModal = useUIStore((state) => state.closeCreateRoomModal);
  const openSettingsModal = useUIStore((state) => state.openSettingsModal);
  const closeSettingsModal = useUIStore((state) => state.closeSettingsModal);
  const openSidebar = useUIStore((state) => state.openSidebar);
  const closeSidebar = useUIStore((state) => state.closeSidebar);

  // Use centralized hooks
  const { socket, isConnected } = useSocket({ emitUserConnect: true });
  const { onlineUserIds } = useOnlineUsers({ autoConnect: false }); // Use existing socket
  // Use React Query for rooms data with automatic caching and refetching
  const { data: roomsData, loading: isLoading, refetch: fetchRooms } = useQueryApi<{ rooms: ChatRoomItem[] }>("/rooms", {
    showErrorToast: false, // Don't show toast on initial load - handle errors silently
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute in background
  });

  // Use rooms store - use individual selectors for better performance
  const rooms = useRoomsStore((state) => state.rooms);
  const setRooms = useRoomsStore((state) => state.setRooms);
  const updateRoomLastMessage = useRoomsStore((state) => state.updateRoomLastMessage);
  const incrementUnreadCount = useRoomsStore((state) => state.incrementUnreadCount);
  const clearUnreadCount = useRoomsStore((state) => state.clearUnreadCount);
  const onlineUsers = onlineUserIds;

  // Use ref for rooms to avoid effect re-running on every change
  const roomsRef = React.useRef(rooms);

  // Update ref when rooms change
  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  // Update rooms store when API data changes
  useEffect(() => {
    if (roomsData && typeof roomsData === 'object' && 'rooms' in roomsData && Array.isArray((roomsData as { rooms: RoomResponse[] }).rooms)) {
      const roomsArray = (roomsData as { rooms: RoomResponse[] }).rooms;
      // Transform RoomResponse to RoomStoreItem format (they're compatible)
      const roomsWithStatus: RoomResponse[] = roomsArray.map(room => ({
        ...room,
        participants: room.participants.map(p => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          email: p.email,
          status: (p.status || 'OFFLINE') as UserStatus,
          role: p.role,
        })),
      }));
      setRooms(roomsWithStatus);
    }
  }, [roomsData, setRooms]);

  // Note: Online users are managed by useOnlineUsers hook, no need to fetch here

  // Listen for messages - UPDATE SIDEBAR IN REAL-TIME
  useEffect(() => {
    if (!socket || !user) return;

    // MAIN: Listen for ALL messages to update sidebar
    const handleReceiveMessage = (message: MessagePayload) => {
      logger.log("📩 SIDEBAR: Received message", { messageId: message.id, roomId: message.roomId });

      // Check if room exists in store (use ref)
      const roomExists = roomsRef.current.some((r) => r.id === message.roomId);

      if (!roomExists) {
        // Room not in list - refetch
        logger.log("🔄 SIDEBAR: New room, refetching...");
        fetchRooms();
        return;
      }

      // Update last message in store
      updateRoomLastMessage(message.roomId, {
        content: message.content,
        createdAt: message.createdAt || new Date().toISOString(),
        senderName: message.senderName,
      });

      // Check if user is currently viewing this room
      const currentRoomId = pathname.split("/chat/")[1];
      const isViewingThisRoom = message.roomId === currentRoomId;
      const isSender = message.senderId === user.id;

      // Only add unread count if:
      // 1. User is NOT viewing this room
      // 2. User is NOT the sender
      if (!isViewingThisRoom && !isSender) {
        incrementUnreadCount(message.roomId);
        logger.log("🔴 SIDEBAR: New unread message");

        if (Notification.permission === "granted") {
          new Notification(message.senderName, {
            body: message.content,
            tag: message.roomId,
          });
        }
      }

      logger.log("✅ SIDEBAR: Updated rooms list");
    };

    socket.on("receive-message", handleReceiveMessage);

    // Request notification permission
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => {
      socket.off("receive-message", handleReceiveMessage);
    };
  }, [socket, pathname, user, updateRoomLastMessage, incrementUnreadCount, fetchRooms]);

  // Clear unread when entering a room
  useEffect(() => {
    const currentRoomId = pathname.split("/chat/")[1];
    if (currentRoomId) {
      clearUnreadCount(currentRoomId);
    }
  }, [pathname, clearUnreadCount]);

  // Early return after ALL hooks are called
  if (!user) {
    return null; // Or show loading state
  }

  // Filter rooms by search and unread status
  const filteredRooms = rooms.filter((room) => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUnread = showUnreadOnly ? (room.unreadCount || 0) > 0 : true;
    return matchesSearch && matchesUnread;
  });

  // Handle room created
  const handleRoomCreated = (newRoom: ChatRoomItem) => {
    const { addRoom } = useRoomsStore.getState();
    // Ensure participants have status field (convert to RoomResponse format)
    const roomWithStatus: RoomResponse = {
      ...newRoom,
      participants: newRoom.participants.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        email: undefined,
        status: (p.status || 'OFFLINE') as UserStatus,
        role: undefined,
      })),
    };
    addRoom(roomWithStatus);
    closeCreateRoomModal();
  };

  // Get display name for room (for DMs show other user's name)
  const getRoomDisplayName = (room: ChatRoomItem) => {
    if (room.isGroup) return room.name;
    const otherUser = room.participants?.find((p: { id: string }) => p.id !== user.id);
    return otherUser?.name || room.name;
  };

  // Check if other user is online
  const isRoomOnline = (room: ChatRoomItem) => {
    if (room.isGroup) {
      return room.participants?.some((p: { id: string }) => p.id !== user.id && onlineUsers.has(p.id)) || false;
    }
    const otherUser = room.participants?.find((p: { id: string }) => p.id !== user.id);
    return otherUser ? onlineUsers.has(otherUser.id) : false;
  };

  // Total unread
  const totalUnread = rooms.reduce((sum, room) => {
    return sum + (room.unreadCount || 0);
  }, 0);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={openSidebar}
        className="fixed top-4 left-4 z-50 lg:hidden w-10 h-10 rounded-xl bg-white dark:bg-surface-800 shadow-lg flex items-center justify-center"
      >
        <Menu className="w-5 h-5 text-surface-600 dark:text-surface-400" />
        {totalUnread > 0 && (
          <Badge variant="destructive" className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center p-0">
            {totalUnread > 9 ? "9+" : totalUnread}
          </Badge>
        )}
      </button>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "w-80 h-full flex flex-col bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800",
          "fixed lg:relative z-50 lg:z-auto transition-transform duration-300",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="p-4">
          <Separator className="mb-4" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-surface-900 dark:text-white">
                ChatFlow
              </span>
            </div>

            <button
              onClick={closeSidebar}
              className="lg:hidden w-8 h-8 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 flex items-center justify-center"
            >
              <X className="w-5 h-5 text-surface-600 dark:text-surface-400" />
            </button>
          </div>

          {/* Search and Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-100 dark:bg-surface-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <button
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                showUnreadOnly
                  ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                  : "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700"
              )}
            >
              <Filter className="w-4 h-4" />
              {showUnreadOnly ? "Show All" : "Unread Only"}
              {showUnreadOnly && totalUnread > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {totalUnread}
                </Badge>
              )}
            </button>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={openCreateRoomModal}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Chat
          </button>
        </div>

        {/* Rooms List */}
        <ScrollArea className="flex-1 px-3 pb-3">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
              <p className="text-sm text-surface-500">
                {showUnreadOnly
                  ? "No unread messages"
                  : searchQuery
                    ? "No conversations found"
                    : "No conversations yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredRooms.map((room) => {
                const isActive = pathname === `/chat/${room.id}`;
                const displayName = getRoomDisplayName(room);
                const isOnline = isRoomOnline(room);

                return (
                  <Link
                    key={room.id}
                    href={`/chat/${room.id}`}
                    onClick={closeSidebar}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
                      isActive
                        ? "bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800"
                        : "hover:bg-surface-100 dark:hover:bg-surface-800"
                    )}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <Avatar className={cn(
                        "w-12 h-12",
                        room.isGroup
                          ? "bg-gradient-to-br from-accent-400 to-pink-500"
                          : "bg-gradient-to-br from-primary-400 to-blue-500"
                      )}>
                        <AvatarImage src={room.avatar || undefined} alt={displayName} />
                        <AvatarFallback className={cn(
                          "text-white font-semibold",
                          room.isGroup
                            ? "bg-gradient-to-br from-accent-400 to-pink-500"
                            : "bg-gradient-to-br from-primary-400 to-blue-500"
                        )}>
                          {room.isGroup ? <Hash className="w-5 h-5" /> : getInitials(displayName)}
                        </AvatarFallback>
                      </Avatar>
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-surface-900" />
                      )}
                    </div>

                    {/* Room Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className={cn(
                          "font-medium truncate",
                          isActive ? "text-primary-700 dark:text-primary-300" : "text-surface-900 dark:text-white"
                        )}>
                          {displayName}
                        </h3>
                        {room.lastMessage && (
                          <span className="text-xs text-surface-400 flex-shrink-0 ml-2">
                            {formatChatListTime(room.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      {room.lastMessage && (
                        <p className={cn(
                          "text-sm truncate",
                          room.unreadCount ? "text-surface-900 dark:text-white font-medium" : "text-surface-500"
                        )}>
                          {room.lastMessage.senderName}: {room.lastMessage.content}
                        </p>
                      )}
                    </div>

                    {/* Unread badge - ONLY show if count > 0 */}
                    {room.unreadCount && room.unreadCount > 0 ? (
                      <Badge variant="destructive" className="min-w-[24px] h-6 px-1.5 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                        {room.unreadCount > 99 ? "99+" : room.unreadCount}
                      </Badge>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* User Profile */}
        <Separator />
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="w-10 h-10 bg-gradient-to-br from-primary-400 to-accent-500">
                  <AvatarImage src={user.avatar || undefined} alt={user.name} />
                  <AvatarFallback className="bg-gradient-to-br from-primary-400 to-accent-500 text-white font-semibold">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-surface-900" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm text-surface-900 dark:text-white truncate flex items-center gap-1">
                  {user.name}
                  {user.role === "ADMIN" && (
                    <Shield className="w-3 h-3 text-red-500" />
                  )}
                </p>
                <p className="text-xs text-green-500">Online</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="w-9 h-9 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-red-500"
                  title="Admin Dashboard"
                >
                  <Shield className="w-5 h-5" />
                </Link>
              )}
              <ThemeToggle className="w-9 h-9" />

              <button
                onClick={openSettingsModal}
                className="w-9 h-9 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 flex items-center justify-center text-surface-500"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-9 h-9 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-surface-500 hover:text-red-500"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
            <Separator className="mt-4" />
          </div>
        </div>
      </aside>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={isCreateRoomModalOpen}
        onClose={closeCreateRoomModal}
        onRoomCreated={handleRoomCreated}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={closeSettingsModal}
      />
    </>
  );
}
