// ================================
// User Avatar Component
// ================================
// Wrapper around shadcn/ui Avatar with app-specific Slack-style patterns
// Provides consistent styling, sizes, and behavior across the application

"use client";

import * as React from "react";
import { Hash } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

// ================================
// Avatar Variants (Slack-style)
// ================================
const avatarVariants = cva(
  "relative inline-block shrink-0",
  {
    variants: {
      size: {
        sm: "w-8 h-8",
        md: "w-10 h-10",
        lg: "w-12 h-12",
        xl: "w-20 h-20",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

const avatarFallbackVariants = cva(
  "font-semibold flex items-center justify-center",
  {
    variants: {
      type: {
        user: "bg-primary/20 text-primary",
        group: "bg-accent/20 text-accent-foreground",
      },
      size: {
        sm: "text-xs",
        md: "text-sm",
        lg: "text-base",
        xl: "text-2xl",
      },
    },
    defaultVariants: {
      type: "user",
      size: "md",
    },
  }
);

const iconSizes = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
  xl: "w-10 h-10",
};

const statusIndicatorSizes = {
  sm: "w-2 h-2",
  md: "w-2.5 h-2.5",
  lg: "w-3 h-3",
  xl: "w-4 h-4",
};

// ================================
// UserAvatar Component
// ================================
export interface UserAvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  /** Avatar image URL */
  src?: string | null;
  /** User or group name (used for alt text and initials) */
  name: string;
  /** Is this a group/channel avatar? */
  isGroup?: boolean;
  /** Show online status indicator */
  showOnlineStatus?: boolean;
  /** Is user online? (only shown if showOnlineStatus is true) */
  isOnline?: boolean;
}

/**
 * UserAvatar - Centralized avatar component built on shadcn/ui Avatar
 * 
 * Features:
 * - Uses shadcn/ui Avatar primitives (Radix UI)
 * - Slack-style solid colors (no gradients)
 * - Group vs User differentiation (accent vs primary colors)
 * - Multiple sizes with class-variance-authority
 * - Optional online status indicator
 * - Automatic initials generation
 * - Accessible and semantic HTML
 * 
 * @example
 * ```tsx
 * // User avatar
 * <UserAvatar name="John Doe" src="/avatar.jpg" size="md" />
 * 
 * // Group avatar
 * <UserAvatar name="Team Chat" isGroup size="lg" />
 * 
 * // With online status
 * <UserAvatar 
 *   name="Jane Smith" 
 *   showOnlineStatus 
 *   isOnline 
 *   size="md" 
 * />
 * ```
 */
export function UserAvatar({
  src,
  name,
  isGroup = false,
  size = "md",
  className,
  showOnlineStatus = false,
  isOnline = false,
  ...props
}: UserAvatarProps) {
  const avatarType = isGroup ? "group" : "user";

  return (
    <div className={cn(avatarVariants({ size }), "relative", className)} {...props}>
      {/* shadcn/ui Avatar */}
      <Avatar
        className={cn(
          "w-full h-full",
          isGroup ? "bg-accent/20" : "bg-primary/20"
        )}
      >
        <AvatarImage src={src || undefined} alt={name} />
        <AvatarFallback
          className={cn(avatarFallbackVariants({ type: avatarType, size }))}
        >
          {isGroup ? (
            <Hash className={iconSizes[size!]} />
          ) : (
            getInitials(name)
          )}
        </AvatarFallback>
      </Avatar>

      {/* Online Status Indicator */}
      {showOnlineStatus && isOnline && (
        <span
          className={cn(
            "absolute bottom-0 right-0 bg-green-500 rounded-full border-2 border-background",
            statusIndicatorSizes[size!]
          )}
          aria-label="Online"
        />
      )}
    </div>
  );
}

// ================================
// Export Avatar Utils
// ================================
// Re-export shadcn Avatar components for direct use when needed
export { Avatar, AvatarImage, AvatarFallback };

