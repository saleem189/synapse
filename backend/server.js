// ================================
// Socket.io Standalone Server
// ================================
// Handles real-time messaging for the chat application
// Run with: npm run server

const { Server } = require("socket.io");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { logger } = require("./logger");
const { RateLimiterMemory } = require("rate-limiter-flexible");
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");
require('dotenv').config();

// Message flow logger helper functions
const LOG_FILE = path.join(process.cwd(), 'message-flow.log');

function writeLog(entry) {
  try {
    const logLine = JSON.stringify({
      ...entry,
      timestamp: new Date().toISOString(),
    }) + '\n';
    fs.appendFileSync(LOG_FILE, logLine, 'utf8');

    // Also log to console (using logger)
    const emoji = {
      'API_RECEIVE': '📥',
      'API_BROADCAST': '📤',
      'SOCKET_RECEIVE': '🔌',
      'SOCKET_BROADCAST': '📡',
      'CLIENT_RECEIVE': '📨',
      'SOCKET_CONNECT': '🔗',
      'SOCKET_DISCONNECT': '🔌',
      'ROOM_JOIN': '📥',
      'ROOM_LEAVE': '📤',
      'ERROR': '❌',
    }[entry.stage] || '📋';

    logger.log(`${emoji} [${entry.stage}] ${entry.messageId || entry.socketId || 'N/A'} | Room: ${entry.roomId || 'N/A'} | ${JSON.stringify(entry.details)}`);
  } catch (error) {
    // Use logger.error for critical errors (always logs)
    logger.error('Failed to write to log file:', error);
  }
}

const PORT = process.env.SOCKET_PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || "development";
console.log(NODE_ENV)

// CORS configuration - more secure for production
const getCorsOrigins = () => {
  if (NODE_ENV === "production") {
    // In production, only allow the configured URL
    const productionUrl = process.env.NEXT_PUBLIC_URL;
    if (!productionUrl) {
      logger.warn("⚠️ NEXT_PUBLIC_URL not set in production!");
    }
    return productionUrl ? [productionUrl] : [];
  } else {
    // In development, allow localhost
    return ["http://localhost:3000", "http://127.0.0.1:3000"];
  }
};

const CORS_ORIGINS = getCorsOrigins();

// Create HTTP server
const httpServer = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", connections: io.engine.clientsCount }));
    return;
  }
  res.writeHead(404);
  res.end();
});

// Create Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGINS.length > 0 ? CORS_ORIGINS : ["http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
    // Additional security headers
    allowedHeaders: ["Content-Type", "Authorization"],
  },
});

// =====================
// REDIS ADAPTER (Optional - for horizontal scaling)
// =====================
// If Redis is configured, use it for multi-server support
// Otherwise, fall back to in-memory adapter (single server)
const REDIS_URL = process.env.REDIS_URL || process.env.REDISCLOUD_URL;

let redisAdapterInitialized = false;

async function initializeRedisAdapter() {
  if (!REDIS_URL) {
    logger.log("ℹ️  Redis not configured - using in-memory adapter (single server mode)");
    logger.log("   To enable multi-server support, set REDIS_URL environment variable");
    return false;
  }

  try {
    logger.log("🔌 Connecting to Redis for Socket.IO adapter...");

    // Create Redis clients
    const pubClient = createClient({
      url: REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error("❌ Redis connection failed after 10 retries");
            return new Error("Redis connection failed");
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    const subClient = pubClient.duplicate();

    // Handle connection errors
    pubClient.on("error", (err) => {
      logger.error("❌ Redis pub client error:", err);
    });

    subClient.on("error", (err) => {
      logger.error("❌ Redis sub client error:", err);
    });

    // Connect both clients
    await Promise.all([pubClient.connect(), subClient.connect()]);

    // Set up adapter
    io.adapter(createAdapter(pubClient, subClient));

    redisAdapterInitialized = true;
    logger.log("✅ Redis adapter initialized - multi-server support enabled");

    return true;
  } catch (error) {
    logger.error("❌ Failed to initialize Redis adapter:", error);
    logger.warn("⚠️  Falling back to in-memory adapter (single server mode)");
    return false;
  }
}

// =====================
// RATE LIMITING
// =====================
// Rate limiters for Socket.IO events to prevent abuse and DoS attacks

// Message rate limiter: 10 messages per second per user
const messageRateLimiter = new RateLimiterMemory({
  points: 10, // 10 messages
  duration: 1, // per second
  blockDuration: 60, // Block for 60 seconds if limit exceeded
});

// Typing rate limiter: 5 typing events per second per user
const typingRateLimiter = new RateLimiterMemory({
  points: 5, // 5 events
  duration: 1, // per second
});

// Message update rate limiter: 5 updates per second per user
const messageUpdateRateLimiter = new RateLimiterMemory({
  points: 5, // 5 updates
  duration: 1, // per second
});

// Read receipt rate limiter: 10 read receipts per second per user
const readReceiptRateLimiter = new RateLimiterMemory({
  points: 10, // 10 read receipts
  duration: 1, // per second
});

// Helper function to apply rate limiting
async function applyRateLimit(rateLimiter, identifier, eventName) {
  try {
    await rateLimiter.consume(identifier);
    return { allowed: true };
  } catch (rejRes) {
    logger.warn(`⚠️ Rate limit exceeded for ${eventName} by user/socket: ${identifier}`);
    return {
      allowed: false,
      retryAfter: Math.round(rejRes.msBeforeNext / 1000) || 1
    };
  }
}

// Track online users
const onlineUsers = new Map(); // userId -> Set<socketId>
const socketToUser = new Map(); // socketId -> userId
const socketLastRequest = new Map(); // socketId -> timestamp (for debouncing get-online-users)

// Track active calls: Map<callId, { roomId, participants, callType, startedAt, initiatorId, dbCallSessionId }>
const activeCalls = new Map();

function getOnlineUserIds() {
  return Array.from(onlineUsers.keys());
}

function addOnlineUser(userId, socketId) {
  const wasAlreadyOnline = onlineUsers.has(userId);

  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socketId);
  socketToUser.set(socketId, userId);

  // Only emit user-online if this is a NEW user coming online (not just another tab/connection)
  if (!wasAlreadyOnline) {
    io.emit("user-online", userId);
  }
}

function removeOnlineUser(socketId) {
  const userId = socketToUser.get(socketId);
  if (userId) {
    const sockets = onlineUsers.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        onlineUsers.delete(userId);
        io.emit("user-offline", userId);
      }
    }
    socketToUser.delete(socketId);
  }
}

// =====================
// AUTHENTICATION MIDDLEWARE
// =====================
// Authenticate socket connections before allowing access
// CRITICAL FIX: Proper authentication with database verification

// Import Prisma client for database verification
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;

  logger.log(`🔐 [Auth] Authenticating socket ${socket.id}...`);
  logger.log(`📋 Token provided: ${token ? 'Yes' : 'No'}`);

  if (!token) {
    logger.warn(`❌ [Auth] No token provided, rejecting connection`);
    return next(new Error('Authentication token required'));
  }

  try {
    // Validate token format (CUID format used by Prisma)
    if (typeof token !== 'string' || token.length === 0) {
      logger.warn(`❌ [Auth] Invalid token format, rejecting connection`);
      return next(new Error('Invalid authentication token'));
    }

    // Check if it's a valid CUID format
    // CUID format: starts with 'c' followed by 24 alphanumeric characters
    if (!/^c[a-z0-9]{24}$/.test(token)) {
      logger.warn(`❌ [Auth] Invalid token format (not CUID), rejecting connection`);
      return next(new Error('Invalid authentication token format'));
    }

    // Verify user exists in database and is active
    const user = await prisma.user.findUnique({
      where: { id: token },
      select: {
        id: true,
        name: true,
        avatar: true,
        status: true,
        role: true,
      },
    });

    if (!user) {
      logger.warn(`❌ [Auth] User not found in database, rejecting connection`);
      return next(new Error('User not found'));
    }

    // Check if user is banned or inactive
    if (user.status === 'banned') {
      logger.warn(`❌ [Auth] User account is banned, rejecting connection`);
      return next(new Error('User account is banned'));
    }

    // Store user ID, name, avatar, and role on socket for later use
    socket.userId = user.id;
    socket.userName = user.name;
    socket.userAvatar = user.avatar;
    socket.userRole = user.role;
    logger.log(`✅ [Auth] Socket ${socket.id} authenticated as user ${user.id} (${user.name}, ${user.role})`);
    next();
  } catch (error) {
    logger.error(`❌ [Auth] Authentication error:`, error);
    return next(new Error('Authentication failed'));
  }
});

// Socket connection handler
io.on("connection", (socket) => {
  logger.log(`\n========== NEW SOCKET CONNECTION ==========`);
  logger.log(`✅ Socket ID: ${socket.id}`);
  logger.log(`👤 User ID: ${socket.userId || 'N/A (API socket)'}`);
  logger.log(`📋 Address: ${socket.handshake.address}`);
  logger.log(`📋 Origin: ${socket.handshake.headers.origin || 'N/A'}`);
  logger.log(`📋 User-Agent: ${socket.handshake.headers['user-agent'] || 'N/A'}`);
  logger.log(`==========================================\n`);

  // Log socket connection
  writeLog({
    stage: 'SOCKET_CONNECT',
    socketId: socket.id,
    details: {
      action: 'Socket connected',
      address: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'] || 'N/A',
      origin: socket.handshake.headers.origin || 'N/A',
    },
  });

  // CRITICAL: Set up onAny handler IMMEDIATELY and synchronously
  // This must be done before any other async operations
  logger.log(`🔧 [Socket ${socket.id}] Setting up event handlers NOW...`);
  logger.log(`🔧 [Socket ${socket.id}] Socket object:`, {
    id: socket.id,
    connected: socket.connected,
    disconnected: socket.disconnected,
    rooms: Array.from(socket.rooms),
  });

  // Debug: Log all events from this socket to both console and file
  // IMPORTANT: Set this up FIRST before any other handlers to catch all events
  socket.onAny((event, ...args) => {
    const eventData = args.length > 0 ? args[0] : null;
    const logMessage = `📡 [Socket ${socket.id}] Event: ${event}`;
    logger.log(logMessage, eventData ? JSON.stringify(eventData, null, 2) : '');

    // Special handling for send-message to catch it early
    if (event === 'send-message') {
      logger.log(`\n🚨 [onAny] Caught "send-message" event from socket ${socket.id}`);
      logger.log(`📋 Event data:`, JSON.stringify(eventData, null, 2));
    }

    // Log ALL events to file for complete flow tracking
    let stage = 'SOCKET_CONNECT';
    if (event === 'send-message') {
      stage = 'SOCKET_RECEIVE';
    } else if (event === 'user-connect') {
      stage = 'SOCKET_CONNECT';
    } else if (event === 'join-room') {
      stage = 'ROOM_JOIN';
    } else if (event === 'leave-room') {
      stage = 'ROOM_LEAVE';
    } else if (event === 'disconnect') {
      stage = 'SOCKET_DISCONNECT';
    }

    writeLog({
      stage: stage,
      socketId: socket.id,
      messageId: eventData?.id || eventData?.messageId,
      roomId: eventData?.roomId,
      senderId: eventData?.senderId || eventData?.userId,
      details: {
        action: `Socket event: ${event}`,
        eventData: eventData ? (typeof eventData === 'object' ? JSON.stringify(eventData) : String(eventData)) : null,
      },
    });
  });

  logger.log(`🔧 [Socket ${socket.id}] Event handlers set up, listening for all events...`);
  logger.log(`🔧 [Socket ${socket.id}] onAny handler registered, will catch ALL events including "send-message"`);
  logger.log(`🔧 [Socket ${socket.id}] Ready to receive events. Socket connected: ${socket.connected}`);

  // User connects
  socket.on("user-connect", (userId) => {
    if (!userId) return;
    logger.log(`👤 User ${userId} connected (socket: ${socket.id})`);
    addOnlineUser(userId, socket.id);
    socket.userId = userId;

    // Log user connection to file
    writeLog({
      stage: 'SOCKET_CONNECT',
      socketId: socket.id,
      senderId: userId,
      details: {
        action: 'User connected',
        userId: userId,
      },
    });
  });

  // Get online users (with debouncing to prevent loops)
  const ONLINE_USERS_DEBOUNCE_MS = 1000; // 1 second debounce

  socket.on("get-online-users", () => {
    const now = Date.now();
    const lastRequest = socketLastRequest.get(socket.id) || 0;

    // Debounce: only respond if last request was more than 1 second ago
    if (now - lastRequest < ONLINE_USERS_DEBOUNCE_MS) {
      return;
    }
    socketLastRequest.set(socket.id, now);

    const users = getOnlineUserIds();
    logger.log(`📋 Sending online users:`, users);
    socket.emit("online-users", users);
  });

  // Join room
  socket.on("join-room", (roomId) => {
    if (!roomId) return;
    socket.join(roomId);
    logger.log(`📥 Socket ${socket.id} joined room: ${roomId}`);

    // Log room join
    writeLog({
      stage: 'ROOM_JOIN',
      socketId: socket.id,
      roomId: roomId,
      details: {
        action: 'Socket joined room',
        userId: socket.userId || 'unknown',
      },
    });
  });

  // Leave room
  socket.on("leave-room", (roomId) => {
    if (!roomId) return;
    socket.leave(roomId);
    logger.log(`📤 Socket ${socket.id} left room: ${roomId}`);

    // Log room leave
    writeLog({
      stage: 'ROOM_LEAVE',
      socketId: socket.id,
      roomId: roomId,
      details: {
        action: 'Socket left room',
        userId: socket.userId || 'unknown',
      },
    });
  });

  // =====================
  // MESSAGE HANDLING
  // =====================
  socket.on("send-message", async (message, callback) => {
    // Skip rate limiting for API server socket (no userId)
    const isFromAPI = !socket.userId;
    const rateLimitIdentifier = socket.userId || socket.id;

    if (!isFromAPI) {
      // Apply rate limiting for client messages
      const rateLimit = await applyRateLimit(messageRateLimiter, rateLimitIdentifier, 'send-message');
      if (!rateLimit.allowed) {
        logger.warn(`🚫 Rate limit exceeded for send-message by ${rateLimitIdentifier}`);
        if (typeof callback === 'function') {
          callback({
            error: 'Rate limit exceeded. Please slow down.',
            retryAfter: rateLimit.retryAfter
          });
        }
        return;
      }
    }

    // Log socket receive IMMEDIATELY - this should be caught by onAny() too
    logger.log(`\n🔔 [SOCKET SERVER] Received "send-message" event from socket ${socket.id}`);
    logger.log(`📋 Message data:`, JSON.stringify(message, null, 2));
    logger.log(`📋 Callback provided: ${typeof callback === 'function'}`);
    logger.log(`📋 Socket still connected: ${socket.connected}`);
    logger.log(`📋 Socket userId: ${socket.userId || 'NONE (API socket)'}`);
    logger.log(`📋 Is from API: ${isFromAPI}`);

    writeLog({
      stage: 'SOCKET_RECEIVE',
      messageId: message?.id || 'unknown',
      roomId: message?.roomId,
      senderId: message?.senderId,
      socketId: socket.id,
      details: {
        action: 'Socket server received message',
        isFromAPI: isFromAPI,
        content: message?.content ? message.content.substring(0, 50) : 'media',
        hasCallback: typeof callback === 'function',
      },
    });

    logger.log(`\n========== MESSAGE RECEIVED ==========`);
    logger.log(`From socket: ${socket.id}`);
    logger.log(`Message:`, JSON.stringify(message, null, 2));

    // Validate message has either content or file
    if (!message?.roomId || (!message?.content && !message?.fileUrl)) {
      logger.warn(`❌ Invalid message - missing roomId, content, or file`);

      // Log error
      writeLog({
        stage: 'ERROR',
        messageId: message?.id || 'unknown',
        roomId: message?.roomId,
        details: {
          action: 'Invalid message received',
          error: 'Missing roomId, content, or file',
          socketId: socket.id,
        },
      });
      if (typeof callback === 'function') {
        callback({ error: 'Invalid message: missing required fields' });
      }
      return;
    }

    // Ensure replyTo is properly structured
    const replyToData = message.replyTo ? {
      id: message.replyTo.id,
      content: message.replyTo.content || "Media",
      senderName: message.replyTo.senderName,
      senderAvatar: message.replyTo.senderAvatar || null,
    } : null;

    // Use the message ID from the payload - API provides real DB ID, client provides temp ID
    // IMPORTANT: Always use the ID from the message payload to ensure proper matching
    const messageId = message.id; // Use the ID from the payload (real DB ID from API or temp ID from client)

    if (!messageId) {
      logger.error(`❌ Message missing ID!`, message);
      return;
    }

    const payload = {
      id: messageId, // Use the exact ID from the message payload
      content: message.content || "",
      senderId: message.senderId,
      senderName: message.senderName,
      roomId: message.roomId,
      type: message.type || "text",
      fileUrl: message.fileUrl || null,
      fileName: message.fileName || null,
      fileSize: message.fileSize || null,
      fileType: message.fileType || null,
      replyToId: message.replyToId || null,
      replyTo: replyToData,
      createdAt: message.createdAt || new Date().toISOString(),
    };

    logger.log(`📤 Broadcasting to room ${message.roomId}...`);
    logger.log(`📋 Message ID: ${messageId} (${message.id ? 'from API' : 'temp'})`);
    logger.log(`📋 Reply data:`, JSON.stringify(replyToData, null, 2));

    // Get room size for logging
    const room = io.sockets.adapter.rooms.get(message.roomId);
    const clientCount = room ? room.size : 0;

    if (isFromAPI) {
      // If from API, broadcast to ALL users in the room (including sender's other tabs)
      // Use io.to() to broadcast from the server, not from the socket
      io.to(message.roomId).emit("receive-message", payload);
      logger.log(`✅ API message broadcast complete to room ${message.roomId} (all users, ${clientCount} clients)`);

      // Log broadcast to file
      writeLog({
        stage: 'SOCKET_BROADCAST',
        messageId: messageId,
        roomId: message.roomId,
        senderId: message.senderId,
        socketId: socket.id,
        details: {
          action: 'Socket server broadcasting to clients',
          broadcastType: 'all',
          clientCount: clientCount,
          payload: JSON.stringify(payload),
        },
      });
    } else {
      // If from client, broadcast to all users EXCEPT the sender
      // The sender will receive the message via API response
      socket.to(message.roomId).emit("receive-message", payload);
      logger.log(`✅ Client message broadcast complete to room ${message.roomId} (excluding sender ${socket.userId}, ${clientCount - 1} clients)`);

      // Log broadcast to file
      writeLog({
        stage: 'SOCKET_BROADCAST',
        messageId: messageId,
        roomId: message.roomId,
        senderId: message.senderId,
        socketId: socket.id,
        details: {
          action: 'Socket server broadcasting to clients',
          broadcastType: 'except-sender',
          clientCount: clientCount - 1,
          payload: JSON.stringify(payload),
        },
      });
    }
    logger.log(`==========================================\n`);

    // Send success callback if provided
    if (typeof callback === 'function') {
      callback({ success: true });
    }
  });

  // Typing indicators
  socket.on("typing", async ({ roomId, userId, userName }) => {
    if (!roomId) return;

    // Apply rate limiting
    const rateLimitIdentifier = userId || socket.id;
    const rateLimit = await applyRateLimit(typingRateLimiter, rateLimitIdentifier, 'typing');
    if (!rateLimit.allowed) {
      // Silently ignore typing rate limits (don't spam logs)
      return;
    }

    logger.log(`⌨️ ${userName} is typing in ${roomId}`);
    socket.to(roomId).emit("user-typing", { roomId, userId, userName });
  });

  socket.on("stop-typing", async ({ roomId, userId }) => {
    if (!roomId) return;

    // Apply rate limiting
    const rateLimitIdentifier = userId || socket.id;
    const rateLimit = await applyRateLimit(typingRateLimiter, rateLimitIdentifier, 'stop-typing');
    if (!rateLimit.allowed) {
      // Silently ignore typing rate limits
      return;
    }

    socket.to(roomId).emit("user-stop-typing", { roomId, userId });
  });

  // Message updated (edit)
  socket.on("message-updated", async ({ messageId, content, roomId }) => {
    if (!messageId || !roomId) return;

    // Apply rate limiting
    const rateLimitIdentifier = socket.userId || socket.id;
    const rateLimit = await applyRateLimit(messageUpdateRateLimiter, rateLimitIdentifier, 'message-updated');
    if (!rateLimit.allowed) {
      logger.warn(`🚫 Rate limit exceeded for message-updated by ${rateLimitIdentifier}`);
      return;
    }

    logger.log(`✏️ Message ${messageId} updated in room ${roomId}`);
    io.to(roomId).emit("message-updated", {
      messageId,
      content,
      roomId,
      updatedAt: new Date().toISOString(),
    });
  });

  // Message deleted
  socket.on("message-deleted", async ({ messageId, roomId }) => {
    if (!messageId || !roomId) return;

    // Apply rate limiting
    const rateLimitIdentifier = socket.userId || socket.id;
    const rateLimit = await applyRateLimit(messageUpdateRateLimiter, rateLimitIdentifier, 'message-deleted');
    if (!rateLimit.allowed) {
      logger.warn(`🚫 Rate limit exceeded for message-deleted by ${rateLimitIdentifier}`);
      return;
    }

    logger.log(`🗑️ Message ${messageId} deleted in room ${roomId}`);
    io.to(roomId).emit("message-deleted", {
      messageId,
      roomId,
    });
  });

  // Reaction added/removed
  socket.on("reaction-updated", ({ messageId, roomId, reactions }) => {
    if (!messageId || !roomId) return;
    logger.log(`😀 Reaction updated for message ${messageId} in room ${roomId}`);
    io.to(roomId).emit("reaction-updated", {
      messageId,
      roomId,
      reactions,
    });
  });

  // Message read receipt
  socket.on("message-read", async ({ messageId, userId, roomId }) => {
    if (!messageId || !userId || !roomId) return;

    // Apply rate limiting
    const rateLimitIdentifier = userId || socket.id;
    const rateLimit = await applyRateLimit(readReceiptRateLimiter, rateLimitIdentifier, 'message-read');
    if (!rateLimit.allowed) {
      // Silently ignore read receipt rate limits (don't spam logs)
      return;
    }

    logger.log(`👁️ Message ${messageId} read by user ${userId} in room ${roomId}`);
    // Broadcast to all users in the room (so sender sees the read receipt)
    io.to(roomId).emit("message-read-update", {
      messageId,
      userId,
      roomId,
      readAt: new Date().toISOString(),
    });
  });

  // Message delivered receipt
  socket.on("message-delivered", async ({ messageId, roomId }) => {
    if (!messageId || !roomId) return;

    // Apply rate limiting
    const rateLimitIdentifier = socket.userId || socket.id;
    const rateLimit = await applyRateLimit(readReceiptRateLimiter, rateLimitIdentifier, 'message-delivered');
    if (!rateLimit.allowed) {
      // Silently ignore delivery receipt rate limits
      return;
    }

    logger.log(`📬 Message ${messageId} delivered in room ${roomId}`);
    // Broadcast to all users in the room (so sender sees the delivery status)
    io.to(roomId).emit("message-delivered-update", {
      messageId,
      roomId,
    });
  });

  // =====================
  // VIDEO CALL HANDLING
  // =====================
  // Generate unique call ID
  function generateCallId() {
    return `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Call initiate
  socket.on("call-initiate", async ({ roomId, targetUserId, callType }) => {
    if (!roomId || !socket.userId) {
      logger.warn(`❌ Invalid call-initiate: missing roomId or userId`);
      return;
    }

    const callId = generateCallId();
    const callerId = socket.userId;
    const callerName = socket.userName || 'Unknown';
    const callerAvatar = socket.userAvatar || null;

    logger.log(`📞 Call initiated: ${callId} by ${callerId} in room ${roomId} (${callType})`);

    try {
      // Create call session in database
      const dbCallSession = await prisma.callSession.create({
        data: {
          id: callId,
          roomId,
          callType: callType.toUpperCase(), // VIDEO or AUDIO
          status: 'ACTIVE',
          participants: {
            create: {
              userId: callerId,
              hadVideo: callType === 'video',
              wasMuted: false,
            },
          },
        },
      });

      logger.log(`💾 Call session saved to database: ${dbCallSession.id}`);

      // Store call session in memory
      activeCalls.set(callId, {
        roomId,
        callType,
        participants: new Set([callerId]),
        startedAt: new Date(),
        initiatorId: callerId,
        dbCallSessionId: dbCallSession.id,
      });
    } catch (error) {
      logger.error(`❌ Failed to create call session in database:`, error);
      // Continue with in-memory only if database fails
      activeCalls.set(callId, {
        roomId,
        callType,
        participants: new Set([callerId]),
        startedAt: new Date(),
        initiatorId: callerId,
        dbCallSessionId: null,
      });
    }

    // If targetUserId is provided (1-on-1 call), send to specific user
    if (targetUserId) {
      // Find socket for target user
      const targetSocket = Array.from(io.sockets.sockets.values()).find(
        (s) => s.userId === targetUserId && s.connected
      );

      if (targetSocket) {
        targetSocket.emit("incoming-call", {
          callId,
          from: callerId,
          fromName: callerName,
          fromAvatar: callerAvatar,
          roomId,
          callType,
        });
        logger.log(`📞 Incoming call sent to ${targetUserId}`);
      } else {
        logger.warn(`⚠️ Target user ${targetUserId} not found or not connected`);
        // Clean up call
        activeCalls.delete(callId);
      }
    } else {
      // Group call - notify all participants in the room
      const roomParticipants = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
      roomParticipants.forEach((socketId) => {
        const participantSocket = io.sockets.sockets.get(socketId);
        if (participantSocket && participantSocket.userId !== callerId) {
          participantSocket.emit("incoming-call", {
            callId,
            from: callerId,
            fromName: callerName,
            fromAvatar: callerAvatar,
            roomId,
            callType,
          });
        }
      });
      logger.log(`📞 Group call initiated, notified ${roomParticipants.length - 1} participants`);
    }
  });

  // Call accept
  socket.on("call-accept", async ({ callId, roomId }) => {
    if (!callId || !roomId || !socket.userId) {
      logger.warn(`❌ Invalid call-accept: missing callId, roomId, or userId`);
      return;
    }

    const call = activeCalls.get(callId);
    if (!call) {
      logger.warn(`⚠️ Call ${callId} not found`);
      return;
    }

    const participantId = socket.userId;
    call.participants.add(participantId);

    logger.log(`✅ Call accepted: ${callId} by ${participantId}`);

    // Add participant to database
    if (call.dbCallSessionId) {
      try {
        await prisma.callParticipant.create({
          data: {
            callSessionId: call.dbCallSessionId,
            userId: participantId,
            hadVideo: call.callType === 'video',
            wasMuted: false,
          },
        });
        logger.log(`💾 Participant added to database: ${participantId}`);
      } catch (error) {
        // Ignore duplicate participant errors (user already in call)
        if (error.code !== 'P2002') {
          logger.error(`❌ Failed to add participant to database:`, error);
        }
      }
    }

    // Notify all participants that someone joined
    io.to(roomId).emit("call-accepted", {
      callId,
      roomId,
      participantId,
    });

    // Also emit call-joined event
    io.to(roomId).emit("call-joined", {
      callId,
      roomId,
      participantId,
      participantName: socket.userName || 'Unknown',
    });
  });

  // Call reject
  socket.on("call-reject", async ({ callId, roomId }) => {
    if (!callId || !roomId || !socket.userId) {
      return;
    }

    const participantId = socket.userId;
    logger.log(`❌ Call rejected: ${callId} by ${participantId}`);

    const call = activeCalls.get(callId);

    // Update call status to REJECTED in database
    if (call && call.dbCallSessionId) {
      try {
        await prisma.callSession.update({
          where: { id: call.dbCallSessionId },
          data: { status: 'REJECTED' },
        });
        logger.log(`💾 Call status updated to REJECTED in database`);
      } catch (error) {
        logger.error(`❌ Failed to update call status:`, error);
      }
    }

    // Notify all participants
    io.to(roomId).emit("call-rejected", {
      callId,
      roomId,
      participantId,
    });

    // If initiator rejected, clean up call
    if (call && call.initiatorId === participantId) {
      activeCalls.delete(callId);
    }
  });

  // Call end
  socket.on("call-end", async ({ callId, roomId }) => {
    if (!callId || !roomId || !socket.userId) {
      return;
    }

    const endedBy = socket.userId;
    logger.log(`🔚 Call ended: ${callId} by ${endedBy}`);

    const call = activeCalls.get(callId);

    // Update call session in database
    if (call && call.dbCallSessionId) {
      try {
        const startedAt = call.startedAt;
        const endedAt = new Date();
        const duration = Math.floor((endedAt - startedAt) / 1000); // Duration in seconds

        await prisma.callSession.update({
          where: { id: call.dbCallSessionId },
          data: {
            status: 'ENDED',
            endedAt,
            duration,
          },
        });

        // Update all participants' leftAt timestamp
        await prisma.callParticipant.updateMany({
          where: {
            callSessionId: call.dbCallSessionId,
            leftAt: null, // Only update those who haven't left yet
          },
          data: {
            leftAt: endedAt,
          },
        });

        logger.log(`💾 Call session updated in database: ended, duration ${duration}s`);
      } catch (error) {
        logger.error(`❌ Failed to update call session in database:`, error);
      }
    }

    // Notify all participants
    io.to(roomId).emit("call-ended", {
      callId,
      roomId,
      endedBy,
    });

    // Clean up call
    activeCalls.delete(callId);
  });

  // WebRTC signal forwarding
  socket.on("webrtc-signal", ({ to, signal, callId }) => {
    if (!to || !signal || !callId || !socket.userId) {
      return;
    }

    const from = socket.userId;
    logger.log(`📡 WebRTC signal from ${from} to ${to} (call: ${callId})`);

    // Find target socket
    const targetSocket = Array.from(io.sockets.sockets.values()).find(
      (s) => s.userId === to && s.connected
    );

    if (targetSocket) {
      targetSocket.emit("webrtc-signal", {
        from,
        signal,
        callId,
      });
    } else {
      logger.warn(`⚠️ Target user ${to} not found for WebRTC signal`);
    }
  });

  // Call mute/unmute
  socket.on("call-mute", ({ callId, roomId, isMuted }) => {
    if (!callId || !roomId || !socket.userId) {
      return;
    }

    const participantId = socket.userId;
    logger.log(`🔇 Participant ${participantId} ${isMuted ? 'muted' : 'unmuted'} (call: ${callId})`);

    // Broadcast to all participants
    io.to(roomId).emit("call-participant-muted", {
      callId,
      participantId,
      isMuted,
    });
  });

  // Call video toggle
  socket.on("call-video-toggle", ({ callId, roomId, hasVideo }) => {
    if (!callId || !roomId || !socket.userId) {
      return;
    }

    const participantId = socket.userId;
    logger.log(`📹 Participant ${participantId} video ${hasVideo ? 'on' : 'off'} (call: ${callId})`);

    // Broadcast to all participants
    io.to(roomId).emit("call-participant-video-toggled", {
      callId,
      participantId,
      hasVideo,
    });
  });

  // Call screen share
  socket.on("call-screen-share", ({ callId, roomId, isSharing }) => {
    if (!callId || !roomId || !socket.userId) {
      return;
    }

    const participantId = socket.userId;
    logger.log(`🖥️ Participant ${participantId} screen share ${isSharing ? 'started' : 'stopped'} (call: ${callId})`);

    // Broadcast to all participants
    if (isSharing) {
      io.to(roomId).emit("call-screen-share-started", {
        callId,
        participantId,
      });
    } else {
      io.to(roomId).emit("call-screen-share-stopped", {
        callId,
        participantId,
      });
    }
  });

  // Call join (for group calls)
  socket.on("call-join", async ({ callId, roomId }) => {
    if (!callId || !roomId || !socket.userId) {
      return;
    }

    const call = activeCalls.get(callId);
    if (!call) {
      logger.warn(`⚠️ Call ${callId} not found for join`);
      return;
    }

    const participantId = socket.userId;
    call.participants.add(participantId);

    logger.log(`👋 Participant ${participantId} joined call ${callId}`);

    // Add participant to database
    if (call.dbCallSessionId) {
      try {
        await prisma.callParticipant.create({
          data: {
            callSessionId: call.dbCallSessionId,
            userId: participantId,
            hadVideo: call.callType === 'video',
            wasMuted: false,
          },
        });
        logger.log(`💾 Participant added to database: ${participantId}`);
      } catch (error) {
        // Ignore duplicate participant errors (user already in call)
        if (error.code !== 'P2002') {
          logger.error(`❌ Failed to add participant to database:`, error);
        }
      }
    }

    // Notify all participants
    io.to(roomId).emit("call-joined", {
      callId,
      roomId,
      participantId,
      participantName: socket.userName || 'Unknown',
    });
  });

  // Call leave
  socket.on("call-leave", async ({ callId, roomId }) => {
    if (!callId || !roomId || !socket.userId) {
      return;
    }

    const call = activeCalls.get(callId);
    if (call) {
      call.participants.delete(socket.userId);
    }

    const participantId = socket.userId;
    logger.log(`👋 Participant ${participantId} left call ${callId}`);

    // Update participant's leftAt in database
    if (call && call.dbCallSessionId) {
      try {
        await prisma.callParticipant.updateMany({
          where: {
            callSessionId: call.dbCallSessionId,
            userId: participantId,
            leftAt: null, // Only update if not already set
          },
          data: {
            leftAt: new Date(),
          },
        });
        logger.log(`💾 Participant leftAt updated in database: ${participantId}`);
      } catch (error) {
        logger.error(`❌ Failed to update participant in database:`, error);
      }
    }

    // Notify all participants
    io.to(roomId).emit("call-left", {
      callId,
      roomId,
      participantId,
    });

    // If no participants left, clean up call and update database
    if (call && call.participants.size === 0) {
      if (call.dbCallSessionId) {
        try {
          const startedAt = call.startedAt;
          const endedAt = new Date();
          const duration = Math.floor((endedAt - startedAt) / 1000);

          await prisma.callSession.update({
            where: { id: call.dbCallSessionId },
            data: {
              status: 'ENDED',
              endedAt,
              duration,
            },
          });
          logger.log(`💾 Call session ended in database (no participants left)`);
        } catch (error) {
          logger.error(`❌ Failed to update call session:`, error);
        }
      }
      activeCalls.delete(callId);
      logger.log(`🧹 Cleaned up empty call ${callId}`);
    }
  });

  // Disconnect
  const handleDisconnect = async (reason) => {
    logger.log(`❌ Disconnected: ${socket.id} (${reason})`);
    removeOnlineUser(socket.id);
    socketLastRequest.delete(socket.id); // Clean up debounce tracking

    // Clean up any calls the user was in
    if (socket.userId) {
      // Use for...of loop to properly await async operations
      for (const [callId, call] of activeCalls.entries()) {
        if (call.participants.has(socket.userId)) {
          call.participants.delete(socket.userId);

          // Update participant's leftAt in database
          if (call.dbCallSessionId) {
            try {
              await prisma.callParticipant.updateMany({
                where: {
                  callSessionId: call.dbCallSessionId,
                  userId: socket.userId,
                  leftAt: null,
                },
                data: {
                  leftAt: new Date(),
                },
              });
            } catch (error) {
              logger.error(`❌ Failed to update participant on disconnect:`, error);
            }
          }

          // Notify others
          io.to(call.roomId).emit("call-left", {
            callId,
            roomId: call.roomId,
            participantId: socket.userId,
          });

          // Clean up if empty
          if (call.participants.size === 0) {
            if (call.dbCallSessionId) {
              try {
                const startedAt = call.startedAt;
                const endedAt = new Date();
                const duration = Math.floor((endedAt - startedAt) / 1000);

                await prisma.callSession.update({
                  where: { id: call.dbCallSessionId },
                  data: {
                    status: 'ENDED',
                    endedAt,
                    duration,
                  },
                });
              } catch (error) {
                logger.error(`❌ Failed to update call session on disconnect:`, error);
              }
            }
            activeCalls.delete(callId);
          }
        }
      }
    }

    // Log socket disconnect
    writeLog({
      stage: 'SOCKET_DISCONNECT',
      socketId: socket.id,
      details: {
        action: 'Socket disconnected',
        reason: reason,
        userId: socket.userId || 'unknown',
      },
    });

    // =====================
    // CLEANUP: Remove ALL event listeners to prevent memory leaks
    // =====================
    // This is critical for preventing memory leaks when sockets disconnect
    // Socket.io keeps references to event handlers until explicitly removed
    logger.log(`🧹 Cleaning up event listeners for socket ${socket.id}`);
    
    // Note: We can't remove inline anonymous functions, but socket.removeAllListeners()
    // will remove all event listeners for this socket
    socket.removeAllListeners();
    
    logger.log(`✅ All event listeners cleaned up for socket ${socket.id}`);
  };

  socket.on("disconnect", handleDisconnect);
});

// Start server with Redis adapter initialization
async function startServer() {
  // Initialize Redis adapter (if configured)
  await initializeRedisAdapter();

  // Start HTTP server
  httpServer.listen(PORT, () => {
    logger.log(`
╔════════════════════════════════════════╗
║  🚀 Synapse Socket Server              ║
║  Running on http://localhost:${PORT}      ║
║  CORS Origins: ${CORS_ORIGINS.join(', ')}
║  Environment: ${NODE_ENV}
║  Redis Adapter: ${redisAdapterInitialized ? '✅ Enabled' : '❌ Disabled (in-memory)'}
╚════════════════════════════════════════╝
    `);
  });
}

// Start the server
startServer().catch((error) => {
  logger.error("❌ Failed to start server:", error);
  process.exit(1);
});

// Graceful shutdown
// Increase max listeners to prevent warnings
if (process.setMaxListeners) {
  process.setMaxListeners(15);
}

process.on("SIGTERM", () => httpServer.close(() => process.exit(0)));
process.on("SIGINT", () => httpServer.close(() => process.exit(0)));
