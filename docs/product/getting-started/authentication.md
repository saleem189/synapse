# Authentication

Learn how to authenticate users and manage sessions in Synapse.

---

## Overview

Synapse uses **NextAuth.js** for authentication with JWT tokens. All protected API endpoints require a valid session token.

**Authentication Flow:**

```
1. User registers or logs in
   ↓
2. Server validates credentials
   ↓
3. Server returns JWT access token
   ↓
4. Client includes token in Authorization header
   ↓
5. Server validates token on each request
```

---

## Register a New User

Create a new user account.

**Endpoint:** `POST /api/auth/register`

**Request:**

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com",
    "password": "secure-password-123"
  }'
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | User's full name (3-50 characters) |
| `email` | string | Yes | Valid email address |
| `password` | string | Yes | Strong password (min 8 characters) |

**Response:**

```json
{
  "user": {
    "id": "user_abc123",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "role": "USER",
    "createdAt": "2025-12-12T19:00:00.000Z"
  }
}
```

**Errors:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid input (email format, password strength) |
| 409 | `USER_EXISTS` | Email already registered |
| 500 | `INTERNAL_ERROR` | Server error |

---

## Login

Authenticate an existing user and receive an access token.

**Endpoint:** `POST /api/auth/login`

**Request:**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@example.com",
    "password": "secure-password-123"
  }'
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | User's email address |
| `password` | string | Yes | User's password |

**Response:**

```json
{
  "user": {
    "id": "user_abc123",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "role": "USER"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyX2FiYzEyMyIsImlhdCI6MTYzOTMyMjQwMCwiZXhwIjoxNjM5NDA4ODAwfQ.signature",
  "expiresIn": 86400
}
```

**Fields:**

- `accessToken` - JWT token for authenticating requests
- `expiresIn` - Token expiration in seconds (24 hours)

**Errors:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Missing email or password |
| 401 | `INVALID_CREDENTIALS` | Incorrect email or password |
| 500 | `INTERNAL_ERROR` | Server error |

---

## Making Authenticated Requests

Include the access token in the `Authorization` header for all protected endpoints.

**Example:**

```bash
curl -X GET http://localhost:3000/api/rooms \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Header Format:**

```
Authorization: Bearer <access_token>
```

---

## Get Current User

Retrieve the authenticated user's profile.

**Endpoint:** `GET /api/users/me`

**Request:**

```bash
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**

```json
{
  "id": "user_abc123",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "image": "https://example.com/avatar.jpg",
  "role": "USER",
  "createdAt": "2025-12-12T19:00:00.000Z"
}
```

---

## Update Profile

Update the authenticated user's profile information.

**Endpoint:** `PATCH /api/users/me`

**Request:**

```bash
curl -X PATCH http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "image": "https://example.com/new-avatar.jpg"
  }'
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | Updated name (3-50 characters) |
| `image` | string | No | Avatar URL |

**Response:**

```json
{
  "id": "user_abc123",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "image": "https://example.com/new-avatar.jpg",
  "role": "USER"
}
```

---

## Logout

End the user's session.

**Endpoint:** `POST /api/auth/logout`

**Request:**

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Token Expiration

Access tokens expire after **24 hours**. When a token expires, clients will receive a `401 Unauthorized` response.

**Handling Expiration:**

1. **Detect expired token:**
   ```json
   {
     "error": "Unauthorized",
     "message": "Token has expired"
   }
   ```

2. **Re-authenticate:**
   - Prompt user to log in again
   - Store new access token

---

## Security Best Practices

### Store Tokens Securely

**Do:**
- ✅ Store in memory (React state)
- ✅ Use httpOnly cookies (server-side)
- ✅ Use secure storage (mobile apps)

**Don't:**
- ❌ Store in localStorage (XSS vulnerable)
- ❌ Store in plain text
- ❌ Commit tokens to version control

### Use HTTPS in Production

Always use HTTPS to prevent token interception:

```bash
# Production URL
https://your-domain.com/api/auth/login
```

### Implement Token Refresh (Recommended)

For better UX, implement token refresh:

1. Store refresh token (httpOnly cookie)
2. Use refresh token to get new access token
3. Only require full re-authentication when refresh token expires

---

## Code Examples

### JavaScript/TypeScript

```typescript
// Login and store token
async function login(email: string, password: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  const { accessToken, user } = await response.json();
  
  // Store token in memory or secure storage
  localStorage.setItem('accessToken', accessToken); // ⚠️ Not recommended for production
  
  return { accessToken, user };
}

// Make authenticated request
async function getMessages(roomId: string, token: string) {
  const response = await fetch(`/api/rooms/${roomId}/messages`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return response.json();
}
```

### Python

```python
import requests

# Login
def login(email, password):
    response = requests.post('http://localhost:3000/api/auth/login', json={
        'email': email,
        'password': password
    })
    
    if response.status_code != 200:
        raise Exception('Login failed')
    
    data = response.json()
    return data['accessToken'], data['user']

# Make authenticated request
def get_messages(room_id, token):
    response = requests.get(
        f'http://localhost:3000/api/rooms/{room_id}/messages',
        headers={'Authorization': f'Bearer {token}'}
    )
    
    return response.json()
```

---

## Next Steps

- **[Send Messages](../guides/send-first-message.md)** - Create rooms and send messages
- **[Real-time Events](../guides/realtime-events.md)** - Connect via WebSocket
- **[API Reference](../api-reference/rest/README.md)** - Complete API documentation

---

## Troubleshooting

### 401 Unauthorized

**Problem:** API returns `401 Unauthorized`

**Solutions:**
1. Check token is included in `Authorization` header
2. Verify token hasn't expired (24-hour limit)
3. Ensure token format is `Bearer <token>`
4. Try logging in again to get fresh token

### Invalid Credentials

**Problem:** Login fails with `401 Invalid Credentials`

**Solutions:**
1. Verify email and password are correct
2. Check for typos in email address
3. Ensure password meets minimum requirements
4. Try password reset if available

### Token Format Error

**Problem:** `Invalid token format`

**Solutions:**
1. Include `Bearer` prefix: `Bearer <token>`
2. Don't add extra spaces or newlines
3. Copy entire token from login response

---

## Related

- **[REST API Reference](../api-reference/rest/README.md)**
- **[Error Codes](../api-reference/errors.md)**
- **[Rate Limits](../api-reference/rate-limits.md)**

