// ================================
// Route Change Handler Component
// ================================
// Closes all modals when route changes

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useUIStore } from "@/lib/store";

/**
 * Route change handler component
 * Closes all modals when user navigates to a new page
 */
export function RouteChangeHandler() {
  const pathname = usePathname();
  const { closeAllModals, closeSidebar } = useUIStore();

  useEffect(() => {
    // Close all modals and sidebar when route changes
    closeAllModals();
    closeSidebar();
  }, [pathname, closeAllModals, closeSidebar]);

  return null; // This component doesn't render anything
}

