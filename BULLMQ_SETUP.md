# BullMQ Queue System Setup

## Overview

A simple, robust job queue system using BullMQ and Redis for background task processing.

## What's Implemented

### ✅ Push Notifications Queue
- Push notifications are now queued instead of sent synchronously
- Prevents blocking message send operations
- Automatic retries with exponential backoff
- Handles invalid subscriptions gracefully

## Architecture

```
┌─────────────────┐
│  API Route      │
│  (Next.js)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Queue Service  │
│  (Adds Jobs)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Redis Queue    │
│  (BullMQ)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Worker Process │
│  (Processes)    │
└─────────────────┘
```

## Files Created

1. **`lib/queue/redis-connection.ts`** - Redis connection configuration
2. **`lib/queue/queues.ts`** - Queue definitions
3. **`lib/queue/job-processors.ts`** - Job processing logic
4. **`lib/queue/queue-service.ts`** - Service for adding jobs
5. **`backend/worker.ts`** - Worker process (runs separately)

## Usage

### Starting the Worker

```bash
# Development (with other services)
npm run dev:all

# Or start worker separately
npm run worker
```

### Adding Jobs to Queue

```typescript
import { queueService } from '@/lib/queue/queue-service';

// Add push notification job
await queueService.addPushNotification(userId, {
  title: 'New Message',
  body: 'You have a new message',
  url: '/chat?roomId=123',
  icon: '/avatar.png'
}, {
  priority: 10, // Optional: higher = more priority
  delay: 0,     // Optional: delay in milliseconds
});
```

### Queue Stats

```typescript
import { queueService } from '@/lib/queue/queue-service';

const stats = await queueService.getStats();
console.log(stats);
// {
//   pushNotifications: {
//     waiting: 5,
//     active: 2,
//     completed: 100,
//     failed: 1,
//     total: 108
//   }
// }
```

## Configuration

### Environment Variables

```env
# Redis connection (required for queues)
REDIS_URL="redis://:redis123@localhost:6379"

# Or separate variables
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis123
```

### Worker Configuration

- **Concurrency**: 5 jobs processed simultaneously
- **Rate Limiting**: 100 jobs per second
- **Retries**: 3 attempts with exponential backoff
- **Job Retention**: 
  - Completed: 24 hours or last 1000 jobs
  - Failed: 7 days

## Benefits

✅ **Non-blocking**: Message sends don't wait for push notifications  
✅ **Reliable**: Automatic retries on failure  
✅ **Scalable**: Can run multiple workers  
✅ **Persistent**: Jobs survive server restarts (Redis)  
✅ **Simple**: No over-engineering, just what you need  

## Future Enhancements

You can easily add more queue types:

```typescript
// In lib/queue/queues.ts
export const QUEUE_NAMES = {
  PUSH_NOTIFICATIONS: 'push-notifications',
  EMAIL: 'email',              // Add email queue
  FILE_PROCESSING: 'file-processing', // Add file processing
};

// In lib/queue/job-processors.ts
export async function processEmail(job: Job) {
  // Email sending logic
}

// In backend/worker.ts
case JOB_TYPES.EMAIL:
  return await processEmail(job);
```

## Monitoring

Check worker logs to see job processing:
```
🚀 BullMQ Worker started
   Processing queue: push-notifications
   Concurrency: 5 jobs
🔄 Worker: Processing job abc123 of type send-push-notification
✅ Worker: Job abc123 completed
```

## Troubleshooting

**Worker not processing jobs?**
- Check Redis is running: `docker-compose up -d redis`
- Check REDIS_URL is set correctly
- Check worker is running: `npm run worker`

**Jobs failing?**
- Check worker logs for error messages
- Verify VAPID keys are configured
- Check push subscription data in database

