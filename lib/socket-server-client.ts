// ================================
// Socket Server Client
// ================================
// Allows Next.js API routes to broadcast messages via the socket server
// This connects to the socket server as a client to emit events

import { io, Socket } from "socket.io-client";
import type { MessagePayload } from "./socket";
import { logApiBroadcast, logError } from "./message-flow-logger";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

// Singleton socket client for server-side broadcasting
let serverSocket: Socket | null = null;

/**
 * Get or create the server-side socket client
 * This is used by API routes to broadcast messages
 */
function getServerSocket(): Socket {
  if (!serverSocket || !serverSocket.connected) {
    console.log(`🔌 Creating server socket connection to ${SOCKET_URL}...`);
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

    serverSocket.on("connect", () => {
      console.log(`✅ Server socket connected for broadcasting (ID: ${serverSocket?.id})`);
      console.log(`📋 Connected to: ${SOCKET_URL}`);
      
      // Log connection to message flow logger
      logApiBroadcast('connection', 'system', 'system', true, serverSocket.id);
      
      // Small delay to ensure server handlers are set up
      // This is a workaround for timing issues where events are emitted
      // before the server's connection handler finishes setting up event listeners
      setTimeout(() => {
        console.log(`🔧 API socket ready to emit events (ID: ${serverSocket?.id})`);
      }, 100);
    });

    serverSocket.on("disconnect", (reason) => {
      console.log(`🔌 Server socket disconnected: ${reason}`);
    });

    serverSocket.on("connect_error", (error) => {
      console.error(`❌ Server socket connection error:`, error.message);
    });

    // Log all events for debugging
    serverSocket.onAny((event, ...args) => {
      console.log(`📡 [API Socket ${serverSocket?.id}] Received event: ${event}`, args);
    });
    
    // Log all emitted events
    const originalEmit = serverSocket.emit.bind(serverSocket);
    serverSocket.emit = function(event: string, ...args: any[]) {
      console.log(`📤 [API Socket ${serverSocket?.id}] Emitting event: ${event}`, args);
      return originalEmit(event, ...args);
    };
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
    const socket = getServerSocket();
    
    // Wait for connection if not connected
    if (!socket.connected) {
      console.log("⏳ Waiting for server socket connection...");
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

    console.log(`📤 API emitting message ${message.id} to socket server for room ${roomId}...`);
    console.log(`📋 Socket ID: ${socket.id}, Connected: ${socket.connected}`);
    console.log(`📋 Payload ID: ${payload.id} (should match message.id: ${message.id})`);
    console.log(`📋 Full payload:`, JSON.stringify(payload, null, 2));
    
    // Log before emitting
    logApiBroadcast(message.id, roomId, message.senderId, socket.connected, socket.id);
    
    // Emit with acknowledgment and error handling
    socket.emit("send-message", payload, (response) => {
      if (response) {
        console.log(`✅ Server acknowledged message ${message.id}:`, response);
      } else {
        console.log(`⚠️ Server did NOT acknowledge message ${message.id} (this is normal if server doesn't send ack)`);
      }
    });
    
    // Also listen for any errors
    socket.once("error", (error) => {
      console.error(`❌ Socket error when emitting message ${message.id}:`, error);
    });
    
    console.log(`✅ API emitted message ${message.id} to socket server`);
  } catch (error) {
    logError('API_BROADCAST', message.id, roomId, error instanceof Error ? error : String(error), {
      senderId: message.senderId,
    });
    console.error("❌ Failed to broadcast message via socket:", error);
    throw error;
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

