# Rooms API Endpoints

Complete reference for all room-related API endpoints.

---

## Get Rooms

Retrieve all rooms for the current user.

**Endpoint:** `GET /api/rooms`

**Authentication:** Required

**Response:**

```json
{
  "rooms": [
    {
      "id": "room_123",
      "name": "General",
      "description": "General discussion",
      "createdAt": "2025-12-12T19:00:00.000Z",
      "members": 5,
      "unreadCount": 3
    }
  ]
}
```

---

## Create Room

Create a new room.

**Endpoint:** `POST /api/rooms`

**Authentication:** Required

**Request Body:**

```json
{
  "name": "My Room",
  "description": "Room description",
  "isPrivate": false,
  "members": ["user_456", "user_789"]
}
```

**Response:**

```json
{
  "id": "room_123",
  "name": "My Room",
  "description": "Room description",
  "isPrivate": false,
  "createdAt": "2025-12-12T19:00:00.000Z"
}
```

---

## Update Room

Update room details.

**Endpoint:** `PATCH /api/rooms/[roomId]`

**Authentication:** Required (must be room admin)

**Request Body:**

```json
{
  "name": "Updated Room Name",
  "description": "Updated description"
}
```

---

## Delete Room

Delete a room.

**Endpoint:** `DELETE /api/admin/rooms`

**Authentication:** Required (admin only)

**Query Parameters:**
- `roomId`: string (required)

**Response:**

```json
{
  "success": true,
  "deletedId": "room_123"
}
```

---

## Add Member

Add a member to a room.

**Endpoint:** `POST /api/rooms/[roomId]/members`

**Request Body:**

```json
{
  "userId": "user_456"
}
```

---

## Remove Member

Remove a member from a room.

**Endpoint:** `DELETE /api/rooms/[roomId]/members`

**Query Parameters:**
- `userId`: string (required)

---

## See Also

- [Messages API](./messages.md) - Message operations
- [Users API](./users.md) - User management

