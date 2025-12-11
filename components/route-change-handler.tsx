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
  const { closeAllModals } = useUIStore();

  useEffect(() => {
    // Close all modals when route changes
    // Note: Sidebar closing is handled automatically by shadcn Sidebar component
    closeAllModals();
  }, [pathname, closeAllModals]);

  return null; // This component doesn't render anything
}

