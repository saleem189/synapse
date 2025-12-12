# Messages

Understand how messaging works in Synapse.

---

## What is a Message?

A **message** is content sent by a user in a room. Messages can include text, attachments, reactions, and more.

---

## Message Structure

```typescript
interface Message {
  id: string;                    // Unique identifier
  content: string;               // Message text (max 5,000 chars)
  userId: string;                // Sender ID
  roomId: string;                // Room ID
  createdAt: Date;              // When sent
  updatedAt?: Date;             // When last edited
  user: User;                   // Sender details
  attachments?: Attachment[];   // Files (images, docs, etc.)
  reactions?: Reaction[];       // Emoji reactions
  readBy?: string[];           // User IDs who read it
}

interface Attachment {
  url: string;                  // File URL
  name: string;                 // File name
  size: number;                 // File size (bytes)
  type: string;                 // MIME type
}

interface Reaction {
  messageId: string;           // Message ID
  userId: string;              // Who reacted
  emoji: string;               // Emoji (e.g., "👍")
  createdAt: Date;            // When added
}
```

---

## Message Types

### Text Messages

Simple text content.

```json
{
  "id": "msg_123",
  "content": "Hello team!",
  "userId": "user_456",
  "roomId": "room_789"
}
```

### Messages with Attachments

Images, documents, or other files.

```json
{
  "id": "msg_123",
  "content": "Check out this screenshot",
  "attachments": [
    {
      "url": "https://storage.com/image.jpg",
      "name": "screenshot.jpg",
      "size": 245760,
      "type": "image/jpeg"
    }
  ]
}
```

### Rich Messages

With reactions and read receipts.

```json
{
  "id": "msg_123",
  "content": "Great job everyone!",
  "reactions": [
    { "userId": "user_1", "emoji": "👍" },
    { "userId": "user_2", "emoji": "🎉" }
  ],
  "readBy": ["user_1", "user_2", "user_3"]
}
```

---

## Message Lifecycle

```
1. Creation
   ├─> User sends message
   ├─> Server validates content
   ├─> Saved to database
   └─> Broadcast via WebSocket

2. Active
   ├─> Users read (read receipts)
   ├─> Users react (emojis)
   └─> Author can edit/delete

3. Archived (if edited)
   └─> Previous version saved (optional)

4. Deleted
   └─> Removed from room (optional)
```

---

## Sending Messages

### Basic Message

```bash
POST /api/rooms/{roomId}/messages

{
  "content": "Hello!"
}
```

### Message with File

```bash
# 1. Upload file
POST /api/upload
Content-Type: multipart/form-data

# 2. Send message with attachment
POST /api/rooms/{roomId}/messages

{
  "content": "Check this out",
  "attachments": [{
    "url": "...",
    "name": "file.pdf",
    "size": 123456,
    "type": "application/pdf"
  }]
}
```

---

## Real-time Delivery

Messages are delivered instantly via WebSocket:

```javascript
// Send message (triggers WebSocket broadcast)
POST /api/rooms/room_123/messages

// All online members receive:
socket.on('message:new', (message) => {
  addMessageToUI(message);
});
```

**Delivery guarantee:**
- ✅ Online users: Instant (< 50ms)
- ✅ Offline users: On reconnect
- ✅ Push notifications: Background queue

---

## Message Features

### Edit Messages

Authors can edit their messages within 15 minutes.

```bash
PATCH /api/messages/{messageId}

{
  "content": "Updated content"
}
```

**Broadcast:**
```javascript
socket.on('message:updated', ({ messageId, content }) => {
  updateMessageInUI(messageId, content);
});
```

---

### Delete Messages

Authors or room admins can delete messages.

```bash
DELETE /api/messages/{messageId}
```

**Broadcast:**
```javascript
socket.on('message:deleted', (messageId) => {
  removeMessageFromUI(messageId);
});
```

---

### Reactions

Add emoji reactions to messages.

```bash
POST /api/messages/{messageId}/reactions

{
  "emoji": "👍"
}
```

**Broadcast:**
```javascript
socket.on('message:reaction-added', (data) => {
  addReactionToMessage(data.messageId, data.emoji);
});
```

---

### Read Receipts

Track who has read messages.

```bash
POST /api/messages/{messageId}/read
```

**Result:** Message marked as read for current user.

---

## Pagination

Messages are paginated for performance:

```bash
GET /api/rooms/{roomId}/messages?limit=50&cursor=abc123
```

**Response:**
```json
{
  "messages": [...],
  "nextCursor": "def456"
}
```

**Load more:**
```bash
GET /api/rooms/{roomId}/messages?cursor=def456
```

---

## Search

Search messages within a room:

```bash
GET /api/messages/search?roomId=room_123&query=hello&limit=50
```

**Result:** Messages matching "hello"

---

## Validation

### Content Rules

- **Length:** 1-5,000 characters
- **Required:** Unless attachments provided
- **Sanitized:** XSS protection applied

### Attachment Rules

- **Max size:** 10 MB (images/docs), 50 MB (videos)
- **Max count:** 5 per message
- **Types:** See [Upload Files Guide](../guides/upload-files.md)

---

## Best Practices

### Performance

- **Load messages incrementally** (50 at a time)
- **Virtualize long lists** (render only visible messages)
- **Cache recent messages** (reduce API calls)

### UX

- **Show optimistic updates** (instant UI feedback)
- **Handle failures gracefully** (retry or show error)
- **Display typing indicators** (let users know someone is typing)

### Security

- **Validate on server** (never trust client input)
- **Sanitize HTML** (prevent XSS attacks)
- **Rate limit** (prevent spam)

---

## Next Steps

- **[Send Messages Guide](../guides/send-first-message.md)** - Step-by-step tutorial
- **[Messages API Reference](../api-reference/rest/messages.md)** - Complete API docs
- **[Upload Files Guide](../guides/upload-files.md)** - Share files

---

## Related

- **[Rooms](./rooms.md)**
- **[Real-time Events](./realtime.md)**
- **[Notifications](./notifications.md)**

