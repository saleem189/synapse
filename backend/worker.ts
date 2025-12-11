// ================================
// BullMQ Worker Process
// ================================
// Background job processor - run in separate process
// Start with: npm run worker

import { Worker } from 'bullmq';
import { redisConnection } from '../lib/queue/redis-connection';
import { QUEUE_NAMES, JOB_TYPES } from '../lib/queue/queues';
import {
  processPushNotification,
  processImage,
  processVideo,
  optimizeAvatar,
} from '../lib/queue/job-processors';
import { logger } from './logger';

// Create worker for push notifications
const pushNotificationWorker = new Worker(
  QUEUE_NAMES.PUSH_NOTIFICATIONS,
  async (job) => {
    logger.log(`🔄 Worker: Processing job ${job.id} of type ${job.name}`);
    
    switch (job.name) {
      case JOB_TYPES.PUSH_NOTIFICATION:
        return await processPushNotification(job);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process 5 jobs concurrently
    limiter: {
      max: 100, // Max 100 jobs
      duration: 1000, // Per second
    },
  }
);

// Create worker for file processing
const fileProcessingWorker = new Worker(
  QUEUE_NAMES.FILE_PROCESSING,
  async (job) => {
    logger.log(`🔄 Worker: Processing file job ${job.id} of type ${job.name}`);
    
    switch (job.name) {
      case JOB_TYPES.PROCESS_IMAGE:
        return await processImage(job);
      case JOB_TYPES.PROCESS_VIDEO:
        return await processVideo(job);
      case JOB_TYPES.OPTIMIZE_AVATAR:
        return await optimizeAvatar(job);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  {
    connection: redisConnection,
    concurrency: 3, // Process 3 file jobs concurrently (CPU intensive)
    limiter: {
      max: 50, // Max 50 jobs
      duration: 1000, // Per second
    },
  }
);

// Worker event handlers
pushNotificationWorker.on('completed', (job) => {
  logger.log(`✅ Push Worker: Job ${job.id} completed`);
});

pushNotificationWorker.on('failed', (job, err) => {
  logger.error(`❌ Push Worker: Job ${job?.id} failed:`, err.message);
});

pushNotificationWorker.on('error', (err) => {
  logger.error(`❌ Push Worker error:`, err.message);
});

fileProcessingWorker.on('completed', (job) => {
  logger.log(`✅ File Worker: Job ${job.id} completed`);
});

fileProcessingWorker.on('failed', (job, err) => {
  logger.error(`❌ File Worker: Job ${job?.id} failed:`, err.message);
});

fileProcessingWorker.on('error', (err) => {
  logger.error(`❌ File Worker error:`, err.message);
});

// Graceful shutdown
// Increase max listeners to prevent warnings
if (process.setMaxListeners) {
  process.setMaxListeners(15);
}

const shutdown = async () => {
  logger.log('🛑 Worker: Shutting down gracefully...');
  await pushNotificationWorker.close();
  await fileProcessingWorker.close();
  await redisConnection.quit();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

logger.log('🚀 BullMQ Worker started');
logger.log(`   Push Notifications Queue: ${QUEUE_NAMES.PUSH_NOTIFICATIONS} (concurrency: 5)`);
logger.log(`   File Processing Queue: ${QUEUE_NAMES.FILE_PROCESSING} (concurrency: 3)`);
