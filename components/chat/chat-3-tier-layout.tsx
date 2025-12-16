// ================================
// 3-Tier Chat Layout
// ================================
// Professional Slack-style fixed layout
// Left: Sidebar | Center: Main Chat | Right: Contextual (optional)

"use client";

import { ChatSidebar } from "./chat-sidebar";
import { useUIStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface Chat3TierLayoutProps {
  children: React.ReactNode;
  contextualSidebar?: React.ReactNode;
}

export function Chat3TierLayout({ children, contextualSidebar }: Chat3TierLayoutProps) {
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-30 lg:hidden transition-opacity",
          isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Desktop: Fixed 3-Tier Layout */}
      <div className="hidden lg:flex lg:flex-1 h-full">
        {/* Left: Sidebar - Fixed width */}
        <div className="w-64 flex-shrink-0 border-r border-border">
          <ChatSidebar />
        </div>

        {/* Center: Main Chat - Flexible */}
        <div className="flex-1 flex flex-col min-w-0">
          {children}
        </div>

        {/* Right: Contextual Sidebar (Optional) - Fixed width */}
        {contextualSidebar && (
          <div className="w-80 flex-shrink-0 border-l border-border">
            {contextualSidebar}
          </div>
        )}
      </div>

      {/* Mobile: Simple Stack */}
      <div className="flex lg:hidden flex-1 flex-col h-full">
        <ChatSidebar />
        {children}
      </div>
    </div>
  );
}

