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
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn, getInitials, formatChatListTime } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
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
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-sidebar-foreground">
              Synapse
            </span>
          </div>

          {/* Search */}
          <SidebarGroup>
            <SidebarGroupContent className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-muted-foreground pointer-events-none" />
              <SidebarInput
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Filter Button */}
          <SidebarGroup>
            <SidebarGroupContent>
              <Button
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                variant={showUnreadOnly ? "default" : "outline"}
                className="w-full justify-center gap-2"
                size="sm"
              >
                <Filter className="w-4 h-4" />
                {showUnreadOnly ? "Show All" : "Unread Only"}
                {showUnreadOnly && totalUnread > 0 && (
                  <Badge variant="destructive" className="ml-auto">
                    {totalUnread}
                  </Badge>
                )}
              </Button>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* New Chat Button */}
          <SidebarGroup>
            <SidebarGroupContent>
              <Button
                onClick={openCreateRoomModal}
                className="w-full"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarHeader>

        <SidebarContent>
          {isLoading ? (
            <SidebarGroup>
              <SidebarGroupContent>
                <div className="space-y-2">
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
              </SidebarGroupContent>
            </SidebarGroup>
          ) : filteredRooms.length === 0 ? (
            <SidebarGroup>
              <SidebarGroupContent>
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in-50 duration-300">
                  <div className="w-16 h-16 rounded-full bg-sidebar-muted/20 flex items-center justify-center mb-4 animate-in zoom-in-95 duration-500">
                    <Users className="w-8 h-8 text-sidebar-muted-foreground/60" />
                  </div>
                  <h3 className="text-sm font-semibold text-sidebar-foreground mb-1">
                    {showUnreadOnly
                      ? "No unread messages"
                      : searchQuery
                        ? "No conversations found"
                        : "No conversations yet"}
                  </h3>
                  <p className="text-xs text-sidebar-muted-foreground max-w-[200px]">
                    {showUnreadOnly
                      ? "All caught up! Your conversations are up to date."
                      : searchQuery
                        ? "Try adjusting your search terms"
                        : "Start a new conversation to get started"}
                  </p>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : (
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredRooms.map((room) => {
                    const isActive = pathname === `/chat/${room.id}`;
                    const displayName = getRoomDisplayName(room);
                    const isOnline = isRoomOnline(room);

                    return (
                      <SidebarMenuItem key={room.id}>
                        <SidebarMenuButton asChild isActive={isActive} size="lg">
                          <Link href={`/chat/${room.id}`}>
                            <div className="relative flex-shrink-0">
                              <Avatar className={cn(
                                "w-10 h-10",
                                room.isGroup
                                  ? "bg-gradient-to-br from-accent-400 to-pink-500"
                                  : "bg-gradient-to-br from-primary to-accent"
                              )}>
                                <AvatarImage src={room.avatar || undefined} alt={displayName} />
                                <AvatarFallback className={cn(
                                  "text-white font-semibold",
                                  room.isGroup
                                    ? "bg-gradient-to-br from-accent-400 to-pink-500"
                                    : "bg-gradient-to-br from-primary to-accent"
                                )}>
                                  {room.isGroup ? <Hash className="w-5 h-5" /> : getInitials(displayName)}
                                </AvatarFallback>
                              </Avatar>
                              {isOnline && (
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-sidebar-background" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="font-medium truncate">
                                  {displayName}
                                </span>
                                {room.lastMessage && (
                                  <span className="text-xs text-sidebar-muted-foreground flex-shrink-0 ml-2">
                                    {formatChatListTime(room.lastMessage.createdAt)}
                                  </span>
                                )}
                              </div>
                              {room.lastMessage && (
                                <p className={cn(
                                  "text-xs truncate",
                                  room.unreadCount ? "text-sidebar-foreground font-medium" : "text-sidebar-muted-foreground"
                                )}>
                                  {room.lastMessage.senderName}: {room.lastMessage.content}
                                </p>
                              )}
                            </div>
                            {room.unreadCount && room.unreadCount > 0 && (
                              <SidebarMenuBadge>
                                {room.unreadCount > 99 ? "99+" : room.unreadCount}
                              </SidebarMenuBadge>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="relative flex-shrink-0">
                <Avatar className="w-8 h-8 bg-gradient-to-br from-primary to-accent">
                  <AvatarImage src={user.avatar || undefined} alt={user.name} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold text-xs">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-sidebar-background" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-xs text-sidebar-foreground truncate flex items-center gap-1">
                  {user.name}
                  {user.role === "ADMIN" && (
                    <Shield className="w-3 h-3 text-destructive flex-shrink-0" />
                  )}
                </p>
                <p className="text-xs text-green-500">Online</p>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {user.role === "ADMIN" && (
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="Admin Dashboard"
                >
                  <Link href="/admin">
                    <Shield className="w-4 h-4 text-destructive" />
                  </Link>
                </Button>
              )}
              <ThemeToggle className="h-8 w-8" />
              <Button
                onClick={openSettingsModal}
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => signOut({ callbackUrl: "/" })}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-sidebar-muted-foreground hover:text-destructive"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

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
