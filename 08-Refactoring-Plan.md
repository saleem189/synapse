# Refactoring Plan - Chatflow Communication Application

**Review Date:** 2024  
**Focus:** Prioritized Refactoring Roadmap, Code Improvements, Architecture Evolution

---

## 📋 Refactoring Overview

This document outlines a **prioritized refactoring plan** to address code quality issues, improve maintainability, and enhance the architecture.

---

## 🎯 Refactoring Priorities

### Phase 1: Critical Fixes (Week 1-2)
**Goal:** Fix security vulnerabilities and critical bugs

#### **1.1 Fix Socket Authentication** 🔴 CRITICAL
**Location:** `backend/server.js:240-263`

**Current:**
```javascript
if (typeof token === 'string' && token.length > 0) {
  socket.userId = token; // ❌ Accepts any string
}
```

**Refactor:**
```javascript
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication required'));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, status: true }
    });
    
    if (!user || user.status === 'banned') {
      return next(new Error('Invalid or banned user'));
    }
    
    socket.userId = user.id;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});
```

**Effort:** 4 hours  
**Impact:** 🔴 Critical security fix

---

#### **1.2 Add Database Transactions** 🔴 HIGH
**Location:** `lib/services/message.service.ts:28-132`

**Refactor:**
```typescript
async sendMessage(...) {
  return await this.prisma.$transaction(async (tx) => {
    const message = await tx.message.create({...});
    await tx.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() }
    });
    return await tx.message.findUnique({
      where: { id: message.id },
      include: {...}
    });
  });
}
```

**Effort:** 8 hours  
**Impact:** 🔴 Data consistency

---

#### **1.3 Implement Distributed Rate Limiting** 🔴 HIGH
**Location:** `lib/rate-limit.ts`

**Refactor:**
```typescript
import { RateLimiterRedis } from 'rate-limiter-flexible';

export const messageRateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rl:message:',
  points: 20,
  duration: 60,
});
```

**Effort:** 6 hours  
**Impact:** 🔴 Scalability

---

#### **1.4 Add Query Result Caching** 🔴 HIGH
**Location:** All repository methods

**Refactor:**
```typescript
// Create CacheService
export class CacheService {
  async get<T>(key: string): Promise<T | null> {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  async set(key: string, value: any, ttl: number) {
    await redis.setex(key, ttl, JSON.stringify(value));
  }
}

// Update repositories
async findById(id: string) {
  const cacheKey = `room:${id}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) return cached;
  
  const room = await this.prisma.chatRoom.findUnique({...});
  if (room) {
    await cacheService.set(cacheKey, room, 300);
  }
  return room;
}
```

**Effort:** 16 hours  
**Impact:** 🔴 Performance

---

### Phase 2: Code Quality (Week 3-4)
**Goal:** Improve code maintainability and reduce complexity

#### **2.1 Refactor sendMessage Method** 🟡 MEDIUM
**Location:** `lib/services/message.service.ts:28-132`

**Problem:** Method does too much (573 lines total, sendMessage is complex)

**Refactor:**
```typescript
// Extract validation
private async validateMessage(userId: string, roomId: string, content: string, options?: {...}) {
  // Validation logic
}

// Extract message creation
private async createMessage(userId: string, roomId: string, content: string, options?: {...}) {
  // Message creation logic
}

// Simplified main method
async sendMessage(...) {
  await this.validateMessage(userId, roomId, content, options);
  const message = await this.createMessage(userId, roomId, content, options);
  await this.updateRoomTimestamp(roomId);
  const fullMessage = await this.fetchFullMessage(message.id, userId);
  await this.publishMessageCreatedEvent(fullMessage);
  return fullMessage;
}
```

**Effort:** 12 hours  
**Impact:** 🟡 Maintainability

---

#### **2.2 Extract Duplicate Code** 🟡 MEDIUM
**Location:** `lib/services/message.service.ts:443-460, 500-511`

**Refactor:**
```typescript
// lib/utils/reaction-utils.ts
export function groupReactionsByEmoji(
  reactions: Array<{ emoji: string; user: {...} }>
): Record<string, Array<{ id: string; name: string; avatar: string | null }>> {
  return reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push({
      id: reaction.user.id,
      name: reaction.user.name,
      avatar: reaction.user.avatar,
    });
    return acc;
  }, {} as Record<string, Array<{ id: string; name: string; avatar: string | null }>>);
}
```

**Effort:** 4 hours  
**Impact:** 🟡 Code reuse

---

#### **2.3 Extract Authorization Checks** 🟡 MEDIUM
**Location:** Multiple service methods

**Refactor:**
```typescript
// Base service class
abstract class BaseService {
  protected async requireParticipant(roomId: string, userId: string) {
    const isParticipant = await this.roomRepo.isParticipant(roomId, userId);
    if (!isParticipant) {
      throw new ForbiddenError(ERROR_MESSAGES.ACCESS_DENIED);
    }
  }
  
  protected async requireOwnership(resourceId: string, userId: string, checkFn: (id: string) => Promise<{ senderId: string }>) {
    const resource = await checkFn(resourceId);
    if (resource.senderId !== userId) {
      throw new ForbiddenError(ERROR_MESSAGES.ACCESS_DENIED);
    }
  }
}

// Usage
class MessageService extends BaseService {
  async editMessage(messageId: string, userId: string, content: string) {
    await this.requireOwnership(messageId, userId, (id) => this.messageRepo.findById(id));
    // ... rest of method
  }
}
```

**Effort:** 8 hours  
**Impact:** 🟡 Code reuse

---

#### **2.4 Split MessageService** 🟡 MEDIUM
**Location:** `lib/services/message.service.ts` (573 lines)

**Refactor:**
```typescript
// lib/services/message/message-core.service.ts
export class MessageCoreService {
  async sendMessage(...) { }
  async getMessages(...) { }
  async editMessage(...) { }
  async deleteMessage(...) { }
}

// lib/services/message/message-reaction.service.ts
export class MessageReactionService {
  async toggleReaction(...) { }
  async getReactions(...) { }
}

// lib/services/message/message-read.service.ts
export class MessageReadService {
  async markAsRead(...) { }
  async getReadReceipts(...) { }
}
```

**Effort:** 16 hours  
**Impact:** 🟡 Single Responsibility

---

### Phase 3: Architecture Improvements (Month 2)
**Goal:** Improve scalability and maintainability

#### **3.1 Implement Domain Modules** 🟡 MEDIUM
**Current Structure:**
```
lib/services/
  message.service.ts
  room.service.ts
  user.service.ts
```

**Refactor:**
```
lib/domains/
  messages/
    message.service.ts
    message.repository.ts
    message.types.ts
    message.events.ts
  rooms/
    room.service.ts
    room.repository.ts
    room.types.ts
  users/
    user.service.ts
    user.repository.ts
    user.types.ts
```

**Effort:** 24 hours  
**Impact:** 🟡 Better organization

---

#### **3.2 Enhance Event-Driven Architecture** 🟡 MEDIUM
**Location:** Services not publishing events

**Refactor:**
```typescript
// Publish events for all state changes
async sendMessage(...) {
  const message = await this.createMessage(...);
  
  // Publish event
  await eventBus.publish('message.created', {
    messageId: message.id,
    roomId: message.roomId,
    senderId: message.senderId,
    content: message.content,
  });
  
  return message;
}

// Event handlers
eventBus.subscribe('message.created', async (data) => {
  await notificationService.sendPushNotifications(data);
  await analyticsService.trackMessage(data);
  await searchService.indexMessage(data);
});
```

**Effort:** 20 hours  
**Impact:** 🟡 Decoupling

---

#### **3.3 Add Request Validation Middleware** 🟢 LOW
**Location:** API routes

**Refactor:**
```typescript
// lib/middleware/validate-request.ts
export function validateRequest(schema: ZodSchema) {
  return async (request: NextRequest) => {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      throw new ValidationError('Invalid request data', result.error.errors);
    }
    
    return result.data;
  };
}

// Usage
export async function POST(request: NextRequest) {
  const validated = await validateRequest(messageSchema)(request);
  // validated is typed and validated
}
```

**Effort:** 8 hours  
**Impact:** 🟢 Consistency

---

### Phase 4: Performance Optimization (Month 3)
**Goal:** Improve performance and scalability

#### **4.1 Add Response Compression** 🟡 MEDIUM
**Location:** `next.config.js`

**Refactor:**
```javascript
module.exports = {
  compress: true,
  // ...
};
```

**Effort:** 1 hour  
**Impact:** 🟡 Performance

---

#### **4.2 Implement ETag Support** 🟡 MEDIUM
**Location:** API routes

**Refactor:**
```typescript
export async function GET(request: NextRequest) {
  const data = await getData();
  const etag = generateETag(data);
  
  const ifNoneMatch = request.headers.get('if-none-match');
  if (ifNoneMatch === etag) {
    return new NextResponse(null, { status: 304 });
  }
  
  const response = NextResponse.json(data);
  response.headers.set('ETag', etag);
  return response;
}
```

**Effort:** 8 hours  
**Impact:** 🟡 Performance

---

#### **4.3 Add Performance Monitoring** 🔴 HIGH
**Location:** All API routes

**Refactor:**
```typescript
// lib/middleware/performance-monitor.ts
export function performanceMonitor(handler: Function) {
  return async (request: NextRequest) => {
    const start = performance.now();
    
    try {
      const response = await handler(request);
      const duration = performance.now() - start;
      
      metricsService.recordResponseTime(request.url, duration);
      
      if (duration > 1000) {
        logger.warn('Slow request', { url: request.url, duration });
      }
      
      return response;
    } catch (error) {
      metricsService.recordError(request.url, error);
      throw error;
    }
  };
}
```

**Effort:** 12 hours  
**Impact:** 🔴 Observability

---

## 📊 Refactoring Summary

### Phase 1: Critical Fixes
- **Duration:** 2 weeks
- **Effort:** 34 hours
- **Impact:** 🔴 Critical security and performance

### Phase 2: Code Quality
- **Duration:** 2 weeks
- **Effort:** 40 hours
- **Impact:** 🟡 Maintainability

### Phase 3: Architecture
- **Duration:** 4 weeks
- **Effort:** 52 hours
- **Impact:** 🟡 Scalability

### Phase 4: Performance
- **Duration:** 2 weeks
- **Effort:** 21 hours
- **Impact:** 🟡 Performance

### Total
- **Duration:** 10 weeks
- **Effort:** 147 hours (~4 weeks full-time)
- **Priority:** High to Low

---

## 🎯 Implementation Strategy

### Week 1-2: Critical Fixes
1. Socket authentication
2. Database transactions
3. Distributed rate limiting
4. Query caching

### Week 3-4: Code Quality
1. Refactor sendMessage
2. Extract duplicate code
3. Extract authorization
4. Split services

### Week 5-8: Architecture
1. Domain modules
2. Event-driven enhancements
3. Validation middleware

### Week 9-10: Performance
1. Compression
2. ETags
3. Monitoring

---

## ✅ Success Criteria

### Phase 1
- ✅ All security vulnerabilities fixed
- ✅ Data consistency guaranteed
- ✅ Scalability improved

### Phase 2
- ✅ Code complexity reduced
- ✅ Duplication eliminated
- ✅ Test coverage maintained

### Phase 3
- ✅ Better code organization
- ✅ Improved decoupling
- ✅ Enhanced maintainability

### Phase 4
- ✅ Performance improved by 30-50%
- ✅ Monitoring in place
- ✅ Optimization opportunities identified

---

*End of Refactoring Plan*

