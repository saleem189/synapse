// ================================
// Admin Loading State
// ================================
// Shows a loading state while admin routes are loading

import { Loader2 } from "lucide-react";

export default function AdminLoading() {
  return (
    <div className="flex items-center justify-center h-screen bg-surface-50 dark:bg-surface-950">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Loading admin dashboard...
        </p>
      </div>
    </div>
  );
}

