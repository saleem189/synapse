// ================================
// Chat Layout Shell - 3-Tier Resizable Layout
// ================================
// Client component for managing the resizable 3-panel layout
// Follows Architecture Rules: Feature-based, proper separation
// Follows Design System Rules: Tailwind tokens, responsive, accessible

"use client";

import { useEffect, useState, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useContextualSidebar } from "@/features/contextual-sidebar";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ChatSidebar } from "./chat-sidebar";
import { ContextualSidebarWrapper } from "@/features/contextual-sidebar/components/contextual-sidebar-wrapper";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { PanelLeft, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChatLayoutShellProps {
  children: React.ReactNode;
}

export function ChatLayoutShell({ children }: ChatLayoutShellProps) {
  const isMobile = useIsMobile();
  const { isOpen: isContextualSidebarOpen } = useContextualSidebar();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch (follows Coding Standards)
  useEffect(() => {
    setMounted(true);
  }, []); // Empty dependency array - runs once on mount

  // Toggle sidebar with accessibility (follows Design System Rules)
  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []); // No dependencies - stable function

  // Keyboard shortcut: Ctrl+B to toggle sidebar (Accessibility)
  useEffect(() => {
    if (!mounted || isMobile) return;

    const handleKeyboard = (event: KeyboardEvent) => {
      // Ctrl+B or Cmd+B
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [mounted, isMobile, toggleSidebar]); // All dependencies listed

  // Loading state during hydration (prevents SSR/client mismatch)
  if (!mounted) {
    return (
      <div 
        className="h-screen w-screen flex"
        role="status"
        aria-label="Loading chat interface"
      >
        <div className="w-64 border-r bg-muted/20 animate-pulse" aria-hidden="true" />
        <div className="flex-1 bg-background" aria-hidden="true" />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  // Mobile Layout: Use sheets for sidebar (follows Design System: mobile-first)
  if (isMobile) {
    return (
      <div 
        className="h-screen flex flex-col overflow-hidden"
        role="main"
        aria-label="Mobile chat layout"
      >
        {/* Mobile: Main content takes full screen */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>

        {/* Mobile Sidebar Sheet (accessible overlay) */}
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetContent 
            side="left" 
            className="w-80 p-0"
            aria-label="Chat sidebar navigation"
          >
            <ChatSidebar />
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // Desktop/Tablet Layout: Resizable 3-tier layout (follows Architecture Rules)
  return (
    <div className="h-screen w-screen flex flex-col">
      {/* Sidebar Toggle Button (Accessibility: keyboard accessible) */}
      {!isSidebarOpen && (
        <div className="absolute top-4 left-4 z-50">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleSidebar}
                  aria-label="Open sidebar navigation"
                  aria-expanded={isSidebarOpen}
                  className="shadow-lg hover:shadow-xl transition-shadow"
                >
                  <PanelLeft className="h-5 w-5" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Show sidebar <kbd className="ml-2 px-1 py-0.5 bg-muted rounded text-xs">Ctrl+B</kbd></p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      <ResizablePanelGroup 
        direction="horizontal" 
        className="flex-1 w-full"
        role="main"
        aria-label="Chat application layout"
      >
        {/* LEFT PANEL: Sidebar (collapsible) */}
        {isSidebarOpen && (
          <>
            <ResizablePanel
              id="sidebar"
              order={1}
              defaultSize={20}
              minSize={15}
              maxSize={25}
              collapsible={true}
              onCollapse={() => setIsSidebarOpen(false)}
              className={cn(
                "min-w-[200px]",
                "transition-all duration-300"
              )}
              aria-label="Sidebar navigation panel"
            >
              {/* Sidebar with collapse button */}
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between p-2 border-b">
                  <span className="sr-only">Sidebar controls</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={toggleSidebar}
                          aria-label="Collapse sidebar"
                          aria-expanded={isSidebarOpen}
                          className="h-8 w-8"
                        >
                          <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Hide sidebar <kbd className="ml-2 px-1 py-0.5 bg-muted rounded text-xs">Ctrl+B</kbd></p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex-1 overflow-hidden">
                  <ChatSidebar />
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle 
              withHandle 
              className="w-1 hover:w-2 transition-all bg-border hover:bg-primary/20"
              aria-label="Resize sidebar"
            />
          </>
        )}

        {/* CENTER PANEL: Main Chat Area */}
        <ResizablePanel
          id="main"
          order={2}
          defaultSize={isContextualSidebarOpen ? 55 : 80}
          minSize={40}
          className="flex flex-col overflow-hidden"
          aria-label="Main chat area"
        >
          {children}
        </ResizablePanel>

        {/* RIGHT PANEL: Contextual Sidebar (Threads, Files, etc.) */}
        {isContextualSidebarOpen && (
          <>
            <ResizableHandle 
              withHandle 
              className="w-1 hover:w-2 transition-all bg-border hover:bg-primary/20"
              aria-label="Resize contextual panel"
            />
            
            <ResizablePanel
              id="contextual"
              order={3}
              defaultSize={25}
              minSize={20}
              maxSize={35}
              className={cn(
                "transition-all duration-300",
                "border-l"
              )}
              aria-label="Contextual sidebar panel"
            >
              <ContextualSidebarWrapper />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}

