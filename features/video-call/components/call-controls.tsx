// ================================
// Call Controls Component
// ================================
// Control buttons for video calls

"use client";

import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, PhoneOff, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CallControlsProps {
  isMuted: boolean;
  hasVideo: boolean;
  isScreenSharing: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
  className?: string;
}

export function CallControls({
  isMuted,
  hasVideo,
  isScreenSharing,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onEndCall,
  className,
}: CallControlsProps) {
  return (
    <div className={cn("flex items-center justify-center gap-2 p-4 bg-surface-900/80 backdrop-blur-sm", className)}>
      {/* Mute/Unmute Button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "w-12 h-12 rounded-full",
          isMuted
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-surface-700 hover:bg-surface-600 text-white"
        )}
        onClick={onToggleMute}
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </Button>

      {/* Video Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "w-12 h-12 rounded-full",
          !hasVideo
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-surface-700 hover:bg-surface-600 text-white"
        )}
        onClick={onToggleVideo}
        title={hasVideo ? "Turn off video" : "Turn on video"}
      >
        {hasVideo ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
      </Button>

      {/* Screen Share Button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "w-12 h-12 rounded-full",
          isScreenSharing
            ? "bg-primary-500 hover:bg-primary-600 text-white"
            : "bg-surface-700 hover:bg-surface-600 text-white"
        )}
        onClick={onToggleScreenShare}
        title={isScreenSharing ? "Stop sharing" : "Share screen"}
      >
        {isScreenSharing ? (
          <MonitorOff className="w-5 h-5" />
        ) : (
          <Monitor className="w-5 h-5" />
        )}
      </Button>

      {/* Settings Menu (Optional) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 rounded-full bg-surface-700 hover:bg-surface-600 text-white"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem>Audio Settings</DropdownMenuItem>
          <DropdownMenuItem>Video Settings</DropdownMenuItem>
          <DropdownMenuItem>More Options</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* End Call Button */}
      <Button
        variant="destructive"
        size="icon"
        className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white"
        onClick={onEndCall}
        title="End call"
      >
        <PhoneOff className="w-5 h-5" />
      </Button>
    </div>
  );
}

