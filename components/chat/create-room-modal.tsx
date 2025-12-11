// ================================
// Create Room Modal Component
// ================================
// Modal for starting new chats - DM or Group

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, Search, Check, Loader2, MessageCircle, Users } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { cn, getInitials } from "@/lib/utils";
import { logger } from "@/lib/logger";
import type { RoomResponse } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
}

import { useUserStore } from "@/lib/store";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomCreated: (room: RoomResponse) => void;
}

export function CreateRoomModal({
  isOpen,
  onClose,
  onRoomCreated,
}: CreateRoomModalProps) {
  // Get current user from store
  const currentUser = useUserStore((state) => state.user);
  const router = useRouter();
  const [mode, setMode] = useState<"select" | "group-details">("select");
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [groupName, setGroupName] = useState("");

  // Fetch users - moved before conditional return to fix React hooks violation
  // useEffect(() => {
  //   const currentUserId = currentUser?.id;
  //   if (isOpen && currentUserId) {
  //     fetchUsers();
  //   } else if (!isOpen) {
  //     // Reset on close
  //     setMode("select");
  //     setSearchQuery("");
  //     setSelectedUsers([]);
  //     setGroupName("");
  //   }
  // }, [isOpen, currentUser?.id]);

  const fetchUsers = useCallback(async () => {
    const currentUserId = currentUser?.id;
    if (!currentUserId) return;

    setIsLoading(true);
    try {
      const data = await apiClient.get<{ users: User[] }>("/users", {
        showErrorToast: false, // Don't show toast on initial load
      });
      setUsers(data.users.filter((u: User) => u.id !== currentUserId));
    } catch (error) {
      logger.error("Failed to fetch users", error instanceof Error ? error : new Error(String(error)), {
        component: 'CreateRoomModal',
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    const currentUserId = currentUser?.id;
    if (isOpen && currentUserId) {
      fetchUsers();
    } else if (!isOpen) {
      setMode(prev => prev !== "select" ? "select" : prev);
      setSearchQuery(prev => prev !== "" ? "" : prev);
      setSelectedUsers(prev => prev.length ? [] : prev);
      setGroupName(prev => prev !== "" ? "" : prev);
    }
  }, [isOpen, currentUser?.id, fetchUsers]);
  

  // Early return after all hooks are called
  const currentUserId = currentUser?.id;
  if (!currentUserId) {
    return null; // Or show loading state
  }



  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Start DM immediately when clicking a user
  const startDirectChat = async (user: User) => {
    setIsCreating(true);
    try {
      const data = await apiClient.post<{ room: RoomResponse }>("/rooms", {
        isGroup: false,
        participantIds: [user.id],
      });

      const room = data.room || data;
      if (room && room.id) {
        onRoomCreated(room);
        onClose();
        router.push(`/chat/${room.id}`);
      } else {
        logger.error("Invalid room data", new Error("Room data missing required fields"), {
          component: 'CreateRoomModal',
          action: 'startDirectChat',
          data,
        });
        toast.error("Failed to create chat room");
      }
    } catch (error) {
      logger.error("Failed to start chat", error instanceof Error ? error : new Error(String(error)), {
        component: 'CreateRoomModal',
        action: 'startDirectChat',
        userId: user.id,
      });
      // Error toast is handled by API client
    } finally {
      setIsCreating(false);
    }
  };

  // Toggle user selection for group
  const toggleUserForGroup = (user: User) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  // Create group chat
  const createGroupChat = async () => {
    if (selectedUsers.length < 2 || groupName.trim().length < 2) return;

    setIsCreating(true);
    try {
      const data = await apiClient.post<{ room: RoomResponse }>("/rooms", {
        name: groupName.trim(),
        isGroup: true,
        participantIds: selectedUsers.map((u) => u.id),
      });

      const room = data.room || data;
      if (room && room.id) {
        onRoomCreated(room);
        onClose();
        router.push(`/chat/${room.id}`);
      } else {
        logger.error("Invalid room data", new Error("Room data missing required fields"), {
          component: 'CreateRoomModal',
          action: 'createGroupChat',
          data,
        });
        toast.error("Failed to create group");
      }
    } catch (error) {
      logger.error("Failed to create group", error instanceof Error ? error : new Error(String(error)), {
        component: 'CreateRoomModal',
        action: 'createGroupChat',
        participantCount: selectedUsers.length,
      });
      // Error toast is handled by API client
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-2 border-b border-border">
          <DialogTitle>
            {mode === "select" ? "New Chat" : "Create Group"}
          </DialogTitle>
          <DialogDescription>
            {mode === "select" 
              ? "Start a new conversation or create a group chat."
              : "Create a group chat with multiple participants."}
          </DialogDescription>
        </DialogHeader>

        {mode === "select" && (
          <>
            {/* Search */}
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10"
                />
              </div>
              <Separator className="mt-4" />
            </div>

            {/* Group option */}
            {selectedUsers.length >= 2 && (
              <div className="px-4 pt-4">
                <Button
                  onClick={() => setMode("group-details")}
                  variant="outline"
                  className="w-full justify-start gap-3 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                >
                  <Users className="w-5 h-5" />
                  <span className="font-medium">Create Group with {selectedUsers.length} people</span>
                </Button>
              </div>
            )}

            {/* Selected users for group */}
            {selectedUsers.length > 0 && (
              <div className="px-4 pt-3 flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <span
                    key={user.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-secondary-foreground text-xs"
                  >
                    {user.name}
                    <Button
                      onClick={() => toggleUserForGroup(user)}
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </span>
                ))}
              </div>
            )}

            {/* User list */}
            <ScrollArea className="p-4 max-h-80">
              <p className="text-xs text-muted-foreground mb-3">
                Click to start chat • Right-click or long press to select for group
              </p>
              
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No users found</p>
              ) : (
                <div className="space-y-1">
                  {filteredUsers.map((user) => {
                    const isSelected = selectedUsers.some((u) => u.id === user.id);
                    return (
                      <div
                        key={user.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                          isSelected
                            ? "bg-primary/10"
                            : "hover:bg-accent hover:text-accent-foreground"
                        )}
                        onClick={() => {
                          if (isCreating) return;
                          startDirectChat(user);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          toggleUserForGroup(user);
                        }}
                        onTouchStart={(e) => {
                          const timerRef = { current: null as NodeJS.Timeout | null };
                          const target = e.currentTarget;
                          
                          timerRef.current = setTimeout(() => {
                            toggleUserForGroup(user);
                            // Haptic feedback (if available)
                            if (navigator.vibrate) {
                              navigator.vibrate(50);
                            }
                          }, 500); // 500ms long press
                          
                          const handleTouchEnd = () => {
                            if (timerRef.current) {
                              clearTimeout(timerRef.current);
                            }
                            target.removeEventListener('touchend', handleTouchEnd);
                            target.removeEventListener('touchmove', handleTouchMove);
                          };
                          
                          const handleTouchMove = () => {
                            if (timerRef.current) {
                              clearTimeout(timerRef.current);
                            }
                            target.removeEventListener('touchend', handleTouchEnd);
                            target.removeEventListener('touchmove', handleTouchMove);
                          };
                          
                          target.addEventListener('touchend', handleTouchEnd, { once: true });
                          target.addEventListener('touchmove', handleTouchMove, { once: true });
                        }}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold">
                          {getInitials(user.name)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">
                            {user.name}
                          </p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        {isSelected ? (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </div>
                        ) : (
                          <MessageCircle className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {isCreating && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            )}
          </>
        )}

        {mode === "group-details" && (
          <div className="p-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="group-name">Group Name</Label>
                <Input
                  id="group-name"
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name..."
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Members ({selectedUsers.length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <span
                      key={user.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm"
                    >
                      {user.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setMode("select")}
                variant="secondary"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={createGroupChat}
                disabled={groupName.trim().length < 2 || isCreating}
                variant="default"
                className="flex-1"
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
