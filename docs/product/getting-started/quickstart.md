# Quickstart

Get Synapse running locally and make your first API call in 5 minutes.

---

## What You'll Build

By the end of this guide, you'll have:

- Synapse running locally on your machine
- Created your first user account
- Authenticated and received an access token
- Created a chat room
- Sent your first message

**Time:** ~5 minutes

---

## Prerequisites

Before you begin, make sure you have:

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **PostgreSQL 14+** - [Download here](https://www.postgresql.org/download/)
- **Redis 6+** - [Download here](https://redis.io/download/)
- **Git** - [Download here](https://git-scm.com/)

---

## Step 1: Clone and Install

Clone the repository and install dependencies:

```bash
git clone https://github.com/saleem189/synapse.git
cd synapse
npm install
```

---

## Step 2: Quick Setup (Recommended)

**Use the automated setup script:**

```bash
npm run setup
```

This will:
- Start PostgreSQL and Redis via Docker Compose
- Wait for services to be ready
- Generate Prisma client
- Run database migrations

**Or manual setup:**

```bash
# Start Docker services
npm run docker:up

# Copy environment file
cp env-example.txt .env

# Run migrations
npx prisma migrate dev
npx prisma generate
```

---

## Step 3: Start Development Servers

**Option 1 - One Command (Recommended):**

```bash
npm run dev:all
```

This starts all three services concurrently:
- Next.js app (port 3000)
- Socket.io server (port 3001)  
- Background worker

**Option 2 - Separate Terminals:**

If you prefer separate terminals:

```bash
# Terminal 1 - Next.js App
npm run dev

# Terminal 2 - Socket.io Server
npm run server

# Terminal 3 - Background Worker
npm run worker
```

**Verify:**
- Next.js: http://localhost:3000
- Socket.io: http://localhost:3001/health
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- pgAdmin: http://localhost:8082 (optional)

---

## Step 4: Create Your First User

**Register a new user:**

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "secure-password-123"
  }'
```

**Response:**

```json
{
  "user": {
    "id": "user_abc123",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER"
  }
}
```

---

## Step 5: Authenticate

**Login to get an access token:**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "secure-password-123"
  }'
```

**Response:**

```json
{
  "user": {
    "id": "user_abc123",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Save your access token** - you'll need it for subsequent requests.

---

## Step 6: Create a Chat Room

**Create a new room:**

```bash
curl -X POST http://localhost:3000/api/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "My First Room",
    "description": "A test chat room",
    "isPrivate": false
  }'
```

**Response:**

```json
{
  "id": "room_xyz789",
  "name": "My First Room",
  "description": "A test chat room",
  "isPrivate": false,
  "createdAt": "2025-12-12T19:00:00.000Z"
}
```

**Save your room ID** - you'll need it to send messages.

---

## Step 7: Send Your First Message

**Send a message to the room:**

```bash
curl -X POST http://localhost:3000/api/rooms/room_xyz789/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "content": "Hello, Synapse! This is my first message."
  }'
```

**Response:**

```json
{
  "id": "msg_def456",
  "content": "Hello, Synapse! This is my first message.",
  "userId": "user_abc123",
  "roomId": "room_xyz789",
  "createdAt": "2025-12-12T19:01:00.000Z",
  "user": {
    "id": "user_abc123",
    "name": "John Doe",
    "image": null
  }
}
```

---

## Success!

You've successfully:

- ✅ Set up Synapse locally
- ✅ Created a user account
- ✅ Authenticated and received an access token
- ✅ Created a chat room
- ✅ Sent your first message

---

## Next Steps

Now that you have Synapse running, explore these guides:

- **[Authentication](../api-reference/authentication.md)** - Learn about session management
- **[Send Messages](../guides/send-first-message.md)** - Detailed messaging guide
- **[Real-time Events](../guides/realtime-events.md)** - Listen for live updates
- **[Start a Video Call](../guides/start-video-call.md)** - Enable video calling

---

## Common Issues

### Database Connection Failed

**Error:** `Can't reach database server`

**Solution:** Make sure PostgreSQL is running:

```bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql

# Windows
# Start PostgreSQL from Services
```

### Port Already in Use

**Error:** `Port 3000 is already in use`

**Solution:** Kill the process or change the port:

```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or change port in package.json
# "dev": "next dev -p 3001"
```

### Redis Connection Failed

**Error:** `Redis connection failed`

**Solution:** Make sure Redis is running:

```bash
# macOS
brew services start redis

# Linux
sudo systemctl start redis

# Windows
# Start Redis from WSL or download Windows version
```

---

## Need Help?

- **[GitHub Issues](https://github.com/saleem189/synapse/issues)** - Report problems
- **[GitHub Discussions](https://github.com/saleem189/synapse/discussions)** - Ask questions
- **[API Reference](../api-reference/rest/README.md)** - Complete API documentation

