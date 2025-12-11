// ================================
// Room Menu Component
// ================================

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Users, Bell, BellOff, Trash2, Archive, Settings } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RoomMenuProps {
  roomId: string;
  isGroup: boolean;
  isRoomAdmin?: boolean;
  onLeaveRoom?: () => void;
  onDeleteRoom?: () => void;
  onViewMembers?: () => void;
  onRoomSettings?: () => void;
}

export function RoomMenu({ roomId, isGroup, isRoomAdmin, onLeaveRoom, onDeleteRoom, onViewMembers, onRoomSettings }: RoomMenuProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const router = useRouter();

  // Load mute and archive status from localStorage
  useEffect(() => {
    const mutedRooms = JSON.parse(localStorage.getItem("mutedRooms") || "[]");
    const archivedRooms = JSON.parse(localStorage.getItem("archivedRooms") || "[]");
    setIsMuted(mutedRooms.includes(roomId));
    setIsArchived(archivedRooms.includes(roomId));
  }, [roomId]);


  // Toggle mute notifications
  const handleToggleMute = () => {
    const mutedRooms = JSON.parse(localStorage.getItem("mutedRooms") || "[]");
    const newMuted = !isMuted;
    
    if (newMuted) {
      mutedRooms.push(roomId);
    } else {
      const index = mutedRooms.indexOf(roomId);
      if (index > -1) mutedRooms.splice(index, 1);
    }
    
    localStorage.setItem("mutedRooms", JSON.stringify(mutedRooms));
    setIsMuted(newMuted);
  };

  // Toggle archive
  const handleToggleArchive = () => {
    const archivedRooms = JSON.parse(localStorage.getItem("archivedRooms") || "[]");
    const newArchived = !isArchived;
    
    if (newArchived) {
      archivedRooms.push(roomId);
    } else {
      const index = archivedRooms.indexOf(roomId);
      if (index > -1) archivedRooms.splice(index, 1);
    }
    
    localStorage.setItem("archivedRooms", JSON.stringify(archivedRooms));
    setIsArchived(newArchived);
    
    // Refresh page to update sidebar
    router.refresh();
  };

  // Leave or delete room
  const handleLeaveOrDeleteClick = () => {
    setLeaveDialogOpen(true);
  };

  const handleLeaveOrDelete = async () => {
    try {
      if (isGroup) {
        // Leave group - remove user from participants
        await apiClient.post(`/rooms/${roomId}/leave`, {});
        
        if (onLeaveRoom) {
          onLeaveRoom();
        } else {
          router.push("/chat");
        }
      } else {
        // For DMs, we can't really "delete" the room, but we can navigate away
        if (onDeleteRoom) {
          onDeleteRoom();
        } else {
          router.push("/chat");
        }
      }
      setLeaveDialogOpen(false);
    } catch (error) {
      logger.error("Error leaving/deleting room", error instanceof Error ? error : new Error(String(error)), {
        component: 'RoomMenu',
        roomId,
        isGroup,
      });
      toast.error("An error occurred. Please try again.");
    }
  };

  const menuItems = [
    {
      icon: Users,
      label: "View Members",
      onClick: () => {
        if (onViewMembers) {
          onViewMembers();
        } else {
          // Fallback: show info panel if available
          toast.info("View members - Use the info button (i) to see participants");
        }
      },
    },
    {
      icon: isMuted ? BellOff : Bell,
      label: isMuted ? "Unmute Notifications" : "Mute Notifications",
      onClick: handleToggleMute,
    },
    {
      icon: Archive,
      label: isArchived ? "Unarchive Chat" : "Archive Chat",
      onClick: handleToggleArchive,
    },
    ...(isGroup && isRoomAdmin
      ? [
          {
            icon: Settings,
            label: "Room Settings",
            onClick: () => {
              if (onRoomSettings) {
                onRoomSettings();
              } else {
                toast.info("Room settings - Use the info panel to manage room settings");
              }
            },
          },
        ]
      : []),
    {
      icon: Trash2,
      label: isGroup ? "Leave Group" : "Delete Chat",
      onClick: handleLeaveOrDeleteClick,
      className: "text-red-600 dark:text-red-400",
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-9 h-9 rounded-lg"
          title="More options"
        >
          <MoreVertical className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {menuItems.map((item, index) => {
          const isLast = index === menuItems.length - 1;
          const isDestructive = item.className?.includes("red");
          
          return (
            <div key={index}>
              <DropdownMenuItem
                onClick={item.onClick}
                className={cn(
                  "flex items-center gap-3 cursor-pointer",
                  isDestructive && "text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                )}
              >
                <item.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </DropdownMenuItem>
              {isLast && index > 0 && <DropdownMenuSeparator />}
            </div>
          );
        })}
      </DropdownMenuContent>
      <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isGroup ? "Leave Group" : "Delete Chat"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isGroup
                ? "Are you sure you want to leave this group? You won't receive messages anymore."
                : "Are you sure you want to delete this chat? All messages will be lost. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveOrDelete}
              className={isGroup ? "" : "bg-red-600 hover:bg-red-700 focus:ring-red-600"}
            >
              {isGroup ? "Leave" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DropdownMenu>
  );
}

