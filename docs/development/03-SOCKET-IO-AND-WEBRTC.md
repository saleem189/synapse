# 🔌 Socket.io & WebRTC Guide

**Real-time communication in Synapse**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Socket.io Architecture](#socketio-architecture)
3. [Socket.io Events](#socketio-events)
4. [Memory Management](#memory-management)
5. [WebRTC Architecture](#webrtc-architecture)
6. [Call Flow](#call-flow)
7. [Client Integration](#client-integration)
8. [Troubleshooting](#troubleshooting)

---

## Overview

Synapse uses two real-time technologies:

| Technology | Purpose | Use Cases |
|------------|---------|-----------|
| **Socket.io** | Bidirectional messaging | Chat messages, typing indicators, user presence, WebRTC signaling |
| **WebRTC** | Peer-to-peer media | Video/audio calls, screen sharing |

**Key Insight:** Socket.io handles signaling for WebRTC, but media flows peer-to-peer!

---

## Socket.io Architecture

### Standalone Server

**Why Standalone?**
- ✅ Better control over WebSocket connections
- ✅ Independent scaling
- ✅ Easier memory management
- ✅ Can restart without affecting Next.js app

**Location:** `backend/server.js`

**Port:** 3001 (configurable via `SOCKET_PORT`)

### Server Structure

```
backend/server.js
├── HTTP Server (health check)
├── Socket.io Server
│   ├── CORS Configuration
│   ├── Redis Adapter (optional - for scaling)
│   ├── Rate Limiting
│   ├── Connection Handling
│   ├── Event Handlers
│   │   ├── Chat Events (message:send, typing:start, etc.)
│   │   ├── Room Events (room:join, room:leave)
│   │   ├── Call Events (call-initiate, call-accept, etc.)
│   │   └── WebRTC Signaling (webrtc-signal)
│   └── Disconnect Handling (⚠️ CRITICAL FOR MEMORY!)
```

---

### Connection Flow

```
Client Browser
  ↓
1. Connect to Socket.io server
   socket = io('http://localhost:3001')
  ↓
2. Authenticate via handshake
   socket.emit('authenticate', { token: session.token })
  ↓
3. Server validates token
   const session = await validateToken(data.token);
  ↓
4. Server stores user-socket mapping
   connectedUsers.set(userId, socket.id);
  ↓
5. Join user's personal room
   socket.join(`user:${userId}`);
  ↓
6. Join user's chat rooms
   rooms.forEach(room => socket.join(`room:${room.id}`));
  ↓
7. Ready for real-time events! ✅
```

---

## Socket.io Events

### Chat Events

#### Send Message

**Client → Server:**
```typescript
socket.emit('message:send', {
  roomId: 'room_123',
  content: 'Hello!',
  attachments: []
});
```

**Server → All Clients in Room:**
```typescript
io.to(roomId).emit('message:new', {
  id: 'msg_456',
  content: 'Hello!',
  userId: 'user_789',
  roomId: 'room_123',
  createdAt: '2025-12-12T19:00:00.000Z',
  user: {
    id: 'user_789',
    name: 'John Doe',
    image: '/avatar.png'
  }
});
```

---

#### Typing Indicator

**Client → Server:**
```typescript
// Start typing
socket.emit('typing:start', { roomId: 'room_123' });

// Stop typing (after 3 seconds of inactivity)
socket.emit('typing:stop', { roomId: 'room_123' });
```

**Server → Other Clients in Room:**
```typescript
socket.to(roomId).emit('user:typing', {
  userId: 'user_789',
  userName: 'John Doe',
  roomId: 'room_123'
});

socket.to(roomId).emit('user:stop-typing', {
  userId: 'user_789',
  roomId: 'room_123'
});
```

---

#### Message Reactions

**Client → Server:**
```typescript
socket.emit('message:react', {
  messageId: 'msg_456',
  roomId: 'room_123',
  emoji: '👍'
});
```

**Server → All Clients:**
```typescript
io.to(roomId).emit('message:reaction-added', {
  messageId: 'msg_456',
  userId: 'user_789',
  emoji: '👍',
  timestamp: '2025-12-12T19:00:00.000Z'
});
```

---

### Room Events

#### Join Room

**Client → Server:**
```typescript
socket.emit('room:join', { roomId: 'room_123' });
```

**Server Actions:**
```javascript
// 1. Add socket to room
socket.join(`room:${roomId}`);

// 2. Notify other users
socket.to(roomId).emit('user:joined-room', {
  userId: socket.userId,
  userName: socket.userName,
  roomId: roomId
});
```

---

#### Leave Room

**Client → Server:**
```typescript
socket.emit('room:leave', { roomId: 'room_123' });
```

**Server Actions:**
```javascript
// 1. Remove socket from room
socket.leave(`room:${roomId}`);

// 2. Notify other users
socket.to(roomId).emit('user:left-room', {
  userId: socket.userId,
  userName: socket.userName,
  roomId: roomId
});
```

---

### Call Events

#### Initiate Call

**Client → Server:**
```typescript
socket.emit('call-initiate', {
  callId: 'call_123',
  roomId: 'room_456',
  participants: ['user_789'],
  type: 'video' // or 'audio'
});
```

**Server → Target Users:**
```typescript
participants.forEach(userId => {
  io.to(`user:${userId}`).emit('call-incoming', {
    callId: 'call_123',
    roomId: 'room_456',
    from: 'user_123',
    fromName: 'John Doe',
    type: 'video'
  });
});
```

---

#### Accept Call

**Client → Server:**
```typescript
socket.emit('call-accept', {
  callId: 'call_123'
});
```

**Server → Caller:**
```typescript
io.to(`user:${callerId}`).emit('call-accepted', {
  callId: 'call_123',
  by: 'user_789',
  byName: 'Jane Smith'
});
```

---

#### WebRTC Signaling

**Client A → Server → Client B:**
```typescript
// Client A: Send signal (offer/answer/ICE candidate)
socket.emit('webrtc-signal', {
  to: 'user_789',
  callId: 'call_123',
  signal: { /* WebRTC signal data */ }
});

// Server: Forward to Client B
io.to(`user:${data.to}`).emit('webrtc-signal', {
  from: socket.userId,
  callId: data.callId,
  signal: data.signal
});
```

---

#### End Call

**Client → Server:**
```typescript
socket.emit('call-end', {
  callId: 'call_123'
});
```

**Server → All Participants:**
```typescript
io.to(`call:${callId}`).emit('call-ended', {
  callId: 'call_123',
  endedBy: 'user_123',
  reason: 'user-ended'
});
```

---

## Memory Management

### ⚠️ CRITICAL: Event Listener Cleanup

**THE PROBLEM:**
Socket.io keeps references to ALL event listeners until explicitly removed. If you don't clean up, **memory leaks WILL occur!**

**Location:** `backend/server.js` (lines 1263-1274)

```javascript
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
```

### Why This Matters

```javascript
// Each socket registers ~24 event listeners:
socket.on('authenticate', handler);        // 1
socket.on('message:send', handler);        // 2
socket.on('typing:start', handler);        // 3
socket.on('typing:stop', handler);         // 4
socket.on('message:react', handler);       // 5
socket.on('room:join', handler);           // 6
socket.on('room:leave', handler);          // 7
socket.on('call-initiate', handler);       // 8
socket.on('call-accept', handler);         // 9
socket.on('call-reject', handler);         // 10
socket.on('call-end', handler);            // 11
socket.on('webrtc-signal', handler);       // 12
socket.on('call-mute', handler);           // 13
socket.on('call-unmute', handler);         // 14
socket.on('call-video-on', handler);       // 15
socket.on('call-video-off', handler);      // 16
socket.on('call-screen-share-start', handler); // 17
socket.on('call-screen-share-stop', handler);  // 18
socket.on('presence:update', handler);     // 19
socket.on('disconnect', handler);          // 20
// ... more ...

// If 100 users connect/disconnect without cleanup:
// 100 users × 24 listeners = 2,400 listeners in memory! 💥
// With cleanup: 0 old listeners in memory ✅
```

---

### Disconnect Handler

**Full Implementation:**

```javascript
async function handleDisconnect(socket) {
  const userId = socket.userId;
  const userName = socket.userName || 'Anonymous';

  logger.log(`👋 User disconnected: ${userName} (${socket.id})`);

  try {
    // 1. Remove from connected users map
    if (userId) {
      connectedUsers.delete(userId);
      userSockets.delete(userId);
    }

    // 2. Remove from active calls
    socket.rooms.forEach((room) => {
      if (room.startsWith('call:')) {
        const callId = room.replace('call:', '');
        // Notify other participants
        socket.to(room).emit('call-participant-left', {
          callId,
          userId,
          userName,
        });
      }
    });

    // 3. Update user presence
    if (userId) {
      io.emit('user:offline', { userId });
    }

    // 4. Log active connections
    logger.log(`Active connections: ${io.engine.clientsCount}`);

    // =====================
    // CLEANUP: Remove ALL event listeners to prevent memory leaks
    // =====================
    logger.log(`🧹 Cleaning up event listeners for socket ${socket.id}`);
    socket.removeAllListeners(); // ⚠️ CRITICAL!
    logger.log(`✅ All event listeners cleaned up for socket ${socket.id}`);

  } catch (error) {
    logger.error('Error in disconnect handler:', error);
  }
}

// Register disconnect handler
socket.on('disconnect', () => handleDisconnect(socket));
```

---

## WebRTC Architecture

### What is WebRTC?

**WebRTC** = Web Real-Time Communication

**Key Features:**
- ✅ Peer-to-peer (P2P) media streaming
- ✅ Low latency (~100ms)
- ✅ Built into browsers (no plugins!)
- ✅ Encrypted by default (DTLS-SRTP)

### Library: simple-peer

**Why simple-peer?**
- ✅ Smallest bundle size (50KB)
- ✅ Simple API
- ✅ Works with Socket.io for signaling
- ✅ Perfect for 1-on-1 and small group calls

**Location:** `lib/services/webrtc.service.ts`

---

### WebRTC Connection Flow

```
┌─────────────┐                                    ┌─────────────┐
│   User A    │                                    │   User B    │
│  (Caller)   │                                    │  (Callee)   │
└──────┬──────┘                                    └──────┬──────┘
       │                                                  │
       │ 1. Create Peer (initiator: true)                │
       ├──────────────────────────────────────────────┐  │
       │ const peer = new Peer({ initiator: true })   │  │
       │                                               │  │
       │ 2. Get local media stream                    │  │
       ├──────────────────────────────────────────────┤  │
       │ getUserMedia({ video: true, audio: true })   │  │
       │ peer.addStream(localStream)                  │  │
       │                                               │  │
       │ 3. Generate offer signal                      │  │
       ├──────────────────────────────────────────────┤  │
       │ peer.on('signal', signal => { ... })         │  │
       │                                               │  │
       │ 4. Send offer via Socket.io                   │  │
       │ socket.emit('webrtc-signal', { to: B, signal })│  │
       │━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━▶│
       │                                                  │
       │                                5. Receive offer │
       │                           socket.on('webrtc-signal')
       │                                                  │
       │                    6. Create Peer (initiator: false)
       │                    const peer = new Peer({ initiator: false })
       │                                                  │
       │                           7. Get local media stream
       │                    getUserMedia({ video: true, audio: true })
       │                                                  │
       │                                8. Process offer signal
       │                                peer.signal(signal)
       │                                                  │
       │                                9. Generate answer signal
       │                                                  │
       │                          10. Send answer via Socket.io
       │◀━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
       │ socket.emit('webrtc-signal', { to: A, signal }) │
       │                                                  │
       │ 11. Receive answer                               │
       │ socket.on('webrtc-signal')                       │
       │ peer.signal(signal)                              │
       │                                                  │
       │ 12. ICE candidate exchange                       │
       │◀━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━▶│
       │  (via Socket.io - multiple exchanges)            │
       │                                                  │
       │ 13. P2P connection established! ✅               │
       │━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━▶│
       │◀━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
       │         (Media flows directly P2P)               │
       │                                                  │
       │ 14. peer.on('stream', remoteStream)              │
       │     videoRef.srcObject = remoteStream            │
       │                                                  │
```

---

### WebRTC Service

**Location:** `lib/services/webrtc.service.ts`

```typescript
export class WebRTCService {
  private peers: Map<string, Instance> = new Map();

  /**
   * Create a new peer connection
   */
  createPeer(
    peerId: string,
    options: { initiator: boolean; stream?: MediaStream },
    callbacks?: {
      onSignal?: (signal: SignalData) => void;
      onStream?: (stream: MediaStream) => void;
      onError?: (error: Error) => void;
      onClose?: () => void;
      onConnect?: () => void;
    }
  ): Instance {
    // Remove existing peer if any
    this.destroyPeer(peerId);

    // Create peer with STUN/TURN configuration
    const peer = new Peer({
      initiator: options.initiator,
      trickle: false, // Send all ICE candidates at once
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }, // Google STUN
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });

    // Add local stream
    if (options.stream) {
      peer.addStream(options.stream);
    }

    // Set up event handlers
    peer.on('signal', (signal) => callbacks?.onSignal?.(signal));
    peer.on('stream', (stream) => callbacks?.onStream?.(stream));
    peer.on('error', (error) => callbacks?.onError?.(error));
    peer.on('close', () => callbacks?.onClose?.());
    peer.on('connect', () => callbacks?.onConnect?.());

    // Store peer
    this.peers.set(peerId, peer);

    return peer;
  }

  /**
   * Process incoming signal
   */
  processSignal(peerId: string, signal: SignalData): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.signal(signal);
    }
  }

  /**
   * Destroy peer connection
   */
  destroyPeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.destroy();
      this.peers.delete(peerId);
    }
  }

  /**
   * Destroy all peers
   */
  destroyAll(): void {
    this.peers.forEach((peer) => peer.destroy());
    this.peers.clear();
  }
}
```

---

## Call Flow

### 1. Initiating a Call

**Client (User A):**

```typescript
import { useVideoCall } from '@/features/video-call/hooks/use-video-call';

function CallButton() {
  const { initiateCall, isInitiating } = useVideoCall();

  const handleStartCall = async () => {
    await initiateCall({
      roomId: 'room_123',
      participants: ['user_b_id'],
      type: 'video', // or 'audio'
    });
  };

  return (
    <button onClick={handleStartCall} disabled={isInitiating}>
      Start Video Call
    </button>
  );
}
```

**What Happens:**

```typescript
// 1. Create call session in database
const response = await fetch('/api/call-sessions', {
  method: 'POST',
  body: JSON.stringify({
    roomId: 'room_123',
    type: 'video',
    participants: ['user_b_id'],
  }),
});
const { callId } = await response.json();

// 2. Get local media
const stream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true,
});

// 3. Emit call-initiate via Socket.io
socket.emit('call-initiate', {
  callId,
  roomId: 'room_123',
  participants: ['user_b_id'],
  type: 'video',
});

// 4. Navigate to call page
router.push(`/call/${callId}`);
```

---

### 2. Receiving a Call

**Client (User B):**

```typescript
import { useIncomingCall } from '@/features/video-call/hooks/use-incoming-call';

function IncomingCallDialog() {
  const { incomingCall, acceptCall, rejectCall } = useIncomingCall();

  if (!incomingCall) return null;

  return (
    <Dialog open>
      <DialogContent>
        <DialogTitle>
          {incomingCall.fromName} is calling you
        </DialogTitle>
        <DialogDescription>
          {incomingCall.type === 'video' ? 'Video' : 'Audio'} call
        </DialogDescription>
        <DialogActions>
          <Button onClick={() => rejectCall(incomingCall.callId)} variant="outline">
            Reject
          </Button>
          <Button onClick={() => acceptCall(incomingCall.callId)}>
            Accept
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}
```

**What Happens When Accepting:**

```typescript
// 1. Get local media
const stream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true,
});

// 2. Emit call-accept via Socket.io
socket.emit('call-accept', { callId });

// 3. Navigate to call page
router.push(`/call/${callId}`);
```

---

### 3. Establishing WebRTC Connection

**Client (Both Users):**

```typescript
// Hook: use-peer-connection.ts
export function usePeerConnection({ callId, userId, localStream }) {
  const webrtcService = useWebRTCService();
  const socket = useSocket();
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!localStream || !userId) return;

    // Determine if we're the initiator (caller)
    const isInitiator = /* logic to determine */;

    // Create peer connection
    const peer = webrtcService.createPeer(
      userId,
      { initiator: isInitiator, stream: localStream },
      {
        onSignal: (signal) => {
          // Send signal to other peer via Socket.io
          socket.emit('webrtc-signal', {
            callId,
            to: userId,
            signal,
          });
        },
        onStream: (stream) => {
          // Received remote stream!
          setRemoteStream(stream);
        },
        onConnect: () => {
          setIsConnected(true);
        },
        onError: (error) => {
          console.error('WebRTC error:', error);
        },
        onClose: () => {
          setIsConnected(false);
        },
      }
    );

    // Listen for signals from other peer
    const handleSignal = ({ from, signal }) => {
      if (from === userId) {
        webrtcService.processSignal(userId, signal);
      }
    };
    socket.on('webrtc-signal', handleSignal);

    // Cleanup
    return () => {
      socket.off('webrtc-signal', handleSignal);
      webrtcService.destroyPeer(userId);
    };
  }, [callId, userId, localStream]);

  return { remoteStream, isConnected };
}
```

---

## Client Integration

### useSocket Hook

**Location:** `hooks/use-socket.ts`

```typescript
'use client';

import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

export function useSocket() {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!session?.user) return;

    // Connect to Socket.io server
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      auth: {
        token: session.accessToken,
      },
    });

    // Connection events
    socketInstance.on('connect', () => {
      console.log('✅ Connected to Socket.io');
      setIsConnected(true);

      // Authenticate
      socketInstance.emit('authenticate', {
        token: session.accessToken,
        userId: session.user.id,
        userName: session.user.name,
      });
    });

    socketInstance.on('disconnect', () => {
      console.log('❌ Disconnected from Socket.io');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    setSocket(socketInstance);

    // Cleanup
    return () => {
      socketInstance.disconnect();
    };
  }, [session]);

  return { socket, isConnected };
}
```

---

### Using Socket in Components

```typescript
'use client';

import { useSocket } from '@/hooks/use-socket';
import { useEffect } from 'react';

export function ChatMessages({ roomId }) {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for new messages
    const handleNewMessage = (message) => {
      console.log('New message:', message);
      // Update UI (React Query, Zustand, etc.)
    };

    socket.on('message:new', handleNewMessage);

    // Join room
    socket.emit('room:join', { roomId });

    // Cleanup
    return () => {
      socket.off('message:new', handleNewMessage);
      socket.emit('room:leave', { roomId });
    };
  }, [socket, isConnected, roomId]);

  return <div>Chat messages...</div>;
}
```

---

## Troubleshooting

### Socket.io Not Connecting

**Check:**
1. Is Socket.io server running? (`npm run server`)
2. Correct URL? (`NEXT_PUBLIC_SOCKET_URL`)
3. CORS configured correctly?
4. Authentication token valid?

**Debug:**
```typescript
socketInstance.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
  console.log('Socket URL:', process.env.NEXT_PUBLIC_SOCKET_URL);
});
```

---

### WebRTC Connection Fails

**Check:**
1. Camera/microphone permissions granted?
2. STUN server reachable?
3. Firewall blocking UDP?
4. Both peers sending signals?

**Debug:**
```typescript
peer.on('error', (error) => {
  console.error('Peer error:', error.code, error.message);
});

peer.on('signal', (signal) => {
  console.log('Generated signal:', signal.type);
});
```

---

### Memory Leak Signs

**Symptoms:**
- Server memory increasing over time
- Slow response after many connections
- Socket.io server crashes

**Solution:**
```javascript
// ✅ Ensure disconnect handler calls removeAllListeners
socket.on('disconnect', () => {
  socket.removeAllListeners(); // CRITICAL!
});
```

---

## Best Practices

### ✅ DO

1. **Always clean up event listeners**
   ```typescript
   useEffect(() => {
     socket.on('event', handler);
     return () => socket.off('event', handler); // ✅ Cleanup
   }, []);
   ```

2. **Use room-based broadcasting**
   ```typescript
   io.to(roomId).emit('event', data); // ✅ Only to room members
   ```

3. **Validate all incoming events**
   ```typescript
   socket.on('message:send', async (data) => {
     const result = messageSchema.safeParse(data);
     if (!result.success) return; // ✅ Validate
     // Process message...
   });
   ```

4. **Handle reconnections gracefully**
   ```typescript
   socket.on('reconnect', () => {
     // Re-join rooms, re-sync state
   });
   ```

### ❌ DON'T

1. **Don't broadcast to everyone**
   ```typescript
   io.emit('event', data); // ❌ Sends to ALL connections!
   ```

2. **Don't forget to leave rooms**
   ```typescript
   useEffect(() => {
     socket.emit('room:join', { roomId });
     // ❌ Missing cleanup - stays in room forever!
   }, [roomId]);
   ```

3. **Don't create multiple peer connections per user**
   ```typescript
   // ❌ BAD
   const peer1 = webrtcService.createPeer(userId, ...);
   const peer2 = webrtcService.createPeer(userId, ...); // Overwrites peer1!
   
   // ✅ GOOD: One peer per remote user
   const peer = webrtcService.createPeer(userId, ...);
   ```

---

## Summary

**Key Takeaways:**

1. ✅ Socket.io runs on standalone server (port 3001)
2. ✅ Always clean up event listeners on disconnect
3. ✅ WebRTC uses Socket.io for signaling only
4. ✅ Media flows peer-to-peer after connection
5. ✅ Use rooms for efficient broadcasting
6. ✅ simple-peer makes WebRTC easy

**Next Steps:**

- Try creating a custom Socket.io event
- Experiment with WebRTC calls
- Read [08-MEMORY-MANAGEMENT.md](./08-MEMORY-MANAGEMENT.md) for more memory tips

---

**Need Help?** Check `backend/server.js` for all event handlers!

