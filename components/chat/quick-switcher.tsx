"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Hash, User, Clock, TrendingUp } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRoomsStore } from "@/lib/store";
import { useQuickSwitcher } from "@/hooks/use-quick-switcher";

interface QuickSwitcherProps {
  /**
   * Optional: Control open state externally
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * QuickSwitcher - Global search modal (CMD+K / CTRL+K)
 * 
 * Features:
 * - Fuzzy search across channels and DMs
 * - Keyboard navigation (↑ ↓ Enter ESC)
 * - Recent rooms prioritized
 * - Unread count badges
 * - Instant navigation
 * 
 * @example
 * ```tsx
 * // In layout or root component
 * <QuickSwitcher />
 * ```
 */
export function QuickSwitcher({ open: controlledOpen, onOpenChange }: QuickSwitcherProps) {
  const router = useRouter();
  const rooms = useRoomsStore((state) => state.rooms);
  
  // Use global state from hook
  const globalOpen = useQuickSwitcher((state) => state.isOpen);
  const globalSetOpen = useQuickSwitcher((state) => state.close);
  const globalToggle = useQuickSwitcher((state) => state.toggle);

  // Use controlled or global state
  const open = controlledOpen !== undefined ? controlledOpen : globalOpen;
  const setOpen = onOpenChange || ((value: boolean | ((prev: boolean) => boolean)) => {
    if (typeof value === 'function') {
      globalToggle();
    } else if (!value) {
      globalSetOpen();
    } else {
      useQuickSwitcher.getState().open();
    }
  });

  // Listen for CMD+K / CTRL+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((current) => !current);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [setOpen]);

  // Separate channels and DMs
  const channels = useMemo(() => rooms.filter((room) => room.isGroup), [rooms]);
  const dms = useMemo(() => rooms.filter((room) => !room.isGroup), [rooms]);

  // Get recent rooms (rooms with lastMessage, sorted by time)
  const recentRooms = useMemo(() => {
    return rooms
      .filter((room) => room.lastMessage)
      .sort(
        (a, b) =>
          new Date(b.lastMessage!.createdAt).getTime() -
          new Date(a.lastMessage!.createdAt).getTime()
      )
      .slice(0, 5);
  }, [rooms]);

  // Get unread rooms
  const unreadRooms = useMemo(() => {
    return rooms
      .filter((room) => room.unreadCount && room.unreadCount > 0)
      .sort((a, b) => (b.unreadCount || 0) - (a.unreadCount || 0))
      .slice(0, 5);
  }, [rooms]);

  const handleSelect = (roomId: string) => {
    setOpen(false);
    router.push(`/chat/${roomId}`);
  };

  const getRoomDisplayName = (room: typeof rooms[0]) => {
    if (room.isGroup) {
      return room.name;
    }
    // For DMs, find the other participant
    const otherParticipant = room.participants?.find((p) => p.id !== room.name);
    return otherParticipant?.name || room.name;
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search channels, messages, people..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Unread Rooms */}
        {unreadRooms.length > 0 && (
          <>
            <CommandGroup heading="Unread">
              {unreadRooms.map((room) => {
                const displayName = getRoomDisplayName(room);
                return (
                  <CommandItem
                    key={room.id}
                    value={displayName}
                    onSelect={() => handleSelect(room.id)}
                    className="gap-3"
                  >
                    <UserAvatar
                      name={displayName}
                      src={room.avatar}
                      isGroup={room.isGroup}
                      size="sm"
                      className="w-8 h-8"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate">{displayName}</span>
                        {room.unreadCount && room.unreadCount > 0 && (
                          <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-xs">
                            {room.unreadCount > 99 ? "99+" : room.unreadCount}
                          </Badge>
                        )}
                      </div>
                      {room.lastMessage && (
                        <p className="text-xs text-muted-foreground truncate">
                          {room.lastMessage.content}
                        </p>
                      )}
                    </div>
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Recent Rooms */}
        {recentRooms.length > 0 && (
          <>
            <CommandGroup heading="Recent">
              {recentRooms.map((room) => {
                const displayName = getRoomDisplayName(room);
                return (
                  <CommandItem
                    key={room.id}
                    value={displayName}
                    onSelect={() => handleSelect(room.id)}
                    className="gap-3"
                  >
                    <UserAvatar
                      name={displayName}
                      src={room.avatar}
                      isGroup={room.isGroup}
                      size="sm"
                      className="w-8 h-8"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="truncate">{displayName}</span>
                      {room.lastMessage && (
                        <p className="text-xs text-muted-foreground truncate">
                          {room.lastMessage.content}
                        </p>
                      )}
                    </div>
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* All Channels */}
        {channels.length > 0 && (
          <>
            <CommandGroup heading="Channels">
              {channels.map((channel) => (
                <CommandItem
                  key={channel.id}
                  value={channel.name}
                  onSelect={() => handleSelect(channel.id)}
                  className="gap-3"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-accent-400 to-pink-500">
                    <Hash className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{channel.name}</span>
                      {channel.unreadCount && channel.unreadCount > 0 && (
                        <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-xs">
                          {channel.unreadCount > 99 ? "99+" : channel.unreadCount}
                        </Badge>
                      )}
                    </div>
                    {channel.lastMessage && (
                      <p className="text-xs text-muted-foreground truncate">
                        {channel.lastMessage.content}
                      </p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {dms.length > 0 && channels.length > 0 && <CommandSeparator />}

        {/* Direct Messages */}
        {dms.length > 0 && (
          <CommandGroup heading="Direct Messages">
            {dms.map((dm) => {
              const displayName = getRoomDisplayName(dm);
              return (
                <CommandItem
                  key={dm.id}
                  value={displayName}
                  onSelect={() => handleSelect(dm.id)}
                  className="gap-3"
                >
                  <UserAvatar
                    name={displayName}
                    src={dm.avatar}
                    size="sm"
                    className="w-8 h-8"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{displayName}</span>
                      {dm.unreadCount && dm.unreadCount > 0 && (
                        <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-xs">
                          {dm.unreadCount > 99 ? "99+" : dm.unreadCount}
                        </Badge>
                      )}
                    </div>
                    {dm.lastMessage && (
                      <p className="text-xs text-muted-foreground truncate">
                        {dm.lastMessage.content}
                      </p>
                    )}
                  </div>
                  <User className="w-4 h-4 text-muted-foreground" />
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

