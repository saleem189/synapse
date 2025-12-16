// ================================
// React Query Provider
// ================================
// Sets up React Query (TanStack Query) for the application
// Provides caching, deduplication, and background refetching

"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

interface ReactQueryProviderProps {
  children: React.ReactNode;
}

/**
 * React Query Provider Component
 * Wraps the app to provide React Query functionality
 * Uses useState to ensure a stable QueryClient instance per component tree
 */
export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  // Create QueryClient instance using useState to ensure it's only created once
  // This is the recommended pattern for Next.js App Router
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: how long data is considered fresh
            staleTime: 30 * 1000, // 30 seconds
            // Cache time: how long unused data stays in cache
            gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
            // Retry failed requests
            retry: 1,
            // Refetch on window focus (good for real-time apps)
            refetchOnWindowFocus: false,
            // Refetch on reconnect
            refetchOnReconnect: true,
            // Don't refetch on mount if data is fresh
            refetchOnMount: true,
          },
          mutations: {
            // Retry failed mutations
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Show React Query DevTools in development */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

