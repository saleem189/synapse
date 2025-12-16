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
  Shield,
  Filter,
  Star,
  BellOff,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn, getInitials, formatChatListTime } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { logger } from "@/lib/logger";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { RoomFavoriteButton } from "./room-favorite-button";
import { RoomMuteButton } from "./room-mute-button";
import { FocusModeToggle } from "./focus-mode-toggle";
import { isChannelMuted } from "@/features/mute-channels";
import { useFocusMode, filterRoomsForFocusMode, getHiddenRoomsCount } from "@/features/focus-mode";
import { useQuickSwitcher } from "@/hooks/use-quick-switcher";
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
  isFavorite?: boolean; // Added for favorites
  isMuted?: boolean; // Added for muting
  mutedUntil?: string | null; // Added for temporary muting
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
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  // Use UI store for modals
  // Use individual selectors to prevent unnecessary re-renders
  const isCreateRoomModalOpen = useUIStore((state) => state.isCreateRoomModalOpen);
  const isSettingsModalOpen = useUIStore((state) => state.isSettingsModalOpen);
  const openCreateRoomModal = useUIStore((state) => state.openCreateRoomModal);
  const closeCreateRoomModal = useUIStore((state) => state.closeCreateRoomModal);
  const openSettingsModal = useUIStore((state) => state.openSettingsModal);
  const closeSettingsModal = useUIStore((state) => state.closeSettingsModal);

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

  // Focus mode state (MUST be before early return - React Rules of Hooks)
  const { isEnabled: isFocusModeEnabled } = useFocusMode();
  
  // Quick switcher hook
  const openQuickSwitcher = useQuickSwitcher((state) => state.open);

  // Early return after ALL hooks are called
  if (!user) {
    return null; // Or show loading state
  }

  // Filter rooms by unread status only (search is now handled by Quick Switcher)
  let filteredRooms = rooms.filter((room) => {
    const matchesUnread = showUnreadOnly ? (room.unreadCount || 0) > 0 : true;
    return matchesUnread;
  });

  // Apply focus mode filter if enabled
  const allFilteredRooms = filteredRooms; // Keep reference to all filtered rooms
  if (isFocusModeEnabled) {
    filteredRooms = filterRoomsForFocusMode(filteredRooms);
  }

  // Calculate hidden count for focus mode
  const hiddenRoomsCount = getHiddenRoomsCount(allFilteredRooms, filteredRooms);

  // Separate favorites from other rooms
  const favoriteRooms = filteredRooms.filter((room) => room.isFavorite);
  const otherRooms = filteredRooms.filter((room) => !room.isFavorite);

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
      {/* Slack-style Sidebar with Aubergine Background */}
      <div className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">
        {/* Header */}
        <div className="flex flex-col gap-3 p-4 border-b border-sidebar-border/50">
          {/* Logo & Title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm">
                <MessageCircle className="w-5 h-5 text-sidebar" />
              </div>
              <span className="text-lg font-bold text-sidebar-foreground">
                Synapse
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-1.5">
            {/* Quick Switcher Button - Slack-style */}
            <button
              onClick={openQuickSwitcher}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-sidebar-foreground/90 bg-sidebar-accent/50 hover:bg-sidebar-accent transition-base"
            >
              <Search className="w-4 h-4 text-sidebar-foreground/70" />
              <span className="flex-1 text-left text-sidebar-foreground/80">Jump to...</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border border-sidebar-border/30 bg-sidebar/40 px-1.5 font-mono text-[10px] font-medium text-sidebar-foreground/60">
                <span>⌘</span>K
              </kbd>
            </button>
            
            {/* Filter Button */}
            <button
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm transition-base",
                showUnreadOnly
                  ? "bg-sidebar-active text-white font-medium"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent"
              )}
            >
              <Filter className="w-4 h-4" />
              {showUnreadOnly ? "Show All" : "Unread Only"}
              {showUnreadOnly && totalUnread > 0 && (
                <span className="ml-auto px-1.5 py-0.5 text-xs font-bold bg-badge text-badge-text rounded">
                  {totalUnread}
                </span>
              )}
            </button>
            
            {/* Focus Mode Toggle */}
            <FocusModeToggle hiddenCount={hiddenRoomsCount} />
          </div>

          {/* New Chat Button - Slack Primary Color */}
          <button
            onClick={openCreateRoomModal}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-sm font-semibold text-white bg-sidebar-primary hover:bg-sidebar-primary/90 transition-base shadow-sm press-effect"
          >
            <Plus className="w-4 h-4" />
            New Message
          </button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 px-2">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2 animate-in fade-in-50 slide-in-from-left-4"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in-50 duration-300">
              <div className="w-16 h-16 rounded-full bg-sidebar-muted/20 flex items-center justify-center mb-4 animate-in zoom-in-95 duration-500">
                <Users className="w-8 h-8 text-sidebar-muted-foreground/60" />
              </div>
              <h3 className="text-sm font-semibold text-sidebar-foreground mb-1">
                {showUnreadOnly
                  ? "No unread messages"
                  : "No conversations yet"}
              </h3>
              <p className="text-xs text-sidebar-muted-foreground max-w-[200px]">
                {showUnreadOnly
                  ? "All caught up! Your conversations are up to date."
                  : "Start a new conversation to get started"}
              </p>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {/* Favorite Rooms */}
              {favoriteRooms.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[11px] font-bold text-sidebar-muted uppercase tracking-wider flex items-center gap-1.5">
                    <Star className="w-3 h-3 fill-sidebar-primary text-sidebar-primary" />
                    Starred
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {favoriteRooms.map((room) => {
                      const isActive = pathname === `/chat/${room.id}`;
                      const displayName = getRoomDisplayName(room);
                      const isOnline = isRoomOnline(room);
                      const isMutedNow = isChannelMuted(room.isMuted || false, room.mutedUntil || null);

                      return (
                        <div key={room.id} className="group relative">
                          <Link
                            href={`/chat/${room.id}`}
                            className={cn(
                              "flex items-center gap-2.5 px-2 py-1 mx-1 rounded transition-base",
                              "hover:bg-sidebar-accent",
                              isActive && "bg-sidebar-active",
                              isMutedNow && "opacity-50"
                            )}
                          >
                            <UserAvatar
                              name={displayName}
                              src={room.avatar}
                              isGroup={room.isGroup}
                              size="sm"
                              showOnlineStatus={!room.isGroup}
                              isOnline={isOnline}
                              className="w-6 h-6"
                            />
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              {/* Channel/DM name with unread indicator */}
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                {/* Unread dot indicator (white circle) */}
                                {room.unreadCount && room.unreadCount > 0 && !isMutedNow && (
                                  <div className="w-2 h-2 rounded-full bg-white flex-shrink-0" />
                                )}
                                <span className={cn(
                                  "truncate transition-all text-[15px]",
                                  room.unreadCount && room.unreadCount > 0 && !isMutedNow
                                    ? "font-bold text-white"
                                    : "font-normal text-sidebar-muted"
                                )}>
                                  {room.isGroup && "#"}{displayName}
                                </span>
                                {isMutedNow && (
                                  <BellOff className="w-3 h-3 text-sidebar-muted/50 flex-shrink-0" />
                                )}
                              </div>
                              {/* Unread badge (only for > 0) */}
                              {room.unreadCount && room.unreadCount > 0 && !isMutedNow && (
                                <span className="flex-shrink-0 px-1.5 min-w-[20px] h-5 flex items-center justify-center text-[11px] font-bold bg-badge text-badge-text rounded">
                                  {room.unreadCount > 99 ? "99+" : room.unreadCount}
                                </span>
                              )}
                            </div>
                          </Link>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1">
                            <RoomMuteButton
                              roomId={room.id}
                              isMuted={room.isMuted || false}
                              mutedUntil={room.mutedUntil || null}
                            />
                            <RoomFavoriteButton
                              roomId={room.id}
                              isFavorite={room.isFavorite || false}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* All Conversations */}
              <div>
                {favoriteRooms.length > 0 && (
                  <div className="px-3 py-1.5 mt-3 text-[11px] font-bold text-sidebar-muted uppercase tracking-wider">
                    Channels
                  </div>
                )}
                <div className="space-y-0.5 mt-1">
                  {otherRooms.map((room) => {
                    const isActive = pathname === `/chat/${room.id}`;
                    const displayName = getRoomDisplayName(room);
                    const isOnline = isRoomOnline(room);
                    const isMutedNow = isChannelMuted(room.isMuted || false, room.mutedUntil || null);

                    return (
                      <div key={room.id} className="group relative">
                        <Link
                          href={`/chat/${room.id}`}
                          className={cn(
                            "flex items-center gap-2.5 px-2 py-1 mx-1 rounded transition-base",
                            "hover:bg-sidebar-accent",
                            isActive && "bg-sidebar-active",
                            isMutedNow && "opacity-50"
                          )}
                        >
                          <UserAvatar
                            name={displayName}
                            src={room.avatar}
                            isGroup={room.isGroup}
                            size="sm"
                            showOnlineStatus={!room.isGroup}
                            isOnline={isOnline}
                            className="w-6 h-6"
                          />
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            {/* Channel/DM name with unread indicator */}
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              {/* Unread dot indicator (white circle) */}
                              {room.unreadCount && room.unreadCount > 0 && !isMutedNow && (
                                <div className="w-2 h-2 rounded-full bg-white flex-shrink-0" />
                              )}
                              <span className={cn(
                                "truncate transition-all text-[15px]",
                                room.unreadCount && room.unreadCount > 0 && !isMutedNow
                                  ? "font-bold text-white"
                                  : "font-normal text-sidebar-muted"
                              )}>
                                {room.isGroup && "#"}{displayName}
                              </span>
                              {isMutedNow && (
                                <BellOff className="w-3 h-3 text-sidebar-muted/50 flex-shrink-0" />
                              )}
                            </div>
                            {/* Unread badge (only for > 0) */}
                            {room.unreadCount && room.unreadCount > 0 && !isMutedNow && (
                              <span className="flex-shrink-0 px-1.5 min-w-[20px] h-5 flex items-center justify-center text-[11px] font-bold bg-badge text-badge-text rounded">
                                {room.unreadCount > 99 ? "99+" : room.unreadCount}
                              </span>
                            )}
                          </div>
                        </Link>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1">
                          <RoomMuteButton
                            roomId={room.id}
                            isMuted={room.isMuted || false}
                            mutedUntil={room.mutedUntil || null}
                          />
                          <RoomFavoriteButton
                            roomId={room.id}
                            isFavorite={room.isFavorite || false}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer - User Profile */}
        <div className="border-t border-sidebar-border/50 p-2">
          <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-sidebar-accent rounded transition-base cursor-pointer">
            <UserAvatar
              name={user.name}
              src={user.avatar}
              size="md"
              showOnlineStatus
              isOnline
              className="w-9 h-9"
            />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-[15px] text-sidebar-foreground truncate flex items-center gap-1">
                {user.name}
                {user.role === "ADMIN" && (
                  <Shield className="w-3 h-3 text-badge flex-shrink-0" />
                )}
              </p>
              <p className="text-[13px] text-sidebar-muted">Active</p>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="p-1.5 rounded hover:bg-white/10 transition-base"
                  title="Admin Dashboard"
                >
                  <Shield className="w-4 h-4 text-badge" />
                </Link>
              )}
              <ThemeToggle className="p-1.5" />
              <button
                onClick={openSettingsModal}
                className="p-1.5 rounded hover:bg-white/10 transition-base text-sidebar-foreground/70 hover:text-sidebar-foreground"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="p-1.5 rounded hover:bg-white/10 transition-base text-sidebar-foreground/70 hover:text-badge"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

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
