# Send Your First Message

Learn how to create a chat room and send messages with Synapse.

---

## What You'll Learn

- Create a chat room
- Add members to a room
- Send a text message
- Upload a file attachment
- Listen for new messages in real-time

**Time:** ~10 minutes

---

## Prerequisites

- Synapse running locally ([Quickstart](../getting-started/quickstart.md))
- Authenticated user with access token ([Authentication](../getting-started/authentication.md))

---

## Step 1: Create a Room

Rooms are chat spaces where users can exchange messages.

**Request:**

```bash
curl -X POST http://localhost:3000/api/rooms \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Team Chat",
    "description": "Daily team discussions",
    "isPrivate": false
  }'
```

**Response:**

```json
{
  "id": "room_abc123",
  "name": "Team Chat",
  "description": "Daily team discussions",
  "isPrivate": false,
  "createdAt": "2025-12-12T19:00:00.000Z",
  "members": [
    {
      "userId": "user_xyz789",
      "role": "ADMIN",
      "joinedAt": "2025-12-12T19:00:00.000Z"
    }
  ]
}
```

**Save the room ID** (`room_abc123`) - you'll need it to send messages.

---

## Step 2: Send a Text Message

Send a simple text message to the room.

**Request:**

```bash
curl -X POST http://localhost:3000/api/rooms/room_abc123/messages \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello team! 👋"
  }'
```

**Response:**

```json
{
  "id": "msg_def456",
  "content": "Hello team! 👋",
  "userId": "user_xyz789",
  "roomId": "room_abc123",
  "createdAt": "2025-12-12T19:01:00.000Z",
  "user": {
    "id": "user_xyz789",
    "name": "Jane Smith",
    "image": null
  }
}
```

**Success!** Your message is now in the room.

---

## Step 3: Get Messages

Retrieve messages from a room.

**Request:**

```bash
curl -X GET "http://localhost:3000/api/rooms/room_abc123/messages?limit=50" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**

```json
{
  "messages": [
    {
      "id": "msg_def456",
      "content": "Hello team! 👋",
      "userId": "user_xyz789",
      "roomId": "room_abc123",
      "createdAt": "2025-12-12T19:01:00.000Z",
      "user": {
        "id": "user_xyz789",
        "name": "Jane Smith",
        "image": null
      }
    }
  ],
  "nextCursor": null
}
```

**Pagination:**
- Use `cursor` parameter for infinite scroll
- Default limit: 50 messages
- Max limit: 100 messages

---

## Step 4: Send a Message with File

Upload an image or document with your message.

**1. Upload the file first:**

```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@/path/to/image.jpg"
```

**Response:**

```json
{
  "url": "https://your-storage.com/uploads/image_123.jpg",
  "name": "image.jpg",
  "size": 245760,
  "type": "image/jpeg"
}
```

**2. Send message with attachment:**

```bash
curl -X POST http://localhost:3000/api/rooms/room_abc123/messages \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Check out this screenshot",
    "attachments": [
      {
        "url": "https://your-storage.com/uploads/image_123.jpg",
        "name": "image.jpg",
        "size": 245760,
        "type": "image/jpeg"
      }
    ]
  }'
```

---

## Step 5: Update a Message

Edit a message you've sent.

**Request:**

```bash
curl -X PATCH http://localhost:3000/api/messages/msg_def456 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello team! 👋 (edited)"
  }'
```

**Response:**

```json
{
  "id": "msg_def456",
  "content": "Hello team! 👋 (edited)",
  "userId": "user_xyz789",
  "roomId": "room_abc123",
  "updatedAt": "2025-12-12T19:05:00.000Z"
}
```

**Note:** Only the message author can edit their messages.

---

## Step 6: Delete a Message

Remove a message from the room.

**Request:**

```bash
curl -X DELETE http://localhost:3000/api/messages/msg_def456 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**

```json
{
  "success": true,
  "deletedId": "msg_def456"
}
```

**Permissions:** Message author or room admin can delete messages.

---

## Step 7: Add a Reaction

React to a message with an emoji.

**Request:**

```bash
curl -X POST http://localhost:3000/api/messages/msg_def456/reactions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "emoji": "👍"
  }'
```

**Response:**

```json
{
  "messageId": "msg_def456",
  "userId": "user_xyz789",
  "emoji": "👍",
  "createdAt": "2025-12-12T19:10:00.000Z"
}
```

---

## Real-time Updates

To receive messages in real-time, connect to WebSocket:

```javascript
import { io } from 'socket.io-client';

// Connect to Socket.io server
const socket = io('http://localhost:3001', {
  auth: {
    token: YOUR_ACCESS_TOKEN
  }
});

// Join the room
socket.emit('room:join', { roomId: 'room_abc123' });

// Listen for new messages
socket.on('message:new', (message) => {
  console.log('New message:', message);
  // Update your UI
});

// Listen for message updates
socket.on('message:updated', ({ messageId, content }) => {
  console.log('Message updated:', messageId, content);
});

// Listen for message deletions
socket.on('message:deleted', (messageId) => {
  console.log('Message deleted:', messageId);
});
```

---

## Code Examples

### JavaScript/TypeScript

```typescript
// Create room and send message
async function sendMessageToNewRoom() {
  const token = 'YOUR_ACCESS_TOKEN';
  
  // 1. Create room
  const roomResponse = await fetch('/api/rooms', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Team Chat',
      description: 'Daily discussions',
      isPrivate: false,
    }),
  });
  
  const room = await roomResponse.json();
  
  // 2. Send message
  const messageResponse = await fetch(`/api/rooms/${room.id}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: 'Hello team!',
    }),
  });
  
  const message = await messageResponse.json();
  return { room, message };
}
```

### Python

```python
import requests

def send_message_to_new_room(token):
    base_url = 'http://localhost:3000'
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # 1. Create room
    room_response = requests.post(
        f'{base_url}/api/rooms',
        headers=headers,
        json={
            'name': 'Team Chat',
            'description': 'Daily discussions',
            'isPrivate': False
        }
    )
    room = room_response.json()
    
    # 2. Send message
    message_response = requests.post(
        f'{base_url}/api/rooms/{room["id"]}/messages',
        headers=headers,
        json={'content': 'Hello team!'}
    )
    message = message_response.json()
    
    return room, message
```

---

## Next Steps

- **[Start a Video Call](./start-video-call.md)** - Enable video/audio communication
- **[Handle Real-time Events](./realtime-events.md)** - Complete WebSocket guide
- **[Messages API Reference](../api-reference/rest/messages.md)** - Full API documentation

---

## Troubleshooting

### 403 Forbidden

**Problem:** Can't send messages to room

**Solutions:**
1. Ensure you're a member of the room
2. Check if room is private (requires invitation)
3. Verify your access token is valid

### Message Too Long

**Problem:** `Content too long` error

**Solutions:**
1. Messages limited to 5,000 characters
2. Split long messages into multiple parts
3. Use file attachments for long content

### File Upload Failed

**Problem:** File upload returns error

**Solutions:**
1. Check file size (max 10MB)
2. Verify file type is allowed
3. Ensure proper multipart/form-data encoding

---

## Related

- **[Rooms Concept](../concepts/rooms.md)**
- **[Messages Concept](../concepts/messages.md)**
- **[REST API Reference](../api-reference/rest/README.md)**

