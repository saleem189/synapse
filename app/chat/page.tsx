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
    <div className="flex-1 flex items-center justify-center bg-background">
      <div className="text-center max-w-md px-6 animate-fade-in">
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary-500/25">
          <MessageCircle className="w-10 h-10 text-white" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-foreground mb-3">
          Welcome to Synapse
        </h2>

        {/* Description */}
        <p className="text-muted-foreground mb-6">
          Select a conversation from the sidebar or create a new room to start
          chatting with your friends and colleagues.
        </p>

        {/* Tips */}
        <div className="space-y-3 text-left">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold text-sm">1</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Create a new room
              </p>
              <p className="text-xs text-muted-foreground">
                Click the + button in the sidebar
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <span className="text-accent font-bold text-sm">2</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Invite participants
              </p>
              <p className="text-xs text-muted-foreground">
                Add friends to your chat room
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">3</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Start chatting
              </p>
              <p className="text-xs text-muted-foreground">
                Messages are delivered in real-time
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
