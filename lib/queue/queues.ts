// ================================
// BullMQ Queues
// ================================
// Simple queue definitions for background jobs

import { Queue } from 'bullmq';
import { redisConnection } from './redis-connection';

// Queue names
export const QUEUE_NAMES = {
  PUSH_NOTIFICATIONS: 'push-notifications',
  FILE_PROCESSING: 'file-processing',
} as const;

// Job types
export const JOB_TYPES = {
  PUSH_NOTIFICATION: 'send-push-notification',
  PROCESS_IMAGE: 'process-image',
  PROCESS_VIDEO: 'process-video',
  OPTIMIZE_AVATAR: 'optimize-avatar',
} as const;

/**
 * Push Notifications Queue
 * Handles sending push notifications to users
 */
export const pushNotificationQueue = new Queue(QUEUE_NAMES.PUSH_NOTIFICATIONS, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // Retry 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2s delay
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

/**
 * File Processing Queue
 * Handles image/video compression and optimization
 */
export const fileProcessingQueue = new Queue(QUEUE_NAMES.FILE_PROCESSING, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2, // Retry 2 times (file processing is expensive)
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5s delay
    },
    removeOnComplete: {
      age: 7 * 24 * 3600, // Keep completed jobs for 7 days
      count: 500, // Keep last 500 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

// Export all queues
export const queues = {
  pushNotification: pushNotificationQueue,
  fileProcessing: fileProcessingQueue,
} as const;

