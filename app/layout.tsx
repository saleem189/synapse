// ================================
// Root Layout Component
// ================================
// This is the root layout for the entire application
// It includes the HTML structure, providers, and global styles

import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ErrorBoundaryWrapper } from "@/components/error-boundary";

// Load custom fonts
const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

// Metadata for SEO
export const metadata: Metadata = {
  title: "ChatFlow - Real-time Chat Application",
  description:
    "A modern, real-time chat application built with Next.js, Socket.io, and MongoDB",
  keywords: ["chat", "messaging", "real-time", "nextjs", "socket.io"],
  authors: [{ name: "ChatFlow Team" }],
  openGraph: {
    title: "ChatFlow - Real-time Chat Application",
    description: "Connect and chat in real-time with ChatFlow",
    type: "website",
  },
  // Permissions Policy for camera and microphone access (required for video/voice calls)
  other: {
    "Permissions-Policy": "camera=(self), microphone=(self), geolocation=()",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Permissions Policy for camera and microphone access (required for video/voice calls) */}
        <meta
          httpEquiv="Permissions-Policy"
          content="camera=(self), microphone=(self), geolocation=()"
        />
      </head>
      <body
        className={`${outfit.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        {/* Wrap the app with Error Boundary and providers */}
        <ErrorBoundaryWrapper>
          <Providers>{children}</Providers>
        </ErrorBoundaryWrapper>
      </body>
    </html>
  );
}

