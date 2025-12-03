// ================================
// Chat Layout
// ================================
// Layout for all chat pages with sidebar

import { cache } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { UserStoreProvider } from "@/components/chat/user-store-provider";
import { NetworkStatusMonitor } from "@/components/chat/network-status-monitor";

// Cache session lookup to avoid re-fetching on every navigation
const getSession = cache(async () => {
  return await getServerSession(authOptions);
});

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check authentication (cached)
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  // Redirect admins to admin dashboard
  if (session.user.role === "ADMIN") {
    redirect("/admin");
  }

  return (
    <UserStoreProvider user={{
      ...session.user,
      role: session.user.role as 'USER' | 'ADMIN',
      status: 'ONLINE',
      lastSeen: new Date().toISOString(),
    }}>
      {/* Network Status Monitor (shows toasts only, no UI) */}
      <NetworkStatusMonitor />
      
      <div className="h-screen flex overflow-hidden bg-surface-50 dark:bg-surface-950">
        {/* Sidebar */}
        <ChatSidebar />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </UserStoreProvider>
  );
}

