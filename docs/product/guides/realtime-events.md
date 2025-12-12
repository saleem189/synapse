# Handle Real-time Events

Learn how to use WebSocket (Socket.io) for real-time updates in Synapse.

---

## What You'll Learn

- Connect to Socket.io server
- Authenticate WebSocket connection
- Subscribe to room events
- Handle incoming messages
- Listen for typing indicators
- Manage user presence

**Time:** ~10 minutes

---

## Prerequisites

- Synapse running locally ([Quickstart](../getting-started/quickstart.md))
- Authenticated user with access token
- Basic JavaScript knowledge

---

## Why WebSocket?

REST API is great for fetching data, but for real-time updates you need WebSocket:

| Method | Use Case | Latency |
|--------|----------|---------|
| **REST API** | Fetch messages, create rooms | ~100ms |
| **WebSocket** | Receive new messages instantly | ~10ms |

**With WebSocket, users see messages the moment they're sent!**

---

## Step 1: Install Socket.io Client

**Install the package:**

```bash
npm install socket.io-client
```

---

## Step 2: Connect to Server

Connect to the Socket.io server (runs on port 3001).

```javascript
import { io } from 'socket.io-client';

// Connect to Socket.io server
const socket = io('http://localhost:3001', {
  auth: {
    token: YOUR_ACCESS_TOKEN
  }
});

// Connection successful
socket.on('connect', () => {
  console.log('✅ Connected to Socket.io');
  console.log('Socket ID:', socket.id);
});

// Connection failed
socket.on('connect_error', (error) => {
  console.error('❌ Connection failed:', error.message);
});

// Disconnected
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

---

## Step 3: Authenticate

After connecting, authenticate with your user credentials.

```javascript
socket.emit('authenticate', {
  token: YOUR_ACCESS_TOKEN,
  userId: YOUR_USER_ID,
  userName: YOUR_USER_NAME
});

// Authentication successful
socket.on('authenticated', (data) => {
  console.log('✅ Authenticated as:', data.userName);
});

// Authentication failed
socket.on('auth:error', (error) => {
  console.error('❌ Auth failed:', error.message);
});
```

---

## Step 4: Join a Room

Subscribe to events for a specific room.

```javascript
// Join room
socket.emit('room:join', {
  roomId: 'room_abc123'
});

// Joined successfully
socket.on('room:joined', (data) => {
  console.log('✅ Joined room:', data.roomId);
  console.log('Members:', data.members);
});

// Other user joined
socket.on('user:joined-room', (data) => {
  console.log('👋', data.userName, 'joined the room');
});
```

---

## Step 5: Listen for New Messages

Receive messages in real-time.

```javascript
socket.on('message:new', (message) => {
  console.log('📨 New message:', message);
  
  // Message structure:
  // {
  //   id: 'msg_xyz789',
  //   content: 'Hello!',
  //   userId: 'user_123',
  //   roomId: 'room_abc123',
  //   createdAt: '2025-12-12T19:00:00.000Z',
  //   user: {
  //     id: 'user_123',
  //     name: 'Jane Smith',
  //     image: null
  //   }
  // }
  
  // Update your UI
  addMessageToUI(message);
});
```

---

## Step 6: Listen for Message Updates

Get notified when messages are edited or deleted.

**Message Updated:**

```javascript
socket.on('message:updated', (data) => {
  console.log('✏️ Message edited:', data.messageId);
  
  // Data structure:
  // {
  //   messageId: 'msg_xyz789',
  //   content: 'Hello! (edited)',
  //   updatedAt: '2025-12-12T19:05:00.000Z'
  // }
  
  updateMessageInUI(data);
});
```

**Message Deleted:**

```javascript
socket.on('message:deleted', (messageId) => {
  console.log('🗑️ Message deleted:', messageId);
  
  removeMessageFromUI(messageId);
});
```

---

## Step 7: Typing Indicators

Show when users are typing.

**Emit typing status:**

```javascript
let typingTimeout;

function onUserTyping() {
  // Emit typing start
  socket.emit('typing:start', {
    roomId: 'room_abc123'
  });
  
  // Clear previous timeout
  clearTimeout(typingTimeout);
  
  // Auto-stop after 3 seconds
  typingTimeout = setTimeout(() => {
    socket.emit('typing:stop', {
      roomId: 'room_abc123'
    });
  }, 3000);
}

function onUserStoppedTyping() {
  clearTimeout(typingTimeout);
  socket.emit('typing:stop', {
    roomId: 'room_abc123'
  });
}
```

**Listen for typing events:**

```javascript
socket.on('user:typing', (data) => {
  console.log('⌨️', data.userName, 'is typing...');
  
  // Show typing indicator
  showTypingIndicator(data.userId, data.userName);
});

socket.on('user:stop-typing', (data) => {
  // Hide typing indicator
  hideTypingIndicator(data.userId);
});
```

---

## Step 8: User Presence

Track when users come online/offline.

```javascript
// User came online
socket.on('user:online', (data) => {
  console.log('🟢', data.userName, 'is online');
  updateUserStatus(data.userId, 'online');
});

// User went offline
socket.on('user:offline', (data) => {
  console.log('⚫', data.userName, 'is offline');
  updateUserStatus(data.userId, 'offline');
});
```

---

## Step 9: Message Reactions

Listen for emoji reactions.

```javascript
// Reaction added
socket.on('message:reaction-added', (data) => {
  console.log('👍 Reaction:', data.emoji, 'by', data.userName);
  
  // Data structure:
  // {
  //   messageId: 'msg_xyz789',
  //   userId: 'user_456',
  //   userName: 'John Doe',
  //   emoji: '👍',
  //   timestamp: '2025-12-12T19:10:00.000Z'
  // }
  
  addReactionToMessage(data);
});

// Reaction removed
socket.on('message:reaction-removed', (data) => {
  removeReactionFromMessage(data);
});
```

---

## Step 10: Leave Room

Unsubscribe from room events when done.

```javascript
socket.emit('room:leave', {
  roomId: 'room_abc123'
});

// Left successfully
socket.on('room:left', (data) => {
  console.log('👋 Left room:', data.roomId);
});

// Other user left
socket.on('user:left-room', (data) => {
  console.log('👋', data.userName, 'left the room');
});
```

---

## Complete React Example

**Full implementation with React hooks:**

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  content: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export function useChatRoom(roomId: string, token: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);

  // Connect to Socket.io
  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      auth: { token }
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ Connected');
      setIsConnected(true);
      
      // Join room
      newSocket.emit('room:join', { roomId });
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected');
      setIsConnected(false);
    });

    // Message events
    newSocket.on('message:new', (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on('message:updated', ({ messageId, content }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, content } : msg
        )
      );
    });

    newSocket.on('message:deleted', (messageId: string) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    });

    // Typing events
    newSocket.on('user:typing', ({ userId }) => {
      setTypingUsers((prev) => new Set(prev).add(userId));
    });

    newSocket.on('user:stop-typing', ({ userId }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      newSocket.emit('room:leave', { roomId });
      newSocket.disconnect();
    };
  }, [roomId, token]);

  // Send message
  const sendMessage = (content: string) => {
    if (socket && isConnected) {
      socket.emit('message:send', {
        roomId,
        content
      });
    }
  };

  // Start typing
  const startTyping = () => {
    if (socket && isConnected) {
      socket.emit('typing:start', { roomId });
    }
  };

  // Stop typing
  const stopTyping = () => {
    if (socket && isConnected) {
      socket.emit('typing:stop', { roomId });
    }
  };

  return {
    messages,
    typingUsers,
    isConnected,
    sendMessage,
    startTyping,
    stopTyping
  };
}

// Usage in component
function ChatRoom({ roomId, token }) {
  const { messages, typingUsers, isConnected, sendMessage, startTyping, stopTyping } = useChatRoom(roomId, token);

  return (
    <div>
      <div>Status: {isConnected ? '🟢 Connected' : '⚫ Disconnected'}</div>
      
      <div>
        {messages.map((msg) => (
          <div key={msg.id}>
            <strong>{msg.userName}:</strong> {msg.content}
          </div>
        ))}
      </div>
      
      {typingUsers.size > 0 && (
        <div>👤 {typingUsers.size} user(s) typing...</div>
      )}
      
      <input
        onFocus={startTyping}
        onBlur={stopTyping}
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            sendMessage(e.target.value);
            e.target.value = '';
          }
        }}
      />
    </div>
  );
}
```

---

## Event Reference

### Room Events

| Event | Direction | Data | Description |
|-------|-----------|------|-------------|
| `room:join` | Send | `{ roomId }` | Join a room |
| `room:leave` | Send | `{ roomId }` | Leave a room |
| `room:joined` | Receive | `{ roomId, members }` | Joined successfully |
| `user:joined-room` | Receive | `{ userId, userName, roomId }` | User joined |
| `user:left-room` | Receive | `{ userId, userName, roomId }` | User left |

### Message Events

| Event | Direction | Data | Description |
|-------|-----------|------|-------------|
| `message:send` | Send | `{ roomId, content }` | Send message |
| `message:new` | Receive | `Message` | New message received |
| `message:updated` | Receive | `{ messageId, content }` | Message edited |
| `message:deleted` | Receive | `messageId` | Message deleted |

### Typing Events

| Event | Direction | Data | Description |
|-------|-----------|------|-------------|
| `typing:start` | Send | `{ roomId }` | User started typing |
| `typing:stop` | Send | `{ roomId }` | User stopped typing |
| `user:typing` | Receive | `{ userId, userName, roomId }` | Someone is typing |
| `user:stop-typing` | Receive | `{ userId, roomId }` | Someone stopped |

### Presence Events

| Event | Direction | Data | Description |
|-------|-----------|------|-------------|
| `user:online` | Receive | `{ userId, userName }` | User came online |
| `user:offline` | Receive | `{ userId }` | User went offline |

---

## Best Practices

### 1. Clean Up Listeners

Always remove listeners when done:

```javascript
useEffect(() => {
  socket.on('message:new', handleMessage);
  
  return () => {
    socket.off('message:new', handleMessage); // ✅ Clean up
  };
}, []);
```

### 2. Handle Reconnection

Implement reconnection logic:

```javascript
socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Server disconnected - reconnect manually
    socket.connect();
  }
  // Otherwise, socket will auto-reconnect
});

socket.on('reconnect', () => {
  // Re-join rooms after reconnection
  socket.emit('room:join', { roomId });
});
```

### 3. Optimize Typing Indicators

Throttle typing events:

```javascript
import { throttle } from 'lodash';

const emitTyping = throttle(() => {
  socket.emit('typing:start', { roomId });
}, 2000); // Max once per 2 seconds
```

---

## Next Steps

- **[Start a Video Call](./start-video-call.md)** - WebRTC integration
- **[Real-time Concepts](../concepts/realtime.md)** - How WebSocket works
- **[WebSocket API Reference](../api-reference/websocket/README.md)** - Complete event list

---

## Troubleshooting

### Can't Connect

**Problem:** Socket.io connection fails

**Solutions:**
1. Verify Socket.io server is running (port 3001)
2. Check CORS configuration
3. Verify access token is valid
4. Check firewall settings

### Not Receiving Events

**Problem:** Events not firing

**Solutions:**
1. Ensure you joined the room (`room:join`)
2. Check listener is registered before event fires
3. Verify event name spelling
4. Check server logs for errors

### Memory Leaks

**Problem:** App becomes slow over time

**Solutions:**
1. Always clean up listeners in `useEffect` return
2. Don't create listeners inside render functions
3. Use `socket.off()` to remove old listeners

---

## Related

- **[Send Messages Guide](./send-first-message.md)**
- **[WebSocket Events Reference](../api-reference/websocket/README.md)**
- **[Real-time Concepts](../concepts/realtime.md)**

