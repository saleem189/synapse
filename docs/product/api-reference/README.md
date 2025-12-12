# API Reference

Complete reference for Synapse REST and WebSocket APIs.

---

## Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

---

## Authentication

All API endpoints require authentication unless specified otherwise.

**Include access token in Authorization header:**

```bash
Authorization: Bearer YOUR_ACCESS_TOKEN
```

See [Authentication Guide](../getting-started/authentication.md) for details.

---

## REST API

### Messages

- **[GET /rooms/{roomId}/messages](./rest/messages.md#get-messages)** - Get messages
- **[POST /rooms/{roomId}/messages](./rest/messages.md#create-message)** - Send message
- **[PATCH /messages/{messageId}](./rest/messages.md#update-message)** - Edit message
- **[DELETE /messages/{messageId}](./rest/messages.md#delete-message)** - Delete message
- **[POST /messages/{messageId}/reactions](./rest/messages.md#add-reaction)** - Add reaction
- **[GET /messages/search](./rest/messages.md#search-messages)** - Search messages

### Rooms

- **[GET /rooms](./rest/rooms.md#get-rooms)** - Get all rooms
- **[POST /rooms](./rest/rooms.md#create-room)** - Create room
- **[GET /rooms/{roomId}](./rest/rooms.md#get-room)** - Get room details
- **[PATCH /rooms/{roomId}](./rest/rooms.md#update-room)** - Update room
- **[DELETE /admin/rooms](./rest/rooms.md#delete-room)** - Delete room (admin)
- **[POST /rooms/{roomId}/members](./rest/rooms.md#add-member)** - Add member
- **[DELETE /rooms/{roomId}/members](./rest/rooms.md#remove-member)** - Remove member

### Users

- **[POST /auth/register](./rest/auth.md#register)** - Register user
- **[POST /auth/login](./rest/auth.md#login)** - Login
- **[POST /auth/logout](./rest/auth.md#logout)** - Logout
- **[GET /users/me](./rest/users.md#get-current-user)** - Get current user
- **[PATCH /users/me](./rest/users.md#update-profile)** - Update profile
- **[GET /admin/users](./rest/users.md#get-all-users)** - Get all users (admin)

### Files

- **[POST /upload](./rest/files.md#upload-file)** - Upload file
- **[GET /files/{fileId}](./rest/files.md#get-file)** - Get file details

### Calls

- **[POST /call-sessions](./rest/calls.md#create-call)** - Create call session
- **[GET /call-sessions/{callId}](./rest/calls.md#get-call)** - Get call details
- **[PATCH /call-sessions/{callId}](./rest/calls.md#update-call)** - Update call status

---

## WebSocket API

### Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: { token: YOUR_ACCESS_TOKEN }
});
```

### Events

- **[Room Events](./websocket/room-events.md)** - Join, leave, member updates
- **[Message Events](./websocket/message-events.md)** - New, updated, deleted messages
- **[Typing Events](./websocket/typing-events.md)** - Typing indicators
- **[Call Events](./websocket/call-events.md)** - Call initiation, signaling
- **[Presence Events](./websocket/presence-events.md)** - Online/offline status

---

## Common Patterns

### Pagination

**Cursor-based pagination:**

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

**Load next page:**
```bash
GET /api/rooms/{roomId}/messages?cursor=def456
```

---

### Error Handling

**Standard error format:**

```json
{
  "error": "Error type",
  "message": "Human-readable message",
  "details": [
    {
      "path": "field.name",
      "message": "Validation error"
    }
  ]
}
```

See [Error Reference](./errors.md) for all error codes.

---

### Rate Limits

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Standard | 60 requests | 1 minute |
| Admin | 30 requests | 1 minute |
| Delete | 5 requests | 1 minute |

**Rate limit headers:**
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 2025-12-12T19:00:00Z
```

See [Rate Limits](./rate-limits.md) for details.

---

## Quick Reference

### HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | Success | Request succeeded |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal error |

---

## Next Steps

- **[Authentication Guide](../getting-started/authentication.md)** - Get started
- **[Send First Message](../guides/send-first-message.md)** - Practical tutorial
- **[REST API Details](./rest/README.md)** - Complete REST reference
- **[WebSocket Events](./websocket/README.md)** - Complete Socket.io reference

