# Real-time Communication

Understand how WebSocket and Socket.io enable instant updates in Synapse.

---

## Why Real-time?

**REST API:**
- Poll for updates every few seconds
- High latency (100-500ms per poll)
- Wasteful (many requests return no new data)

**WebSocket:**
- Server pushes updates instantly
- Low latency (~10ms)
- Efficient (only sends when there's new data)

---

## How It Works

```
1. Client connects to Socket.io server (port 3001)
   ↓
2. Client authenticates with access token
   ↓
3. Client joins rooms (subscribes to events)
   ↓
4. Server broadcasts events to subscribed clients
   ↓
5. Clients receive and process events instantly
```

---

## Connection Flow

```javascript
// 1. Connect
const socket = io('http://localhost:3001', {
  auth: { token: YOUR_ACCESS_TOKEN }
});

// 2. Authenticate
socket.emit('authenticate', {
  token: YOUR_ACCESS_TOKEN,
  userId: YOUR_USER_ID,
  userName: YOUR_USER_NAME
});

// 3. Join room
socket.emit('room:join', { roomId: 'room_123' });

// 4. Listen for events
socket.on('message:new', (message) => {
  // Instant notification!
});
```

---

## Event Categories

### Room Events

| Event | When | Data |
|-------|------|------|
| `room:joined` | You joined a room | `{ roomId, members }` |
| `user:joined-room` | Someone joined | `{ userId, userName, roomId }` |
| `user:left-room` | Someone left | `{ userId, userName, roomId }` |

### Message Events

| Event | When | Data |
|-------|------|------|
| `message:new` | New message | `Message` object |
| `message:updated` | Message edited | `{ messageId, content }` |
| `message:deleted` | Message deleted | `messageId` |
| `message:reaction-added` | Emoji added | `{ messageId, emoji, userId }` |

### Typing Events

| Event | When | Data |
|-------|------|------|
| `user:typing` | User starts typing | `{ userId, userName, roomId }` |
| `user:stop-typing` | User stops typing | `{ userId, roomId }` |

### Presence Events

| Event | When | Data |
|-------|------|------|
| `user:online` | User comes online | `{ userId, userName }` |
| `user:offline` | User goes offline | `{ userId }` |

---

## Broadcasting

**Server-side broadcast patterns:**

### To specific room

```javascript
// All users in room receive event
io.to(roomId).emit('message:new', message);
```

### To specific user

```javascript
// Only one user receives event
io.to(`user:${userId}`).emit('call-incoming', callData);
```

### To everyone except sender

```javascript
// All in room except sender
socket.to(roomId).emit('user:typing', { userId });
```

---

## Performance

**Scalability:**

| Clients | Server Type | Notes |
|---------|-------------|-------|
| < 1,000 | Single server | Works well |
| 1,000-10,000 | Redis adapter | Multiple servers, shared state |
| 10,000+ | Dedicated cluster | Load balancer + multiple Socket.io servers |

**Synapse uses Redis adapter for horizontal scaling.**

---

## Best Practices

### Connection Management

```javascript
// ✅ Good: Reuse connection
const socket = io(URL);
// Use same socket for all rooms

// ❌ Bad: New connection per room
rooms.forEach(room => {
  const socket = io(URL); // Too many connections!
});
```

### Event Cleanup

```javascript
// ✅ Good: Clean up listeners
useEffect(() => {
  socket.on('message:new', handler);
  return () => socket.off('message:new', handler);
}, []);

// ❌ Bad: Memory leak
useEffect(() => {
  socket.on('message:new', handler);
  // No cleanup!
}, []);
```

### Reconnection

```javascript
// Handle reconnection
socket.on('reconnect', () => {
  // Re-join rooms
  rooms.forEach(roomId => {
    socket.emit('room:join', { roomId });
  });
});
```

---

## Next Steps

- **[Real-time Events Guide](../guides/realtime-events.md)** - Complete tutorial
- **[WebSocket API Reference](../api-reference/websocket/README.md)** - All events
- **[Send Messages Guide](../guides/send-first-message.md)** - Practical example

---

## Related

- **[Messages](./messages.md)**
- **[Rooms](./rooms.md)**
- **[Video Calls](./video-calls.md)**

