// ================================
// Global Providers Component
// ================================
// This component wraps the app with all necessary context providers:
// - NextAuth SessionProvider for authentication
// - ThemeProvider for dark mode support
// - Sonner Toast provider for notifications
// - Any other global providers

"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "sonner";
import { ReactNode } from "react";
import { ReactQueryProvider } from "@/lib/react-query-provider";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { RouteChangeHandler } from "@/components/route-change-handler";
import { VideoCallProvider, VideoCallModal, IncomingCallDialog } from "@/features/video-call";
import { ThemeProvider, StyleProvider } from "@/lib/design-system/providers";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      {/* SessionProvider uses relative URLs by default, which prevents client-side NEXTAUTH_URL errors */}
      {/* Next-themes ThemeProvider for backward compatibility (handles class toggling) */}
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange={false}
      >
        {/* Custom ThemeProvider for our design system (handles CSS variables) */}
        <ThemeProvider>
          {/* StyleProvider for visual style (solid/glassmorphic) */}
          <StyleProvider>
            <ReactQueryProvider>
              <VideoCallProvider>
                <KeyboardShortcuts />
                <RouteChangeHandler />
                {children}
                {/* Video Call Components */}
                <VideoCallModal />
                <IncomingCallDialog />
                <Toaster 
                  position="top-right" 
                  richColors 
                  closeButton
                  toastOptions={{
                    duration: 4000,
                  }}
                />
              </VideoCallProvider>
            </ReactQueryProvider>
          </StyleProvider>
        </ThemeProvider>
      </NextThemesProvider>
    </SessionProvider>
  );
}

