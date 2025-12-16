// ================================
// User Profile Card Component
// ================================
// Slack-style profile popover that appears on hover

"use client";

import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, Phone, Video, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserProfileCardProps {
  user: {
    id: string;
    name: string;
    avatar?: string | null;
    status?: string;
    email?: string;
    role?: string;
    lastSeen?: string;
  };
  onMessageClick?: () => void;
  onCallClick?: () => void;
  onVideoClick?: () => void;
}

export function UserProfileCard({
  user,
  onMessageClick,
  onCallClick,
  onVideoClick,
}: UserProfileCardProps) {
  const isOnline = user.status === "ONLINE";

  return (
    <div className="w-80 bg-popover rounded-lg shadow-xl border border-border overflow-hidden">
      {/* Header with Avatar and Status */}
      <div className="p-4 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="flex items-start gap-3">
          <UserAvatar
            name={user.name}
            src={user.avatar}
            size="xl"
            showOnlineStatus={true}
            isOnline={isOnline}
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-foreground truncate">
              {user.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={isOnline ? "default" : "secondary"}
                className={cn(
                  "text-xs",
                  isOnline && "bg-success text-success-foreground"
                )}
              >
                {isOnline ? "Active" : "Away"}
              </Badge>
              {user.role && (
                <Badge variant="outline" className="text-xs">
                  {user.role}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 space-y-3">
        {user.email && (
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">
              Email
            </p>
            <p className="text-sm text-foreground">{user.email}</p>
          </div>
        )}

        {user.lastSeen && !isOnline && (
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">
              Last seen
            </p>
            <p className="text-sm text-foreground">
              {new Date(user.lastSeen).toLocaleString()}
            </p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="pt-2 flex gap-2">
          {onMessageClick && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={onMessageClick}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Message
            </Button>
          )}
          {onCallClick && (
            <Button
              size="sm"
              variant="outline"
              onClick={onCallClick}
            >
              <Phone className="h-4 w-4" />
            </Button>
          )}
          {onVideoClick && (
            <Button
              size="sm"
              variant="outline"
              onClick={onVideoClick}
            >
              <Video className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

