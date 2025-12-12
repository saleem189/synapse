# Users API Endpoints

Complete reference for all user-related API endpoints.

---

## Get Users

Retrieve all users (admin only).

**Endpoint:** `GET /api/admin/users`

**Authentication:** Required (admin role)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `skip` | number | No | Number of records to skip (default: 0) |
| `take` | number | No | Number of records to return (default: 50, max: 100) |
| `search` | string | No | Search by name or email |

**Response:**

```json
{
  "users": [
    {
      "id": "user_123",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "USER",
      "createdAt": "2025-12-12T19:00:00.000Z"
    }
  ],
  "total": 100
}
```

---

## Get Current User

Get the currently authenticated user.

**Endpoint:** `GET /api/users/me`

**Authentication:** Required

**Response:**

```json
{
  "id": "user_123",
  "name": "John Doe",
  "email": "john@example.com",
  "image": "/avatar.png",
  "role": "USER",
  "createdAt": "2025-12-12T19:00:00.000Z"
}
```

---

## Update User

Update user profile.

**Endpoint:** `PATCH /api/users/[userId]`

**Authentication:** Required (must be the user or admin)

**Request Body:**

```json
{
  "name": "Updated Name",
  "image": "/new-avatar.png"
}
```

---

## Delete User

Delete a user account (admin only).

**Endpoint:** `DELETE /api/admin/users`

**Authentication:** Required (admin role)

**Query Parameters:**
- `userId`: string (required)

**Response:**

```json
{
  "success": true,
  "deletedId": "user_123"
}
```

---

## See Also

- [Messages API](./messages.md)
- [Rooms API](./rooms.md)

