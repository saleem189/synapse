# API Reference

Complete API documentation for Synapse REST and WebSocket APIs.

## Base URL

```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

## Authentication

Synapse uses NextAuth for authentication. Most API endpoints require authentication.

See [Authentication Guide](./authentication.md) for details on:
- Getting an authentication token
- Making authenticated requests
- Session management

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Standard | 60 requests | 1 minute |
| Admin Operations | 30 requests | 1 minute |
| Sensitive (DELETE) | 5 requests | 1 minute |

Rate limit headers in responses:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 2025-12-12T10:30:00Z
Retry-After: 30
```

## API Endpoints

### Authentication
- [POST /api/auth/register](./endpoints/auth.md#register) - Register new user
- [POST /api/auth/login](./endpoints/auth.md#login) - Login user
- [POST /api/auth/logout](./endpoints/auth.md#logout) - Logout user

### Messages
- [GET /api/messages](./endpoints/messages.md#list-messages) - List messages in a room
- [POST /api/messages](./endpoints/messages.md#create-message) - Send a message
- [PATCH /api/messages/:id](./endpoints/messages.md#update-message) - Edit a message
- [DELETE /api/messages/:id](./endpoints/messages.md#delete-message) - Delete a message
- [GET /api/messages/search](./endpoints/messages.md#search-messages) - Search messages
- [POST /api/messages/read-batch](./endpoints/messages.md#mark-read) - Mark messages as read

### Rooms
- [GET /api/rooms](./endpoints/rooms.md#list-rooms) - List user's rooms
- [POST /api/rooms](./endpoints/rooms.md#create-room) - Create a new room
- [GET /api/rooms/:id](./endpoints/rooms.md#get-room) - Get room details
- [PATCH /api/rooms/:id](./endpoints/rooms.md#update-room) - Update room
- [DELETE /api/rooms/:id](./endpoints/rooms.md#delete-room) - Delete room
- [POST /api/rooms/:id/members](./endpoints/rooms.md#add-members) - Add members
- [DELETE /api/rooms/:id/members](./endpoints/rooms.md#remove-member) - Remove member

### File Upload
- [POST /api/upload](./endpoints/upload.md#upload-file) - Upload a file

### Admin
- [GET /api/admin/users](./endpoints/admin.md#list-users) - List all users
- [PATCH /api/admin/users](./endpoints/admin.md#update-user) - Update user
- [DELETE /api/admin/users](./endpoints/admin.md#delete-user) - Delete user
- [GET /api/admin/stats](./endpoints/admin.md#get-stats) - Get system stats
- [GET /api/admin/performance](./endpoints/admin.md#get-performance) - Get performance metrics
- [DELETE /api/admin/rooms](./endpoints/admin.md#delete-room) - Delete room (admin)

## WebSocket API

Synapse uses Socket.io for real-time communication.

See [WebSocket Documentation](./websocket.md) for:
- Connection setup
- Event types
- Message format
- Video call signaling

## Error Handling

All API endpoints return errors in a consistent format:

### Error Response Format

```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "details": [
    {
      "path": "field.name",
      "message": "Field-specific error"
    }
  ]
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (not logged in) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 413 | Payload Too Large |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

## Request/Response Examples

### Successful Response
```json
{
  "message": {
    "id": "msg_123",
    "content": "Hello, world!",
    "senderId": "user_456",
    "roomId": "room_789",
    "createdAt": "2025-12-12T10:00:00Z"
  }
}
```

### Error Response
```json
{
  "error": "Validation failed",
  "details": [
    {
      "path": "content",
      "message": "Message must be less than 2000 characters"
    }
  ]
}
```

### Rate Limit Error
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests, please try again later",
  "retryAfter": 30
}
```

## Pagination

Endpoints that return lists support pagination:

### Query Parameters
- `skip` - Number of records to skip (default: 0)
- `take` - Number of records to return (default: 50, max: 100)

### Example
```bash
GET /api/messages?roomId=room_123&skip=0&take=50
```

### Response
```json
{
  "messages": [...],
  "hasMore": true,
  "total": 150
}
```

## Filtering and Sorting

Some endpoints support filtering and sorting:

### Messages
```bash
GET /api/messages/search?q=hello&roomId=room_123&skip=0&take=20
```

### Admin Users
```bash
GET /api/admin/users?search=john&skip=0&take=50
```

## Best Practices

1. **Always handle errors gracefully**
   ```typescript
   try {
     const response = await fetch('/api/messages', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(data),
     });
     
     if (!response.ok) {
       const error = await response.json();
       console.error('API Error:', error);
       return;
     }
     
     const result = await response.json();
   } catch (error) {
     console.error('Network error:', error);
   }
   ```

2. **Respect rate limits**
   - Check rate limit headers
   - Implement exponential backoff
   - Cache responses when appropriate

3. **Use TypeScript types**
   ```typescript
   import { Message } from '@/lib/types';
   
   const message: Message = await fetchMessage(id);
   ```

4. **Validate input before sending**
   ```typescript
   import { messageSchema } from '@/lib/validations';
   
   const validated = messageSchema.parse(data);
   await fetch('/api/messages', {
     method: 'POST',
     body: JSON.stringify(validated),
   });
   ```

## Testing

Example using Jest and Supertest:

```typescript
import { createMocks } from 'node-mocks-http';
import { POST } from '@/app/api/messages/route';

describe('POST /api/messages', () => {
  it('should create a new message', async () => {
    const { req } = createMocks({
      method: 'POST',
      body: {
        content: 'Test message',
        roomId: 'room_123',
      },
    });
    
    const response = await POST(req);
    const data = await response.json();
    
    expect(response.status).toBe(201);
    expect(data.message.content).toBe('Test message');
  });
});
```

## Additional Resources

- [Authentication Guide](./authentication.md)
- [WebSocket Documentation](./websocket.md)
- [API Examples](./examples/)
- [Postman Collection](./postman/)

---

For questions or issues with the API, please open an issue on GitHub.

