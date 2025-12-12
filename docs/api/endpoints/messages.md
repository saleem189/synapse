# Messages API Endpoints

Complete reference for all message-related API endpoints.

---

## Get Messages

Retrieve messages from a room.

**Endpoint:** `GET /api/rooms/[roomId]/messages`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cursor` | string | No | Pagination cursor for infinite scroll |
| `limit` | number | No | Number of messages to return (default: 50, max: 100) |

**Response:**

```json
{
  "messages": [
    {
      "id": "msg_123",
      "content": "Hello!",
      "userId": "user_456",
      "roomId": "room_789",
      "createdAt": "2025-12-12T19:00:00.000Z",
      "user": {
        "id": "user_456",
        "name": "John Doe",
        "image": "/avatar.png"
      }
    }
  ],
  "nextCursor": "cursor_abc"
}
```

**Example:**

```typescript
const response = await fetch('/api/rooms/room_123/messages?limit=50')
const { messages, nextCursor } = await response.json()
```

---

## Create Message

Send a new message to a room.

**Endpoint:** `POST /api/rooms/[roomId]/messages`

**Authentication:** Required

**Request Body:**

```json
{
  "content": "Hello, world!",
  "attachments": [
    {
      "url": "https://example.com/file.pdf",
      "name": "file.pdf",
      "size": 1024000,
      "type": "application/pdf"
    }
  ]
}
```

**Validation:**
- `content`: String, 1-5000 characters (required if no attachments)
- `attachments`: Array of file objects (optional)

**Response:**

```json
{
  "id": "msg_123",
  "content": "Hello, world!",
  "userId": "user_456",
  "roomId": "room_789",
  "createdAt": "2025-12-12T19:00:00.000Z",
  "attachments": [...]
}
```

**Example:**

```typescript
const response = await fetch('/api/rooms/room_123/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    content: 'Hello, world!'
  })
})

const message = await response.json()
```

---

## Update Message

Update an existing message.

**Endpoint:** `PATCH /api/messages/[messageId]`

**Authentication:** Required (must be message author)

**Request Body:**

```json
{
  "content": "Updated message content"
}
```

**Validation:**
- `content`: String, 1-5000 characters (required)
- User must be the message author

**Response:**

```json
{
  "id": "msg_123",
  "content": "Updated message content",
  "userId": "user_456",
  "roomId": "room_789",
  "updatedAt": "2025-12-12T19:05:00.000Z"
}
```

**Example:**

```typescript
const response = await fetch('/api/messages/msg_123', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    content: 'Updated content'
  })
})

const updatedMessage = await response.json()
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| `400` | Validation failed | Invalid content or format |
| `401` | Unauthorized | Not authenticated |
| `403` | Forbidden | Not the message author |
| `404` | Not found | Message doesn't exist |

---

## Delete Message

Delete a message.

**Endpoint:** `DELETE /api/messages/[messageId]`

**Authentication:** Required (must be message author or room admin)

**Response:**

```json
{
  "success": true,
  "deletedId": "msg_123"
}
```

**Example:**

```typescript
const response = await fetch('/api/messages/msg_123', {
  method: 'DELETE'
})

const result = await response.json()
```

---

## Search Messages

Search messages across a room.

**Endpoint:** `GET /api/messages/search`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomId` | string | Yes | Room ID to search in |
| `query` | string | Yes | Search query (min 1 character) |
| `limit` | number | No | Max results (default: 50, max: 100) |

**Response:**

```json
{
  "messages": [
    {
      "id": "msg_123",
      "content": "Matching message...",
      "userId": "user_456",
      "createdAt": "2025-12-12T19:00:00.000Z",
      "user": { ... }
    }
  ],
  "total": 10
}
```

**Example:**

```typescript
const params = new URLSearchParams({
  roomId: 'room_123',
  query: 'hello',
  limit: '50'
})

const response = await fetch(`/api/messages/search?${params}`)
const { messages, total } = await response.json()
```

---

## WebSocket Events

Real-time message events via Socket.io.

### Listen for New Messages

**Event:** `message:new`

```typescript
socket.on('message:new', (message) => {
  console.log('New message:', message)
  // Update UI with new message
})
```

### Listen for Updated Messages

**Event:** `message:updated`

```typescript
socket.on('message:updated', ({ messageId, content }) => {
  console.log('Message updated:', messageId, content)
  // Update message in UI
})
```

### Listen for Deleted Messages

**Event:** `message:deleted`

```typescript
socket.on('message:deleted', (messageId) => {
  console.log('Message deleted:', messageId)
  // Remove message from UI
})
```

---

## Rate Limits

All message endpoints are rate-limited:

| Endpoint | Rate Limit |
|----------|------------|
| GET /messages | 100 requests/minute |
| POST /messages | 50 requests/minute |
| PATCH /messages | 30 requests/minute |
| DELETE /messages | 30 requests/minute |
| GET /search | 50 requests/minute |

---

## Error Handling

### Common Errors:

```typescript
try {
  const response = await fetch('/api/rooms/room_123/messages', {
    method: 'POST',
    body: JSON.stringify({ content: 'Hello' })
  })
  
  if (!response.ok) {
    const error = await response.json()
    console.error('Error:', error.message)
  }
  
  const message = await response.json()
} catch (error) {
  console.error('Network error:', error)
}
```

### Validation Errors:

```json
{
  "error": "Validation failed",
  "details": [
    {
      "path": "content",
      "message": "Content must be between 1 and 5000 characters"
    }
  ]
}
```

---

## See Also

- [Rooms API](./rooms.md) - Room management
- [Users API](./users.md) - User management
- [Authentication](../authentication.md) - How to authenticate
- [WebSocket Guide](../../development/websocket-guide.md) - Real-time events

