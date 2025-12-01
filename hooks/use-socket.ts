// ================================
// useSocket Hook
// ================================
// Centralized hook for socket connection management
// Provides consistent socket connection state and lifecycle management

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getSocket, disconnectSocket, type TypedSocket } from "@/lib/socket";

export interface UseSocketOptions {
  autoConnect?: boolean; // Auto-connect on mount (default: true)
  emitUserConnect?: boolean; // Emit user-connect event (default: true)
}

export interface UseSocketReturn {
  socket: TypedSocket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

/**
 * Hook for managing socket connection
 * 
 * @example
 * ```tsx
 * const { socket, isConnected } = useSocket();
 * 
 * useEffect(() => {
 *   if (socket && isConnected) {
 *     socket.emit('join-room', roomId);
 *   }
 * }, [socket, isConnected, roomId]);
 * ```
 */
export function useSocket(
  options: UseSocketOptions = {}
): UseSocketReturn {
  const {
    autoConnect = true,
    emitUserConnect = true,
  } = options;

  const [socket, setSocket] = useState<TypedSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const hasEmittedUserConnect = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  /**
   * Connect to socket
   */
  const connect = useCallback(async () => {
    if (socket?.connected) {
      return;
    }

    try {
      // Get user session BEFORE creating socket connection
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();

      if (!session?.user?.id) {
        console.warn('⚠️ No user session found, cannot connect socket');
        setIsConnected(false);
        return;
      }

      // Create socket with userId for authentication
      const newSocket = getSocket(session.user.id);
      setSocket(newSocket);

      // Set up connection handlers
      const handleConnect = () => {
        setIsConnected(true);
        // Log removed to prevent duplicates (lib/socket.ts already logs connection)

        // Mark that we've connected (no need to emit user-connect anymore)
        hasEmittedUserConnect.current = true;
      };

      const handleDisconnect = () => {
        setIsConnected(false);
      };

      const handleConnectError = (error: Error) => {
        console.error("Socket connection error:", error);
        setIsConnected(false);
      };

      // Register event listeners
      newSocket.on("connect", handleConnect);
      newSocket.on("disconnect", handleDisconnect);
      newSocket.on("connect_error", handleConnectError);

      // Store cleanup function
      cleanupRef.current = () => {
        newSocket.off("connect", handleConnect);
        newSocket.off("disconnect", handleDisconnect);
        newSocket.off("connect_error", handleConnectError);
      };

      // If already connected, trigger connect handler
      if (newSocket.connected) {
        handleConnect();
      }
    } catch (error) {
      console.error("Failed to get session for socket connection:", error);
      setIsConnected(false);
    }
  }, [socket, emitUserConnect]);

  /**
   * Disconnect from socket
   */
  const disconnect = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    if (socket) {
      socket.disconnect();
      setIsConnected(false);
      hasEmittedUserConnect.current = false;
    }
  }, [socket]);

  /**
   * Reconnect to socket
   */
  const reconnect = useCallback(() => {
    disconnect();
    // Small delay before reconnecting
    setTimeout(() => {
      connect();
    }, 100);
  }, [connect, disconnect]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      // Cleanup on unmount
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [autoConnect, connect]);

  return {
    socket,
    isConnected,
    connect,
    disconnect,
    reconnect,
  };
}
