// ================================
// Video Call Provider (Context)
// ================================
// Global context provider for video call functionality

"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { useVideoCall, type UseVideoCallReturn } from '../hooks/use-video-call';
import { useUserStore } from '@/lib/store';

interface VideoCallContextValue extends UseVideoCallReturn {
  currentUserId: string;
}

const VideoCallContext = createContext<VideoCallContextValue | null>(null);

interface VideoCallProviderProps {
  children: ReactNode;
}

/**
 * Video Call Provider
 * Provides video call functionality to the entire application
 */
export function VideoCallProvider({ children }: VideoCallProviderProps) {
  const currentUser = useUserStore((state) => state.user);
  
  const videoCall = useVideoCall({
    currentUserId: currentUser?.id || '',
    currentUserName: currentUser?.name || '',
    currentUserAvatar: currentUser?.avatar || null,
    onCallEnded: () => {
      // Handle call ended callback
    },
  });
  
  return (
    <VideoCallContext.Provider value={{ ...videoCall, currentUserId: currentUser?.id || '' }}>
      {children}
    </VideoCallContext.Provider>
  );
}

/**
 * Hook to access video call context
 */
export function useVideoCallContext(): VideoCallContextValue {
  const context = useContext(VideoCallContext);
  
  if (!context) {
    throw new Error('useVideoCallContext must be used within VideoCallProvider');
  }
  
  return context;
}

