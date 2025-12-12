# Rooms

Understand how chat rooms work in Synapse.

---

## What is a Room?

A **room** is a space where users exchange messages. Think of it like a channel in Slack or a server in Discord.

**Key Features:**
- Text messages with attachments
- Real-time updates via WebSocket
- Member management
- Video/audio calls
- Public or private visibility

---

## Room Types

### Public Rooms

Anyone can see and join public rooms.

```json
{
  "id": "room_abc123",
  "name": "General Chat",
  "isPrivate": false
}
```

**Use Cases:**
- Team-wide discussions
- Community channels
- Public announcements

### Private Rooms

Only invited members can see and join private rooms.

```json
{
  "id": "room_xyz789",
  "name": "Leadership Team",
  "isPrivate": true
}
```

**Use Cases:**
- Direct messages (1-on-1)
- Private group chats
- Confidential discussions

---

## Room Structure

```typescript
interface Room {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  description?: string;          // Optional description
  isPrivate: boolean;            // Public or private
  createdAt: Date;              // Creation timestamp
  updatedAt: Date;              // Last update
  members: RoomMember[];        // Room participants
  messages?: Message[];         // Chat history (if included)
}

interface RoomMember {
  userId: string;               // User ID
  roomId: string;               // Room ID
  role: 'ADMIN' | 'MEMBER';    // Permission level
  joinedAt: Date;              // When they joined
  user: User;                  // User details
}
```

---

## Member Roles

### Admin

Full control over the room.

**Permissions:**
- ✅ Send messages
- ✅ Delete any message
- ✅ Add members
- ✅ Remove members
- ✅ Update room settings
- ✅ Delete room

### Member

Standard participant.

**Permissions:**
- ✅ Send messages
- ✅ Delete own messages
- ✅ React to messages
- ✅ Join calls
- ❌ Remove others
- ❌ Update room settings

---

## Room Lifecycle

```
1. Creation
   └─> Room created with creator as admin

2. Active
   ├─> Members join/leave
   ├─> Messages sent
   └─> Calls initiated

3. Archived/Deleted
   └─> Room removed (optional)
```

---

## Common Operations

### Create a Room

```bash
POST /api/rooms

{
  "name": "Team Chat",
  "description": "Daily discussions",
  "isPrivate": false
}
```

**Result:** New room created with you as admin.

---

### Join a Room

**Public rooms:** Join automatically via API

```bash
POST /api/rooms/{roomId}/members

{
  "userId": "user_123"
}
```

**Private rooms:** Requires invitation from admin

---

### Send a Message

```bash
POST /api/rooms/{roomId}/messages

{
  "content": "Hello team!"
}
```

**Delivery:** Instant via WebSocket to all online members

---

### Leave a Room

```bash
DELETE /api/rooms/{roomId}/members?userId=user_123
```

**Result:** Removed from room, no longer receives messages

---

## Real-time Updates

Rooms use WebSocket for instant updates:

```javascript
// Join room
socket.emit('room:join', { roomId: 'room_abc123' });

// Receive new messages
socket.on('message:new', (message) => {
  // Update UI instantly
});

// Member joined
socket.on('user:joined-room', (data) => {
  console.log(data.userName, 'joined');
});
```

---

## Best Practices

### Naming

**Good names:**
- ✅ "Product Team"
- ✅ "Customer Support"
- ✅ "Weekly Standup"

**Avoid:**
- ❌ "Room 1"
- ❌ "Untitled"
- ❌ "asdf"

### Organization

- Use descriptive names
- Add descriptions for context
- Archive inactive rooms
- Use private rooms for sensitive topics

### Performance

- Limit room members (< 1,000 for best performance)
- Paginate message history
- Use lazy loading for large rooms

---

## Next Steps

- **[Messages Concept](./messages.md)** - How messaging works
- **[Create Room Guide](../guides/send-first-message.md)** - Step-by-step tutorial
- **[Rooms API Reference](../api-reference/rest/rooms.md)** - Complete API docs

---

## Related

- **[Messages](./messages.md)**
- **[Real-time Events](./realtime.md)**
- **[Video Calls](./video-calls.md)**

