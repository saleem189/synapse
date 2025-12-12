# 🏗️ Architecture Overview

**A developer's guide to understanding Synapse's architecture**

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [High-Level Architecture](#high-level-architecture)
4. [Layer Breakdown](#layer-breakdown)
5. [Key Design Patterns](#key-design-patterns)
6. [Data Flow Examples](#data-flow-examples)
7. [Quick Start for Developers](#quick-start-for-developers)

---

## System Overview

Synapse is a real-time chat application with video calling capabilities, built on a modern, scalable architecture.

### What Makes Synapse Unique?

- **Real-Time First:** Socket.io + WebRTC for instant communication
- **Type-Safe:** Full TypeScript coverage, end-to-end
- **Dependency Injection:** 15+ services, all testable and swappable
- **Queue-Based Processing:** Background jobs for heavy tasks
- **Redis-Backed:** Caching + pub/sub + queue management
- **Memory-Safe:** Explicit cleanup of all event listeners

---

## Technology Stack

### Frontend
```
├── React 19            # Latest features (useFormState, useFormStatus)
├── Next.js 15          # App Router, Server Actions, Server Components
├── TypeScript 5.x      # Strict mode enabled
├── Tailwind CSS v4     # Utility-first styling
├── shadcn/ui           # Component library
├── React Query         # Server state management
├── Zustand             # Client state management
├── Socket.io Client    # Real-time communication
└── simple-peer         # WebRTC for video/audio
```

### Backend
```
├── Next.js API Routes  # RESTful endpoints
├── Socket.io Server    # Real-time events (standalone server)
├── PostgreSQL          # Primary database
├── Prisma ORM          # Type-safe database access
├── Redis               # Caching + Queue + Pub/Sub
├── BullMQ              # Background job processing
├── web-push            # Push notifications
└── Zod                 # Runtime validation
```

### Infrastructure
```
├── Docker              # Containerization
├── Sentry              # Error tracking + Performance monitoring
├── GitHub Actions      # CI/CD
└── Vercel (optional)   # Deployment platform
```

---

## High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Browser    │  │  Socket.io   │  │   WebRTC     │         │
│  │  (React 19)  │  │   Client     │  │ (simple-peer)│         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
│         │ HTTP/HTTPS       │ WebSocket        │ P2P (UDP/TCP)   │
│         │                  │                  │                  │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
┌─────────┼──────────────────┼──────────────────┼─────────────────┐
│         ▼                  ▼                  │  SERVER LAYER    │
│  ┌───────────────────────────────┐           │                  │
│  │    Next.js Application        │           │                  │
│  │  ┌─────────────────────────┐  │           │                  │
│  │  │   API Routes            │  │           │                  │
│  │  │  (REST + Server Actions)│  │           │                  │
│  │  └───────┬─────────────────┘  │           │                  │
│  │          │                     │           │                  │
│  │  ┌───────▼─────────────────┐  │     ┌─────▼──────────────┐  │
│  │  │  DI Container (15+ svc) │  │     │  Socket.io Server  │  │
│  │  │  • MessageService       │  │     │  (Standalone)      │  │
│  │  │  • UserService          │  │     │  • Signaling       │  │
│  │  │  • RoomService          │  │     │  • Room events     │  │
│  │  │  • PushService          │  │     │  • Call events     │  │
│  │  │  • CacheService         │  │     │  • Memory mgmt     │  │
│  │  │  • QueueService         │  │     └────────────────────┘  │
│  │  └───────┬─────────────────┘  │                              │
│  │          │                     │                              │
│  │  ┌───────▼─────────────────┐  │                              │
│  │  │  Repository Layer       │  │                              │
│  │  │  • UserRepository       │  │                              │
│  │  │  • RoomRepository       │  │                              │
│  │  │  • MessageRepository    │  │                              │
│  │  └───────┬─────────────────┘  │                              │
│  └──────────┼─────────────────────┘                              │
│             │                                                     │
└─────────────┼─────────────────────────────────────────────────────┘
              │
┌─────────────┼─────────────────────────────────────────────────────┐
│             ▼              DATA LAYER                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │   PostgreSQL     │  │      Redis       │  │   BullMQ Worker │ │
│  │                  │  │                  │  │                 │ │
│  │  • Users         │  │  • Cache         │  │  • Push notif   │ │
│  │  • Rooms         │  │  • Pub/Sub       │  │  • Image proc   │ │
│  │  • Messages      │  │  • Sessions      │  │  • Video proc   │ │
│  │  • CallSessions  │  │  • Queue         │  │  • Email jobs   │ │
│  └──────────────────┘  └──────────────────┘  └─────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Layer Breakdown

### 1. Client Layer

**Responsibilities:**
- UI rendering and user interactions
- Optimistic updates for instant feedback
- Real-time event handling (Socket.io)
- Peer-to-peer connections (WebRTC)

**Key Files:**
```
app/                    # Next.js App Router pages
├── (chat)/            # Chat routes (protected)
├── (admin)/           # Admin routes (admin-only)
├── call/[callId]/     # Video call (full-page route)
components/            # Reusable UI components
├── ui/                # shadcn/ui components
├── chat/              # Chat-specific components
├── admin/             # Admin-specific components
features/              # Feature modules
├── video-call/        # Video call feature
├── mentions/          # @mentions feature
├── pinned-messages/   # Pinned messages feature
hooks/                 # Custom React hooks
└── use-socket.ts      # Socket.io hook
└── use-video-call.ts  # Video call hook
```

---

### 2. Server Layer

**Responsibilities:**
- API request handling
- Business logic execution
- Data validation
- Real-time event management
- Background job scheduling

**Key Files:**
```
app/api/               # Next.js API routes
lib/
├── di/                # Dependency Injection
│   ├── container.ts   # DI container
│   └── providers.ts   # Service registration (⭐ START HERE!)
├── services/          # Business logic (15+ services)
│   ├── message.service.ts
│   ├── user.service.ts
│   ├── room.service.ts
│   ├── push.service.ts
│   └── ...
├── repositories/      # Data access layer
│   ├── message.repository.ts
│   ├── user.repository.ts
│   └── room.repository.ts
├── middleware/        # Request middleware
│   ├── validate-request.ts  # Zod validation
│   └── rate-limit.ts        # Rate limiting
├── queue/             # Background jobs
│   ├── queue-service.ts     # Queue management
│   ├── job-processors.ts    # Job handlers
│   └── queues.ts            # Queue definitions
└── cache/             # Caching layer
    └── cache.service.ts     # Redis caching

backend/
├── server.js          # Socket.io server (⚠️ MEMORY CRITICAL!)
└── worker.ts          # BullMQ worker process
```

---

### 3. Data Layer

**Responsibilities:**
- Data persistence
- Query optimization
- Cache management
- Background job storage

**Key Components:**

#### PostgreSQL (Primary Database)
```
prisma/
├── schema.prisma      # Database schema
└── migrations/        # Migration history
```

**Schema Overview:**
```prisma
model User {
  id            String   @id @default(cuid())
  name          String
  email         String   @unique
  password      String
  role          Role     @default(USER)
  rooms         RoomMember[]
  messages      Message[]
  callSessions  CallParticipant[]
  createdAt     DateTime @default(now())
}

model Room {
  id            String   @id @default(cuid())
  name          String
  isPrivate     Boolean  @default(false)
  members       RoomMember[]
  messages      Message[]
  callSessions  CallSession[]
}

model Message {
  id            String   @id @default(cuid())
  content       String
  userId        String
  roomId        String
  user          User     @relation(fields: [userId], references: [id])
  room          Room     @relation(fields: [roomId], references: [id])
  createdAt     DateTime @default(now())
}

model CallSession {
  id            String   @id @default(cuid())
  roomId        String
  type          CallType @default(VIDEO)
  status        CallStatus @default(ACTIVE)
  participants  CallParticipant[]
  startedAt     DateTime @default(now())
  endedAt       DateTime?
}
```

#### Redis (Multi-Purpose)
```typescript
// 1. Caching (via CacheService)
await cacheService.set('user:123', userData, 3600);
const user = await cacheService.get('user:123');

// 2. Pub/Sub (via EventBus)
await eventBus.publish('user.created', { userId: '123' });

// 3. Queue Storage (via BullMQ)
await pushNotificationQueue.add('send', { userId: '123', payload: {...} });
```

---

## Key Design Patterns

### 1. Dependency Injection (DI)

**Why?**
- ✅ Testable (mock services easily)
- ✅ Flexible (swap implementations)
- ✅ Clear dependencies (explicit in constructor)

**Example:**

```typescript
// ❌ BAD: Direct import (hard to test)
import { UserService } from '@/lib/services/user.service';

export async function GET() {
  const userService = new UserService(/* what dependencies? */);
  return userService.getUsers();
}

// ✅ GOOD: DI container (easy to test)
import { getService } from '@/lib/di';
import type { UserService } from '@/lib/services/user.service';

export async function GET() {
  const userService = await getService<UserService>('userService');
  return userService.getUsers();
}
```

**How It Works:**
```typescript
// 1. Services are registered in lib/di/providers.ts
container.register('userService', async () => {
  const userRepo = await container.resolve('userRepository');
  const logger = await container.resolve('logger');
  return new UserService(userRepo, logger);
}, true); // true = singleton

// 2. Services are resolved in API routes
const userService = await getService<UserService>('userService');
```

---

### 2. Repository Pattern

**Why?**
- ✅ Separates data access from business logic
- ✅ Enables caching without changing business logic
- ✅ Easy to test (mock repository)

**Example:**

```typescript
// ❌ BAD: Direct Prisma access in API route
export async function GET() {
  const users = await prisma.user.findMany();
  return NextResponse.json({ users });
}

// ✅ GOOD: Repository pattern with caching
export async function GET() {
  const userRepo = await getService<UserRepository>('userRepository');
  const users = await userRepo.findAll(); // Cached automatically!
  return NextResponse.json({ users });
}
```

**Repository with Caching:**
```typescript
export class UserRepository {
  constructor(
    private db: PrismaClient,
    private cache: CacheService
  ) {}

  async findById(id: string): Promise<User | null> {
    // Try cache first
    const cacheKey = `user:${id}`;
    const cached = await this.cache.get<User>(cacheKey);
    if (cached) return cached;

    // Cache miss - query database
    const user = await this.db.user.findUnique({ where: { id } });
    if (user) {
      await this.cache.set(cacheKey, user, 3600); // 1 hour TTL
    }
    return user;
  }
}
```

---

### 3. Service Layer

**Why?**
- ✅ Business logic separated from API routes
- ✅ Reusable across different routes
- ✅ Testable in isolation

**Example:**

```typescript
//Services handle complex business logic
export class MessageService {
  constructor(
    private messageRepo: MessageRepository,
    private roomRepo: RoomRepository,
    private logger: ILogger,
    private cacheService: CacheService,
    private notificationService: MessageNotificationService
  ) {}

  async createMessage(data: CreateMessageDto): Promise<Message> {
    // 1. Validate room exists
    const room = await this.roomRepo.findById(data.roomId);
    if (!room) throw new Error('Room not found');

    // 2. Create message in database
    const message = await this.messageRepo.create(data);

    // 3. Invalidate cache
    await this.cacheService.invalidate(`messages:room:${data.roomId}*`);

    // 4. Send notifications (background queue)
    await this.notificationService.sendPushNotifications(
      data.roomId,
      data.userId,
      data.content,
      'text'
    );

    // 5. Log
    this.logger.log(`Message created: ${message.id}`, {
      component: 'MessageService',
      roomId: data.roomId,
    });

    return message;
  }
}
```

---

### 4. Event-Driven Architecture

**Why?**
- ✅ Decoupled components
- ✅ Real-time updates
- ✅ Scalable (multiple servers via Redis)

**Example:**

```typescript
// Server-side event emission (Socket.io)
io.to(roomId).emit('message:new', {
  id: message.id,
  content: message.content,
  userId: message.userId,
  createdAt: message.createdAt,
});

// Client-side event handling
socket.on('message:new', (message) => {
  // Update UI with new message
  queryClient.setQueryData(['messages', roomId], (old) => {
    return [...old, message];
  });
});
```

---

### 5. Queue-Based Processing

**Why?**
- ✅ Offload heavy tasks (push notifications, file processing)
- ✅ Retry failed jobs automatically
- ✅ Rate limiting built-in

**Example:**

```typescript
// Enqueue job (fast, non-blocking)
await queueService.addPushNotification({
  userId: 'user_123',
  payload: {
    title: 'New Message',
    body: 'John: Hello!',
    url: '/chat/room-123',
  },
});

// Worker processes job (background process)
export async function processPushNotification(job: Job) {
  const { userId, payload } = job.data;
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  // Send to all subscriptions
  await Promise.all(
    subscriptions.map((sub) =>
      webpush.sendNotification(sub, JSON.stringify(payload))
    )
  );
}
```

---

## Data Flow Examples

### Example 1: Sending a Message

**Step-by-Step:**

```
1. User types message and hits Send
   ↓
2. Client: Optimistic update (instant UI feedback)
   queryClient.setQueryData(['messages', roomId], (old) => [...old, optimisticMessage])
   ↓
3. Client: POST /api/rooms/[roomId]/messages
   {
     content: "Hello!",
     roomId: "room_123"
   }
   ↓
4. API Route: Validate input (Zod schema)
   const result = validateRequest(req, createMessageSchema);
   ↓
5. API Route: Check authentication
   const session = await getServerSession();
   if (!session) return 401;
   ↓
6. API Route: Call MessageService
   const messageService = await getService<MessageService>('messageService');
   const message = await messageService.createMessage({
     content: "Hello!",
     userId: session.user.id,
     roomId: "room_123"
   });
   ↓
7. MessageService: Save to database (via MessageRepository)
   const message = await this.messageRepo.create(data);
   ↓
8. MessageService: Invalidate cache
   await this.cacheService.invalidate(`messages:room:${roomId}*`);
   ↓
9. MessageService: Queue push notifications
   await this.notificationService.sendPushNotifications(...);
   ↓
10. API Route: Broadcast via Socket.io
    io.to(roomId).emit('message:new', message);
    ↓
11. All connected clients receive 'message:new' event
    socket.on('message:new', (msg) => {
      queryClient.setQueryData(['messages', roomId], (old) => [...old, msg]);
    });
    ↓
12. Background Worker: Process push notifications
    Send to offline users
```

---

### Example 2: Starting a Video Call

```
1. User clicks "Start Video Call"
   ↓
2. Client: Request camera/microphone permissions
   const stream = await navigator.mediaDevices.getUserMedia({
     video: true,
     audio: true
   });
   ↓
3. Client: Create call session
   POST /api/call-sessions
   { roomId: "room_123", type: "VIDEO" }
   ↓
4. API Route: Save call session to database
   const callSession = await prisma.callSession.create({...});
   ↓
5. Client: Emit call-initiate via Socket.io
   socket.emit('call-initiate', {
     callId: callSession.id,
     roomId: "room_123",
     participants: ["user_456"]
   });
   ↓
6. Socket.io Server: Broadcast to room participants
   socket.to('user_456').emit('call-incoming', {
     callId: callSession.id,
     from: "user_123",
     type: "VIDEO"
   });
   ↓
7. Target user accepts call
   socket.emit('call-accept', { callId });
   ↓
8. WebRTC: Create peer connection
   const peer = new Peer({ initiator: true });
   peer.addStream(localStream);
   ↓
9. WebRTC: Exchange signals via Socket.io
   peer.on('signal', (signal) => {
     socket.emit('webrtc-signal', { to: 'user_456', signal });
   });
   ↓
10. WebRTC: Connection established (P2P)
    peer.on('stream', (remoteStream) => {
      remoteVideoRef.current.srcObject = remoteStream;
    });
    ↓
11. Call ends: Update database
    PATCH /api/call-sessions/[id]
    { status: "ENDED", endedAt: new Date() }
```

---

## Quick Start for Developers

### New to the Codebase?

**Read in this order:**

1. **This file** (`01-ARCHITECTURE-OVERVIEW.md`) - Understanding the big picture
2. **`02-DEPENDENCY-INJECTION.md`** - How services work
3. **`CODEBASE_GUIDE.md`** - What services already exist
4. **`03-SOCKET-IO-AND-WEBRTC.md`** - Real-time communication
5. **`07-API-PATTERNS.md`** - How to create new API routes

### Want to Add a Feature?

**Checklist:**

- [ ] Check if similar functionality exists (read `CODEBASE_GUIDE.md`)
- [ ] Check if a service already handles this (15+ services available)
- [ ] Follow the architecture patterns in this doc
- [ ] Use DI container for all services
- [ ] Add Zod validation for all inputs
- [ ] Add proper error handling
- [ ] Update documentation

### Common Tasks

| Task | Where to Look |
|------|--------------|
| Add new API endpoint | `app/api/` + use existing services |
| Add new service | `lib/services/` + register in `lib/di/providers.ts` |
| Add background job | `lib/queue/job-processors.ts` |
| Add Socket.io event | `backend/server.js` |
| Add UI component | `components/` (check `components/ui/` first!) |
| Add new page | `app/(chat)/` or `app/(admin)/` |
| Modify database | `prisma/schema.prisma` + `prisma migrate dev` |

---

## Performance Considerations

### What We Do Right

✅ **Caching Strategy:**
- Redis caching for frequently accessed data
- 1-hour TTL for user data
- 5-minute TTL for room data
- Automatic cache invalidation on updates

✅ **Connection Pooling:**
- Prisma connection pooling (10 connections)
- Redis connection reuse

✅ **Lazy Loading:**
- Dynamic imports for heavy components
- Video call components loaded on-demand

✅ **Optimistic Updates:**
- Instant UI feedback
- React Query handles rollback on error

✅ **Background Processing:**
- Push notifications queued
- File processing offloaded
- Email sending async

---

## Security Layers

```
Request Flow with Security Layers:

Client Request
  ↓
1. HTTPS/WSS (Transport Layer Security)
  ↓
2. CORS (Cross-Origin Resource Sharing)
  ↓
3. Rate Limiting (5-100 req/min based on endpoint)
  ↓
4. Authentication (NextAuth session check)
  ↓
5. Authorization (Role-based access control)
  ↓
6. Input Validation (Zod schemas)
  ↓
7. Business Logic (Services)
  ↓
8. Database Query (Prisma - parameterized queries)
  ↓
Response
```

---

## Next Steps

Now that you understand the architecture, dive deeper:

- **[02-DEPENDENCY-INJECTION.md](./02-DEPENDENCY-INJECTION.md)** - Master the DI container
- **[03-SOCKET-IO-AND-WEBRTC.md](./03-SOCKET-IO-AND-WEBRTC.md)** - Real-time communication
- **[04-QUEUE-SYSTEM.md](./04-QUEUE-SYSTEM.md)** - Background jobs
- **[05-NOTIFICATION-SYSTEM.md](./05-NOTIFICATION-SYSTEM.md)** - Push notifications
- **[06-FRONTEND-PATTERNS.md](./06-FRONTEND-PATTERNS.md)** - React patterns
- **[07-API-PATTERNS.md](./07-API-PATTERNS.md)** - Creating API routes
- **[08-MEMORY-MANAGEMENT.md](./08-MEMORY-MANAGEMENT.md)** - Preventing memory leaks

---

**Questions?** Check the [CODEBASE_GUIDE.md](./CODEBASE_GUIDE.md) for existing services and patterns.

