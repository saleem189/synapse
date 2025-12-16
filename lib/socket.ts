// ================================
// Socket.io Client Configuration
// ================================
// This module provides a singleton Socket.io client instance
// for real-time communication with the chat server

"use client";

import { io, Socket } from "socket.io-client";

// Socket.io server URL from environment variables
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

// Define the events that can be emitted and received
export interface ServerToClientEvents {
  "receive-message": (message: MessagePayload) => void;
  "user-joined": (data: { roomId: string; userId: string; userName: string }) => void;
  "user-left": (data: { roomId: string; userId: string; userName: string }) => void;
  "user-typing": (data: { roomId: string; userId: string; userName: string }) => void;
  "user-stop-typing": (data: { roomId: string; userId: string }) => void;
  "user-online": (userId: string) => void;
  "user-offline": (userId: string) => void;
  "online-users": (userIds: string[]) => void;
  "message-read-update": (data: { messageId: string; userId: string; roomId: string; readAt: string }) => void;
  "message-delivered-update": (data: { messageId: string; roomId: string }) => void;
  "message-updated": (data: { messageId: string; content: string; updatedAt: string }) => void;
  "message-deleted": (data: { messageId: string }) => void;
  "reaction-updated": (data: { messageId: string; reactions: Record<string, Array<{ id: string; name: string; avatar: string | null }>> }) => void;
  "message-pinned": (data: { messageId: string; roomId: string; pinnedById: string; pinnedAt: string }) => void;
  "message-unpinned": (data: { messageId: string; roomId: string }) => void;
  // Video call events
  "incoming-call": (data: { callId: string; from: string; fromName: string; fromAvatar?: string | null; roomId: string; callType: 'video' | 'audio' }) => void;
  "call-accepted": (data: { callId: string; roomId: string; participantId: string }) => void;
  "call-rejected": (data: { callId: string; roomId: string; participantId: string }) => void;
  "call-ended": (data: { callId: string; roomId: string; endedBy: string }) => void;
  "call-joined": (data: { callId: string; roomId: string; participantId: string; participantName: string }) => void;
  "call-left": (data: { callId: string; roomId: string; participantId: string }) => void;
  "webrtc-signal": (data: { from: string; signal: any; callId: string }) => void;
  "call-participant-muted": (data: { callId: string; participantId: string; isMuted: boolean }) => void;
  "call-participant-video-toggled": (data: { callId: string; participantId: string; hasVideo: boolean }) => void;
  "call-screen-share-started": (data: { callId: string; participantId: string }) => void;
  "call-screen-share-stopped": (data: { callId: string; participantId: string }) => void;
  "call-hand-raise": (data: { callId: string; userId: string; userName: string; isRaised: boolean }) => void;
  "call-reaction": (data: { userId: string; userName: string; emoji: string; timestamp: number }) => void;
  error: (message: string) => void;
}

export interface ClientToServerEvents {
  "join-room": (roomId: string) => void;
  "leave-room": (roomId: string) => void;
  "send-message": (message: MessagePayload) => void;
  "message-updated": (data: { messageId: string; content: string; roomId: string }) => void;
  "message-deleted": (data: { messageId: string; roomId: string }) => void;
  "message-read": (data: { messageId: string; userId: string; roomId: string }) => void;
  "message-delivered": (data: { messageId: string; roomId: string }) => void;
  typing: (data: { roomId: string; userId: string; userName: string }) => void;
  "stop-typing": (data: { roomId: string; userId: string }) => void;
  "user-connect": (userId: string) => void;
  "get-online-users": () => void;
  // Video call events
  "call-initiate": (data: { roomId: string; targetUserId?: string; callType: 'video' | 'audio' }) => void;
  "call-accept": (data: { callId: string; roomId: string }) => void;
  "call-reject": (data: { callId: string; roomId: string }) => void;
  "call-end": (data: { callId: string; roomId: string }) => void;
  "call-join": (data: { callId: string; roomId: string }) => void;
  "call-leave": (data: { callId: string; roomId: string }) => void;
  "webrtc-signal": (data: { to: string; signal: any; callId: string }) => void;
  "call-mute": (data: { callId: string; roomId: string; isMuted: boolean }) => void;
  "call-video-toggle": (data: { callId: string; roomId: string; hasVideo: boolean }) => void;
  "call-screen-share": (data: { callId: string; roomId: string; isSharing: boolean }) => void;
  "call-hand-raise": (data: { callId: string; roomId: string; userId: string; userName: string; isRaised: boolean }) => void;
  "call-reaction": (data: { callId: string; roomId: string; userId: string; userName: string; emoji: string; timestamp: number }) => void;
}

export interface MessagePayload {
  id?: string;
  content: string;
  senderId: string;
  senderName: string;
  roomId: string;
  type?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  replyToId?: string;
  replyTo?: {
    id: string;
    content: string;
    senderName: string;
    senderAvatar?: string | null;
  } | null;
  reactions?: Record<string, Array<{ id: string; name: string; avatar: string | null }>>;
  isRead?: boolean;
  isDelivered?: boolean;
  createdAt?: string;
}

// Type-safe socket instance
export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// Singleton socket instance
let socket: TypedSocket | null = null;

/**
 * Get or create the socket connection
 * Returns a singleton instance of the Socket.io client
 * @param userId - User ID for authentication (required for server auth)
 */
export const getSocket = (userId?: string): TypedSocket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      // Authentication token (required by server)
      auth: {
        token: userId || '' // Pass userId as auth token
      },
      // Auto-connect when created
      autoConnect: true,
      // Reconnection settings
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      // Timeout settings
      timeout: 20000,
      // Transport options
      transports: ["websocket", "polling"],
    });

    // Log connection events in development
    if (process.env.NODE_ENV === "development") {
      socket.on("connect", () => {
        console.log("🔌 Socket connected:", socket?.id);
      });

      socket.on("disconnect", (reason) => {
        console.log("🔌 Socket disconnected:", reason);
      });

      socket.on("connect_error", (error) => {
        console.error("🔌 Socket connection error:", error.message);
      });
    }
  }

  return socket;
};

/**
 * Reconnect the socket with a new user ID
 * Useful when user session changes
 */
export const reconnectSocket = (userId: string): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  getSocket(userId);
};

/**
 * Disconnect the socket connection
 * Should be called when user logs out or leaves the app
 */
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Check if socket is connected
 */
export const isSocketConnected = (): boolean => {
  return socket?.connected ?? false;
};

export default getSocket;

