// ================================
// Socket Server Client
// ================================
// Allows Next.js API routes to broadcast messages via the socket server
// This connects to the socket server as a client to emit events

import { io, Socket } from "socket.io-client";
import type { MessagePayload } from "./socket";
import { logApiBroadcast, logError } from "./message-flow-logger";
import { getService } from "@/lib/di";
import type { ILogger } from "@/lib/logger/logger.interface";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

// Get logger for structured logging (lazy async initialization)
let logger: ILogger | null = null;
async function getLogger(): Promise<ILogger> {
  if (!logger) {
    logger = await getService<ILogger>('logger');
  }
  return logger;
}

// Singleton socket client for server-side broadcasting
let serverSocket: Socket | null = null;

/**
 * Get or create the server-side socket client
 * This is used by API routes to broadcast messages
 */
async function getServerSocket(): Promise<Socket> {
  if (!serverSocket || !serverSocket.connected) {
    const logger = await getLogger();
    logger.log('Creating server socket connection', {
      component: 'SocketServerClient',
      socketUrl: SOCKET_URL,
    });
    // Server-side socket doesn't need user authentication
    // Use a special token to identify it as an API socket
    serverSocket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ["websocket", "polling"],
      auth: {
        token: 'api-server', // Special token for API server socket
      },
    });

    serverSocket.on("connect", async () => {
      if (!serverSocket) return; // Safety check
      const logger = await getLogger();
      logger.log('Server socket connected for broadcasting', {
        component: 'SocketServerClient',
        socketId: serverSocket.id,
        socketUrl: SOCKET_URL,
      });
      
      // Log connection to message flow logger
      logApiBroadcast('connection', 'system', 'system', true, serverSocket.id);
      
      // Small delay to ensure server handlers are set up
      // This is a workaround for timing issues where events are emitted
      // before the server's connection handler finishes setting up event listeners
      setTimeout(async () => {
        if (serverSocket) {
          const logger = await getLogger();
          logger.log('API socket ready to emit events', {
            component: 'SocketServerClient',
            socketId: serverSocket.id,
          });
        }
      }, 100);
    });

    serverSocket.on("disconnect", async (reason) => {
      const logger = await getLogger();
      logger.warn('Server socket disconnected', {
        component: 'SocketServerClient',
        reason,
      });
    });

    serverSocket.on("connect_error", async (error) => {
      const logger = await getLogger();
      logger.error('Server socket connection error', error, {
        component: 'SocketServerClient',
      });
    });

    // Log all events for debugging (development only)
    if (process.env.NODE_ENV === 'development') {
      serverSocket.onAny(async (event, ...args) => {
        const logger = await getLogger();
        logger.log('Socket received event', {
          component: 'SocketServerClient',
          socketId: serverSocket?.id,
          event,
          argsCount: args.length,
        });
      });
    }
    
    // Log all emitted events (development only)
    if (process.env.NODE_ENV === 'development') {
      const originalEmit = serverSocket.emit.bind(serverSocket);
      serverSocket.emit = function(event: string, ...args: unknown[]) {
        // Fire and forget logger call
        getLogger().then(logger => {
          logger.log('Socket emit event', {
            component: 'SocketServerClient',
            socketId: serverSocket?.id,
            event,
            argsCount: args.length,
          });
        }).catch(() => {
          // Ignore logger errors
        });
        return originalEmit(event, ...args);
      };
    }
  }

  return serverSocket;
}

/**
 * Broadcast a message to all users in a room (except sender)
 * This is called by API routes after saving a message to the database
 */
export async function broadcastMessage(
  roomId: string,
  message: {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    type?: string;
    fileUrl?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
    fileType?: string | null;
    replyToId?: string | null;
    replyTo?: {
      id: string;
      content: string;
      senderName: string;
      senderAvatar?: string | null;
    } | null;
    createdAt: string;
  }
): Promise<void> {
  try {
    const socket = await getServerSocket();
    const logger = await getLogger();
    
    // Wait for connection if not connected
    if (!socket.connected) {
      logger.log('Waiting for server socket connection', {
        component: 'SocketServerClient',
      });
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Socket connection timeout"));
        }, 5000);

        if (socket.connected) {
          clearTimeout(timeout);
          resolve();
          return;
        }

        socket.once("connect", () => {
          clearTimeout(timeout);
          resolve();
        });

        socket.once("connect_error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    }

    // Wait a bit more to ensure server handlers are fully set up
    await new Promise(resolve => setTimeout(resolve, 200));

    const payload: MessagePayload = {
      id: message.id, // Use the REAL database ID
      content: message.content,
      senderId: message.senderId,
      senderName: message.senderName,
      roomId,
      type: message.type || "text",
      fileUrl: message.fileUrl || undefined,
      fileName: message.fileName || undefined,
      fileSize: message.fileSize || undefined,
      fileType: message.fileType || undefined,
      replyToId: message.replyToId || undefined,
      replyTo: message.replyTo ? {
        id: message.replyTo.id,
        content: message.replyTo.content,
        senderName: message.replyTo.senderName,
        senderAvatar: message.replyTo.senderAvatar || null,
      } : undefined,
      createdAt: message.createdAt,
    };

    // Log before emitting (development only for verbose logging)
    if (process.env.NODE_ENV === 'development') {
      logger.log('API emitting message to socket server', {
        component: 'SocketServerClient',
        messageId: message.id,
        roomId,
        socketId: socket.id,
        connected: socket.connected,
      });
    }
    
    logApiBroadcast(message.id, roomId, message.senderId, socket.connected, socket.id);
    
    // Emit with acknowledgment and error handling
    socket.emit("send-message", payload, async (response: { success?: boolean; error?: string } | undefined) => {
      if (response) {
        const logger = await getLogger();
        logger.log('Server acknowledged message', {
          component: 'SocketServerClient',
          messageId: message.id,
          success: response.success,
        });
      }
      // No ack is normal, don't log
    });
    
    // Also listen for any errors
    socket.once("error", async (error) => {
      const logger = await getLogger();
      logger.error('Socket error when emitting message', error, {
        component: 'SocketServerClient',
        messageId: message.id,
      });
    });
  } catch (error) {
    logError('API_BROADCAST', message.id, roomId, error instanceof Error ? error : String(error), {
      senderId: message.senderId,
    });
    try {
      const logger = await getLogger();
      logger.error('Failed to broadcast message via socket', error, {
        component: 'SocketServerClient',
        messageId: message.id,
        roomId,
        senderId: message.senderId,
      });
    } catch {
      console.error('[SocketServerClient] Failed to broadcast message via socket:', error);
    }
    throw error;
  }
}

/**
 * Broadcast a reaction update to all users in a room
 * This is called by API routes after toggling a reaction
 */
export async function broadcastReactionUpdate(
  roomId: string,
  messageId: string,
  reactions: Record<string, Array<{ id: string; name: string; avatar: string | null }>>
): Promise<void> {
  try {
    const socket = await getServerSocket();
    const logger = await getLogger();
    
    // Wait for connection if not connected
    if (!socket.connected) {
      logger.log('Waiting for server socket connection', {
        component: 'SocketServerClient',
      });
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Socket connection timeout"));
        }, 5000);

        if (socket.connected) {
          clearTimeout(timeout);
          resolve();
          return;
        }

        socket.once("connect", () => {
          clearTimeout(timeout);
          resolve();
        });

        socket.once("connect_error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    }

    // Wait a bit more to ensure server handlers are fully set up
    await new Promise(resolve => setTimeout(resolve, 200));

    // Log before emitting (development only for verbose logging)
    if (process.env.NODE_ENV === 'development') {
      logger.log('API emitting reaction update to socket server', {
        component: 'SocketServerClient',
        messageId,
        roomId,
        socketId: socket.id,
        connected: socket.connected,
      });
    }
    
    // Emit reaction-updated event to the socket server
    // The server will broadcast it to all clients in the room
    socket.emit("reaction-updated", {
      messageId,
      roomId,
      reactions,
    });
  } catch (error) {
    try {
      const logger = await getLogger();
      logger.error('Failed to broadcast reaction update via socket', error, {
        component: 'SocketServerClient',
        messageId,
        roomId,
      });
    } catch {
      console.error('[SocketServerClient] Failed to broadcast reaction update via socket:', error);
    }
    // Don't throw - reaction was saved, just socket broadcast failed
  }
}

/**
 * Broadcast a message pin/unpin update to all users in a room
 * This is called by API routes after pinning or unpinning a message
 */
export async function broadcastPinUpdate(
  roomId: string,
  messageId: string,
  isPinned: boolean,
  pinnedById: string,
  pinnedAt: string | null
): Promise<void> {
  try {
    const socket = await getServerSocket();
    const logger = await getLogger();
    
    // Wait for connection if not connected
    if (!socket.connected) {
      logger.log('Waiting for server socket connection', {
        component: 'SocketServerClient',
      });
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Socket connection timeout"));
        }, 5000);

        if (socket.connected) {
          clearTimeout(timeout);
          resolve();
          return;
        }

        socket.once("connect", () => {
          clearTimeout(timeout);
          resolve();
        });

        socket.once("connect_error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    }

    // Wait a bit more to ensure server handlers are fully set up
    await new Promise(resolve => setTimeout(resolve, 200));

    // Log before emitting (development only for verbose logging)
    if (process.env.NODE_ENV === 'development') {
      logger.log('API emitting pin update to socket server', {
        component: 'SocketServerClient',
        messageId,
        roomId,
        isPinned,
        socketId: socket.id,
        connected: socket.connected,
      });
    }
    
    // Emit the appropriate event to the socket server
    const event = isPinned ? "message-pinned" : "message-unpinned";
    socket.emit(event, {
      messageId,
      roomId,
      pinnedById,
      pinnedAt,
    });
  } catch (error) {
    try {
      const logger = await getLogger();
      logger.error('Failed to broadcast pin update via socket', error, {
        component: 'SocketServerClient',
        messageId,
        roomId,
        isPinned,
      });
    } catch {
      console.error('[SocketServerClient] Failed to broadcast pin update via socket:', error);
    }
    // Don't throw - pin was saved, just socket broadcast failed
  }
}

/**
 * Disconnect the server socket client
 */
export function disconnectServerSocket(): void {
  if (serverSocket) {
    serverSocket.disconnect();
    serverSocket = null;
  }
}

