// ================================
// Chat Room Header Component
// ================================
// Header section of the chat room with room info and actions

"use client";

import { Hash, Phone, Video, Info, Search } from "lucide-react";
import { toast } from "sonner";
import { cn, getInitials } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { RoomMenu } from "./room-menu";

interface ChatRoomHeaderProps {
  roomName: string;
  isGroup: boolean;
  participants: Array<{ id: string; name: string; avatar?: string | null }>;
  roomData?: {
    id: string;
    name: string;
    avatar?: string | null;
  } | null;
  isRoomAdmin: boolean;
  showSearch: boolean;
  showInfo: boolean;
  onToggleSearch: () => void;
  onToggleInfo: () => void;
  onRoomSettings: () => void;
}

export function ChatRoomHeader({
  roomName,
  isGroup,
  participants,
  roomData,
  isRoomAdmin,
  showSearch,
  showInfo,
  onToggleSearch,
  onToggleInfo,
  onRoomSettings,
}: ChatRoomHeaderProps) {
  const onlineParticipants = participants.filter((p) => p.status === "online");

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800">
      <div className="flex items-center gap-3">
        {/* Room Avatar */}
        <Avatar className={cn(
          "w-10 h-10",
          isGroup
            ? "bg-gradient-to-br from-accent-400 to-pink-500"
            : "bg-gradient-to-br from-primary-400 to-blue-500"
        )}>
          <AvatarImage src={roomData?.avatar || undefined} alt={roomName} />
          <AvatarFallback className={cn(
            "text-white font-semibold",
            isGroup
              ? "bg-gradient-to-br from-accent-400 to-pink-500"
              : "bg-gradient-to-br from-primary-400 to-blue-500"
          )}>
            {isGroup ? <Hash className="w-5 h-5" /> : getInitials(roomName)}
          </AvatarFallback>
        </Avatar>

        {/* Room Info */}
        <div>
          <h2 className="font-semibold text-surface-900 dark:text-white">
            {roomName}
          </h2>
          <p className="text-xs text-surface-500 dark:text-surface-400">
            {isGroup
              ? `${participants.length} members`
              : onlineParticipants.length > 0
              ? "Online"
              : "Offline"}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleSearch}
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
            showSearch
              ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
              : "hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
          )}
          title="Search messages"
        >
          <Search className="w-5 h-5" />
        </button>
        <button 
          onClick={() => toast.info("Voice call feature - Coming soon!")}
          className="w-9 h-9 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 flex items-center justify-center text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors"
          title="Voice call"
        >
          <Phone className="w-5 h-5" />
        </button>
        <button 
          onClick={() => toast.info("Video call feature - Coming soon!")}
          className="w-9 h-9 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 flex items-center justify-center text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors"
          title="Video call"
        >
          <Video className="w-5 h-5" />
        </button>
        <button
          onClick={onToggleInfo}
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
            showInfo
              ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
              : "hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
          )}
        >
          <Info className="w-5 h-5" />
        </button>
        <RoomMenu 
          roomId={roomData?.id || ""} 
          isGroup={isGroup}
          isRoomAdmin={isRoomAdmin}
          onViewMembers={onToggleInfo}
          onRoomSettings={onRoomSettings}
        />
      </div>
    </header>
  );
}

