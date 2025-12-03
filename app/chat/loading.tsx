// ================================
// Chat Loading State
// ================================
// Shows a loading state while chat routes are loading

import { Loader2 } from "lucide-react";

export default function ChatLoading() {
  return (
    <div className="flex-1 flex items-center justify-center h-full bg-surface-50 dark:bg-surface-950">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-3" />
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Loading chat...
        </p>
      </div>
    </div>
  );
}

