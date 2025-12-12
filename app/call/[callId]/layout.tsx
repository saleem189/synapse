// ================================
// Call Layout - Minimal Chrome
// ================================
// No sidebar, no navigation - just the call interface

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Video Call - Synapse",
  description: "Join your video call",
};

export default function CallLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      {children}
    </div>
  );
}

