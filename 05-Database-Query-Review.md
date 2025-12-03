# Database & Query Review - Chatflow Communication Application

**Review Date:** 2024  
**Focus:** N+1 Queries, Indexing, Transactions, Query Optimization, Schema

---

## 📊 Database Overview

### Technology: PostgreSQL 16
### ORM: Prisma 5.17.0
### Overall Assessment: 7.0/10

The database schema is **well-designed** with proper relationships and indexes. However, there are **N+1 query risks** and **missing optimizations** that could impact performance at scale.

---

## 1. N+1 Query Analysis

### ⚠️ **Potential N+1 Issues:**

#### **1.1 Room Participants Query**

**Location:** `lib/repositories/room.repository.ts:83-140`

**Current:**
```typescript
async findByUserId(userId: string, options?: {...}): Promise<RoomWithRelations[]> {
  const rooms = await this.prisma.chatRoom.findMany({
    where: {
      participants: { some: { userId } }
    },
    include: {
      participants: {
        take: 10, // ✅ Limited
        include: ROOM_PARTICIPANT_INCLUDE,
      },
      // ...
    }
  });
  
  // ✅ Good: Separate query for last messages
  const lastMessages = await this.prisma.message.findMany({
    where: { roomId: { in: roomIds } },
    distinct: ['roomId'],
    // ...
  });
}
```

**Status:** ✅ **No N+1** - Uses batch query for messages

---

#### **1.2 Message Reactions Query**

**Location:** `lib/repositories/message.repository.ts:43-105`

**Current:**
```typescript
async findByRoomId(roomId: string, options?: {...}) {
  const messages = await this.prisma.message.findMany({
    include: {
      reactions: {
        include: {
          user: { select: {...} } // ✅ Included in same query
        }
      }
    }
  });
}
```

**Status:** ✅ **No N+1** - Prisma includes relations in single query

---

#### **1.3 Potential N+1 in Service Layer**

**Location:** `lib/services/message.service.ts:322-351`

**Problem:**
```typescript
const transformedMessages = messagesToReturn.map((message) => {
  // ❌ Potential: If reactions not included, this would cause N+1
  const reactionsByEmoji = this.groupReactionsByEmoji(message.reactions);
  
  return {
    // ...
    reactions: reactionsByEmoji,
  };
});
```

**Status:** ✅ **Safe** - Reactions included in repository query

---

#### **1.4 Read Receipts Query**

**Location:** `lib/repositories/message.repository.ts:265-275`

**Current:**
```typescript
async getReadReceipts(messageId: string) {
  return this.prisma.messageRead.findMany({
    where: { messageId },
    include: {
      user: { select: USER_SELECT },
    },
  });
}
```

**Status:** ✅ **No N+1** - Single query with include

---

### ✅ **Good Practices:**
- Repository methods use `include` for relations
- Batch queries for related data
- Limited participant fetching (take: 10)

---

## 2. Indexing Analysis

### ✅ **Existing Indexes:**

```prisma
// User
@@index([email])
@@index([status])

// ChatRoom
@@index([ownerId])
@@index([updatedAt])

// RoomParticipant
@@index([userId])
@@index([roomId])
@@unique([userId, roomId])

// Message
@@index([roomId, createdAt])
@@index([roomId, isDeleted, createdAt]) // ✅ Composite
@@index([senderId])
@@index([replyToId])

// MessageReaction
@@index([messageId])
@@unique([messageId, userId, emoji])

// MessageRead
@@index([messageId])
@@index([userId])
@@unique([messageId, userId])
```

### ⚠️ **Missing Indexes:**

#### **2.1 Message Search Index**

**Location:** `lib/repositories/message.repository.ts:131-148`

**Problem:**
```typescript
async search(roomId: string, query: string, limit: number = 20) {
  return this.prisma.message.findMany({
    where: {
      roomId,
      isDeleted: false,
      content: {
        contains: query, // ❌ No index for text search
        mode: 'insensitive',
      },
    },
  });
}
```

**Solution:**
```prisma
// Add GIN index for full-text search
model Message {
  // ...
  
  @@index([roomId, isDeleted, createdAt])
  @@index([roomId, content(ops: "gin_trgm_ops")], type: Gin) // Full-text search
}
```

**SQL:**
```sql
CREATE INDEX idx_message_content_search ON messages 
USING gin (content gin_trgm_ops);

-- Enable extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

**Priority:** 🔴 High (Search performance)

---

#### **2.2 User Status + LastSeen Composite Index**

**Location:** Queries filtering by status and sorting by lastSeen

**Problem:**
```typescript
// Common query pattern
const onlineUsers = await prisma.user.findMany({
  where: { status: 'online' },
  orderBy: { lastSeen: 'desc' },
});
```

**Solution:**
```prisma
model User {
  // ...
  @@index([status, lastSeen]) // Composite for filtering + sorting
}
```

**Priority:** 🟡 Medium

---

#### **2.3 Room UpdatedAt for Sorting**

**Status:** ✅ **Already indexed** - `@@index([updatedAt])`

---

## 3. Transaction Handling

### ⚠️ **Issues:**

#### **3.1 Missing Transactions in Multi-Step Operations**

**Location:** `lib/services/message.service.ts:28-132`

**Problem:**
```typescript
async sendMessage(...) {
  // Step 1: Create message
  const message = await this.messageRepo.create({...});
  
  // Step 2: Update room timestamp
  await this.roomRepo.update(roomId, { updatedAt: new Date() });
  
  // ❌ Not atomic - if step 2 fails, message exists but room not updated
}
```

**Solution:**
```typescript
async sendMessage(...) {
  return await this.prisma.$transaction(async (tx) => {
    // Create message
    const message = await tx.message.create({...});
    
    // Update room
    await tx.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() }
    });
    
    // Fetch full message
    const fullMessage = await tx.message.findUnique({
      where: { id: message.id },
      include: {...}
    });
    
    return fullMessage;
  });
}
```

**Priority:** 🔴 High (Data consistency)

---

#### **3.2 Good Transaction Usage**

**Location:** `lib/repositories/message.repository.ts:155-196`

**Status:** ✅ **Good** - `markAsRead` uses transaction with retry logic

```typescript
async markAsRead(messageId: string, userId: string): Promise<void> {
  await this.prisma.$transaction(async (tx) => {
    // Atomic check and create/update
    const existing = await tx.messageRead.findUnique({...});
    if (existing) {
      await tx.messageRead.update({...});
    } else {
      await tx.messageRead.create({...});
    }
  });
}
```

---

#### **3.3 Missing Transaction in Room Creation**

**Location:** `lib/services/room.service.ts` (check room creation)

**Problem:**
- Room creation + participant addition should be atomic

**Solution:**
```typescript
async createRoom(...) {
  return await this.prisma.$transaction(async (tx) => {
    const room = await tx.chatRoom.create({...});
    await tx.roomParticipant.createMany({
      data: participantIds.map(id => ({
        roomId: room.id,
        userId: id,
      }))
    });
    return room;
  });
}
```

**Priority:** 🔴 High

---

## 4. Query Optimization

### ⚠️ **Issues:**

#### **4.1 Unnecessary Data Fetching**

**Location:** `lib/repositories/message.repository.ts:110-126`

**Problem:**
```typescript
async findByIdWithRelations(id: string, userId?: string) {
  const message = await this.prisma.message.findUnique({
    where: { id },
    include: {
      ...MESSAGE_INCLUDE_FULL, // Includes all relations
      readReceipts: userId ? { where: { userId } } : true,
    },
  });
}
```

**Issue:**
- Always fetches all relations, even when not needed
- Could be more selective

**Solution:**
```typescript
async findByIdWithRelations(
  id: string,
  userId?: string,
  options?: {
    includeReactions?: boolean;
    includeReadReceipts?: boolean;
    includeReplyTo?: boolean;
  }
) {
  const include: any = {
    sender: { select: USER_SELECT },
  };
  
  if (options?.includeReactions) {
    include.reactions = { include: { user: { select: USER_SELECT } } };
  }
  
  if (options?.includeReadReceipts) {
    include.readReceipts = userId 
      ? { where: { userId } }
      : true;
  }
  
  if (options?.includeReplyTo) {
    include.replyTo = { include: { sender: { select: USER_SELECT } } };
  }
  
  return this.prisma.message.findUnique({
    where: { id },
    include,
  });
}
```

**Priority:** 🟡 Medium

---

#### **4.2 No Query Result Caching**

**Problem:**
- Repeated queries hit database
- No caching layer

**Solution:**
```typescript
// Add caching layer
async findByIdWithRelations(id: string, userId?: string) {
  const cacheKey = `message:${id}:${userId || 'all'}`;
  
  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Query database
  const message = await this.prisma.message.findUnique({...});
  
  // Cache result
  if (message) {
    await redis.setex(cacheKey, 300, JSON.stringify(message)); // 5 min TTL
  }
  
  return message;
}
```

**Priority:** 🔴 High (Performance)

---

#### **4.3 Missing Query Timeouts**

**Problem:**
- No timeout on long-running queries
- Could hang indefinitely

**Solution:**
```typescript
// Prisma query timeout
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?connect_timeout=10&statement_timeout=5000',
    },
  },
});

// Or use Promise.race
async function withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), timeout)
    )
  ]);
}
```

**Priority:** 🟡 Medium

---

## 5. Schema Consistency

### ✅ **Good Practices:**
- Consistent naming conventions
- Proper foreign keys
- Cascade deletes configured
- Unique constraints

### ⚠️ **Issues:**

#### **5.1 Missing Soft Delete for Users**

**Problem:**
```prisma
model User {
  // ❌ No isDeleted or deletedAt field
  // Hard delete removes all related data
}
```

**Solution:**
```prisma
model User {
  // ...
  isDeleted Boolean @default(false)
  deletedAt DateTime?
  
  @@index([isDeleted])
}
```

**Priority:** 🟡 Medium

---

#### **5.2 Missing Timestamps on Some Models**

**Status:** ✅ **Good** - All models have createdAt/updatedAt

---

#### **5.3 Missing Enum Types**

**Problem:**
```prisma
model User {
  role String @default("user") // ❌ Should be enum
  status String @default("offline") // ❌ Should be enum
}

model Message {
  type String @default("text") // ❌ Should be enum
}
```

**Solution:**
```prisma
enum UserRole {
  USER
  ADMIN
}

enum UserStatus {
  ONLINE
  OFFLINE
  AWAY
}

enum MessageType {
  TEXT
  IMAGE
  VIDEO
  FILE
  AUDIO
}

model User {
  role UserRole @default(USER)
  status UserStatus @default(OFFLINE)
}

model Message {
  type MessageType @default(TEXT)
}
```

**Priority:** 🟡 Medium (Data integrity)

---

## 6. Data Validation

### ✅ **Good Practices:**
- Zod schemas for API validation
- Prisma type safety

### ⚠️ **Issues:**

#### **6.1 Missing Database-Level Constraints**

**Problem:**
- Validation only at application level
- Database doesn't enforce constraints

**Solution:**
```prisma
model Message {
  content String
  // ❌ No length constraint
  
  // ✅ Add constraint
  content String @db.VarChar(2000) // Max length enforced by DB
}

model User {
  email String @unique
  // ❌ No email format validation at DB level
  
  // ✅ Add check constraint (PostgreSQL)
  // @@check([email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'])
}
```

**Priority:** 🟡 Medium

---

## 7. ORM Performance

### ✅ **Good Practices:**
- Using Prisma's include for relations
- Selective field fetching
- Proper use of select vs include

### ⚠️ **Issues:**

#### **7.1 Missing Connection Pooling Configuration**

**Problem:**
```typescript
// lib/prisma.ts
const prisma = new PrismaClient();
// ❌ No explicit pool configuration
```

**Solution:**
```typescript
// Configure connection pool
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?connection_limit=20&pool_timeout=10',
    },
  },
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn']
    : ['error'],
});
```

**Priority:** 🔴 High

---

#### **7.2 No Query Logging in Production**

**Problem:**
- No visibility into slow queries
- Can't optimize without data

**Solution:**
```typescript
// Enable query logging
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
  ],
});

prisma.$on('query', (e) => {
  if (e.duration > 1000) { // Log slow queries
    logger.warn('Slow query detected', {
      query: e.query,
      duration: e.duration,
      params: e.params,
    });
  }
});
```

**Priority:** 🟡 Medium

---

## 8. Latency Hotspots

### ⚠️ **Potential Issues:**

#### **8.1 Room List Query**

**Location:** `lib/repositories/room.repository.ts:83-140`

**Complexity:**
- Fetches rooms with participants
- Fetches last messages separately
- Multiple includes

**Optimization:**
```typescript
// Use raw SQL for complex queries if needed
async findByUserId(userId: string) {
  const rooms = await this.prisma.$queryRaw`
    SELECT 
      r.*,
      json_agg(DISTINCT p.*) as participants,
      json_agg(m.* ORDER BY m.created_at DESC LIMIT 1) as last_message
    FROM chat_rooms r
    JOIN room_participants p ON r.id = p.room_id
    LEFT JOIN messages m ON r.id = m.room_id AND m.is_deleted = false
    WHERE p.user_id = ${userId}
    GROUP BY r.id
    ORDER BY r.updated_at DESC
  `;
}
```

**Priority:** 🟡 Medium (Only if performance issues)

---

## 📊 Database Score: 7.0/10

### Breakdown:
- **N+1 Queries:** 8/10 (Well handled)
- **Indexing:** 7/10 (Good, missing some)
- **Transactions:** 6/10 (Missing in some places)
- **Query Optimization:** 7/10 (Good, could improve)
- **Schema Design:** 8/10 (Well designed)
- **Data Validation:** 7/10 (Good, could add DB constraints)
- **ORM Performance:** 7/10 (Good usage)
- **Latency:** 7/10 (Acceptable)

---

## 🎯 Recommendations

### Critical (Week 1)
1. ✅ Add transactions to multi-step operations
2. ✅ Configure connection pooling
3. ✅ Add full-text search index for messages
4. ✅ Implement query result caching

### High Priority (Month 1)
1. ✅ Add composite indexes for common query patterns
2. ✅ Add query timeouts
3. ✅ Enable query logging for slow queries
4. ✅ Add database-level constraints

### Medium Priority (Quarter 1)
1. ✅ Consider enum types for status fields
2. ✅ Add soft delete for users
3. ✅ Optimize complex queries with raw SQL if needed
4. ✅ Add selective field fetching options

---

*End of Database & Query Review*

