// ================================
// Chat Layout - 3-Tier Architecture
// ================================
// Professional 3-panel layout: Sidebar | Main | Contextual
// Resizable, collapsible, responsive

import { cache } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Chat3TierLayout } from "@/components/chat/chat-3-tier-layout";
import { UserStoreProvider } from "@/components/chat/user-store-provider";
import { NetworkStatusMonitor } from "@/components/chat/network-status-monitor";
import { QuickSwitcher } from "@/components/chat/quick-switcher";

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
      
      {/* Quick Switcher (CMD+K / CTRL+K) */}
      <QuickSwitcher />
      
      {/* 3-Tier Resizable Layout */}
      <Chat3TierLayout>
        {children}
      </Chat3TierLayout>
    </UserStoreProvider>
  );
}

