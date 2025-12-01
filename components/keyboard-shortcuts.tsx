// ================================
// Keyboard Shortcuts Component
// ================================
// Simple global keyboard shortcuts for common actions

"use client";

import { useEffect } from "react";
import { useUIStore } from "@/lib/store";

/**
 * Keyboard shortcuts component
 * Handles global keyboard shortcuts for the application
 */
export function KeyboardShortcuts() {
  const {
    openCreateRoomModal,
    openSettingsModal,
    closeAllModals,
    toggleSidebar,
  } = useUIStore();

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Escape: Close all modals
      if (e.key === "Escape") {
        closeAllModals();
        return;
      }

      // Ctrl/Cmd + N: Create new room
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        openCreateRoomModal();
        return;
      }

      // Ctrl/Cmd + ,: Open settings
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        openSettingsModal();
        return;
      }

      // Ctrl/Cmd + B: Toggle sidebar (mobile)
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        toggleSidebar();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [openCreateRoomModal, openSettingsModal, closeAllModals, toggleSidebar]);

  return null; // This component doesn't render anything
}

