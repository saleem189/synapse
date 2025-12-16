// ================================
// Chat Room Header Component
// ================================
// Header section of the chat room with room info and actions

"use client";

import { Hash, Phone, Video, Info, Search, Pin, Menu } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RoomMenu } from "./room-menu";
import { useVideoCallContext } from "@/features/video-call";
import { DensityModeToggle } from "@/features/density-mode";

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
  
  const handleVideoCall = async () => {
    if (!roomData?.id) return;
    
    try {
      // Just open the call page - it will handle initiating the call
      const callId = `${roomData.id}-${Date.now()}`;
      window.open(`/call/${callId}?type=video&room=${roomData.id}`, '_blank');
      toast.success('Call window opened');
    } catch (error) {
      toast.error('Failed to start call');
    }
  };
  
  const handleAudioCall = async () => {
    if (!roomData?.id) return;
    
    try {
      const callId = `${roomData.id}-${Date.now()}`;
      window.open(`/call/${callId}?type=audio&room=${roomData.id}`, '_blank');
      toast.success('Call window opened');
    } catch (error) {
      toast.error('Failed to start call');
    }
  };

  return (
    <header className="flex items-center justify-between px-5 py-3 bg-background border-b border-border shadow-sm transition-base">
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button (Placeholder for sidebar toggle) */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-9 w-9"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        {/* Room Avatar */}
        <UserAvatar
          src={roomData?.avatar}
          name={roomName}
          isGroup={isGroup}
          size="md"
        />

        {/* Room Info */}
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-bold text-foreground truncate">
            {roomName}
          </h2>
          <p className="text-[13px] text-muted-foreground truncate">
            {isGroup
              ? `${participants.length} members`
              : onlineParticipants.length > 0
                ? "Online"
                : "Offline"}
            {isGroup && onlineParticipants.length > 0 && (
              <span className="ml-2 text-success font-medium">{onlineParticipants.length} online</span>
            )}
          </p>
        </div>
      </div>

      {/* Actions */}
      <TooltipProvider>
        <div className="flex items-center gap-1.5">
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
          {/* Density Mode Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <DensityModeToggle />
              </div>
            </TooltipTrigger>
            <TooltipContent>View density</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </header>
  );
}
