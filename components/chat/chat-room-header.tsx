// ================================
// Chat Room Header Component
// ================================
// Header section of the chat room with room info and actions

"use client";

import { Hash, Phone, Video, Info, Search, Pin } from "lucide-react";
import { toast } from "sonner";
import { cn, getInitials } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { RoomMenu } from "./room-menu";
import { useVideoCallContext } from "@/features/video-call";

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
  showPinnedMessages?: boolean;
  pinnedMessagesCount?: number;
  onToggleSearch: () => void;
  onToggleInfo: () => void;
  onTogglePinnedMessages?: () => void;
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
  showPinnedMessages = false,
  pinnedMessagesCount = 0,
  onToggleSearch,
  onToggleInfo,
  onTogglePinnedMessages,
  onRoomSettings,
}: ChatRoomHeaderProps) {
  const onlineParticipants = participants.filter((p) => ('status' in p && p.status === "online") || false);
  const { initiateCall, activeCall } = useVideoCallContext();
  
  const handleVideoCall = () => {
    if (!roomData?.id) return;
    const targetUserId = !isGroup && participants.length === 2 
      ? participants.find(p => p.id !== participants[0]?.id)?.id 
      : undefined;
    initiateCall(roomData.id, 'video', targetUserId);
  };
  
  const handleAudioCall = () => {
    if (!roomData?.id) return;
    const targetUserId = !isGroup && participants.length === 2 
      ? participants.find(p => p.id !== participants[0]?.id)?.id 
      : undefined;
    initiateCall(roomData.id, 'audio', targetUserId);
  };

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-background border-b border-border">
      <div className="flex items-center gap-3">
        {/* Sidebar Trigger for Mobile */}
        <SidebarTrigger className="lg:hidden" />
        
        {/* Room Avatar */}
        <Avatar className={cn(
          "w-10 h-10",
          isGroup
            ? "bg-gradient-to-br from-accent-400 to-pink-500"
            : "bg-gradient-to-br from-primary to-accent"
        )}>
          <AvatarImage src={roomData?.avatar || undefined} alt={roomName} />
          <AvatarFallback className={cn(
            "text-white font-semibold",
            isGroup
              ? "bg-gradient-to-br from-accent-400 to-pink-500"
              : "bg-gradient-to-br from-primary to-accent"
          )}>
            {isGroup ? <Hash className="w-5 h-5" /> : getInitials(roomName)}
          </AvatarFallback>
        </Avatar>

        {/* Room Info */}
        <div>
          <h2 className="font-semibold text-foreground">
            {roomName}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isGroup
              ? `${participants.length} members`
              : onlineParticipants.length > 0
                ? "Online"
                : "Offline"}
          </p>
        </div>
      </div>

      {/* Actions */}
      <TooltipProvider>
        <div className="flex items-center gap-1">
          {/* Pinned Messages Toggle */}
          {onTogglePinnedMessages && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onTogglePinnedMessages}
                  variant={showPinnedMessages ? "default" : "ghost"}
                  size="icon"
                  className={cn(
                    "w-9 h-9 relative",
                    showPinnedMessages ? "bg-primary/10 text-primary" : ""
                  )}
                >
                  <Pin className="w-5 h-5" />
                  {pinnedMessagesCount > 0 && (
                    <Badge variant="default" className="absolute -top-1 -right-1 w-5 h-5 rounded-full p-0 flex items-center justify-center text-xs font-medium">
                      {pinnedMessagesCount > 9 ? "9+" : pinnedMessagesCount}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Pinned messages</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onToggleSearch}
                variant={showSearch ? "default" : "ghost"}
                size="icon"
                className={cn(
                  "w-9 h-9",
                  showSearch ? "bg-primary/10 text-primary" : ""
                )}
              >
                <Search className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Search messages</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleAudioCall}
                disabled={!!activeCall}
                variant="ghost"
                size="icon"
                className="w-9 h-9"
              >
                <Phone className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Voice call</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleVideoCall}
                disabled={!!activeCall}
                variant="ghost"
                size="icon"
                className="w-9 h-9"
              >
                <Video className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Video call</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onToggleInfo}
                variant={showInfo ? "default" : "ghost"}
                size="icon"
                className={cn(
                  "w-9 h-9",
                  showInfo ? "bg-primary/10 text-primary" : ""
                )}
              >
                <Info className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Room info</TooltipContent>
          </Tooltip>
          <RoomMenu
            roomId={roomData?.id || ""}
            isGroup={isGroup}
            isRoomAdmin={isRoomAdmin}
            onViewMembers={onToggleInfo}
            onRoomSettings={onRoomSettings}
          />
        </div>
      </TooltipProvider>
    </header>
  );
}
