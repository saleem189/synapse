// ================================
// Relative Time Component
// ================================
// Displays relative timestamps for admin views
// Now uses centralized TimeDisplay component

"use client";

import { TimeDisplay } from "@/components/shared/time-display";

interface RelativeTimeProps {
  timestamp: string;
}

export function RelativeTime({ timestamp }: RelativeTimeProps) {
  return (
    <TimeDisplay 
      timestamp={timestamp} 
      format="relative"
      className="text-muted-foreground"
      placeholder="--"
    />
  );
}

