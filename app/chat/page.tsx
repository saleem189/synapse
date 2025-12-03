// ================================
// Chat Home Page
// ================================
// Default page when no chat room is selected

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { MessageCircle } from "lucide-react";

export default async function ChatHomePage() {
  const session = await getServerSession(authOptions);

  // Redirect admins to admin dashboard
  if (session?.user?.role === "ADMIN") {
    redirect("/admin");
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-surface-100/50 dark:bg-surface-900/50">
      <div className="text-center max-w-md px-6 animate-fade-in">
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary-500/25">
          <MessageCircle className="w-10 h-10 text-white" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-surface-900 dark:text-white mb-3">
          Welcome to ChatFlow
        </h2>

        {/* Description */}
        <p className="text-surface-600 dark:text-surface-400 mb-6">
          Select a conversation from the sidebar or create a new room to start
          chatting with your friends and colleagues.
        </p>

        {/* Tips */}
        <div className="space-y-3 text-left">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
            <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
              <span className="text-primary-600 dark:text-primary-400 font-bold text-sm">1</span>
            </div>
            <div>
              <p className="text-sm font-medium text-surface-900 dark:text-white">
                Create a new room
              </p>
              <p className="text-xs text-surface-500">
                Click the + button in the sidebar
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
            <div className="w-8 h-8 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center flex-shrink-0">
              <span className="text-accent-600 dark:text-accent-400 font-bold text-sm">2</span>
            </div>
            <div>
              <p className="text-sm font-medium text-surface-900 dark:text-white">
                Invite participants
              </p>
              <p className="text-xs text-surface-500">
                Add friends to your chat room
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">3</span>
            </div>
            <div>
              <p className="text-sm font-medium text-surface-900 dark:text-white">
                Start chatting
              </p>
              <p className="text-xs text-surface-500">
                Messages are delivered in real-time
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
