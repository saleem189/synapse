// ================================
// Room Mute Button Component
// ================================
// Mute/unmute button with duration options

'use client';

import { Bell, BellOff, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMuteChannel, isChannelMuted } from '@/features/mute-channels';
import type { MuteDuration } from '@/features/mute-channels';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface RoomMuteButtonProps {
  roomId: string;
  isMuted: boolean;
  mutedUntil: string | null;
  className?: string;
}

export function RoomMuteButton({
  roomId,
  isMuted,
  mutedUntil,
  className,
}: RoomMuteButtonProps) {
  const { mutate: muteChannel, isPending } = useMuteChannel();

  // Check if currently muted (accounting for expiry)
  const isCurrentlyMuted = isChannelMuted(isMuted, mutedUntil);

  const handleMute = (duration: MuteDuration) => {
    muteChannel({
      roomId,
      isMuted: true,
      duration,
    });
  };

  const handleUnmute = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    muteChannel({
      roomId,
      isMuted: false,
    });
  };

  // If already muted, show unmute button
  if (isCurrentlyMuted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity opacity-100",
          className
        )}
        onClick={handleUnmute}
        disabled={isPending}
        title="Unmute channel"
      >
        <BellOff className="h-4 w-4 text-muted-foreground" />
      </Button>
    );
  }

  // If not muted, show mute dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity",
            className
          )}
          disabled={isPending}
          title="Mute channel"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Mute for...
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleMute('1h');
          }}
        >
          1 hour
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleMute('8h');
          }}
        >
          8 hours
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleMute('24h');
          }}
        >
          24 hours
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleMute('1w');
          }}
        >
          1 week
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleMute('permanent');
          }}
        >
          Until I turn it back on
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

