// ================================
// Queue Service
// ================================
// Simple service for adding jobs to queues

import { pushNotificationQueue, fileProcessingQueue } from './queues';
import { JOB_TYPES } from './queues';

// Simple logger for queue service
const logger = {
  log: (msg: string, ...args: any[]) => console.log(`[QueueService] ${msg}`, ...args),
  error: (msg: string, ...args: any[]) => console.error(`[QueueService] ❌ ${msg}`, ...args),
};

export class QueueService {
  constructor() {
    // Service can be extended with dependencies if needed
  }

  /**
   * Add push notification job to queue
   */
  async addPushNotification(
    userId: string,
    payload: {
      title: string;
      body: string;
      url?: string;
      icon?: string;
    },
    options?: {
      priority?: number; // Higher = more priority
      delay?: number; // Delay in milliseconds
    }
  ): Promise<string> {
    try {
      const job = await pushNotificationQueue.add(
        JOB_TYPES.PUSH_NOTIFICATION,
        {
          userId,
          payload,
        },
        {
          priority: options?.priority || 0,
          delay: options?.delay,
        }
      );

      logger.log(`📥 Added push notification job ${job.id} for user ${userId}`);
      return job.id!;
    } catch (error: any) {
      logger.error('Failed to add push notification job:', error.message);
      throw error;
    }
  }

  /**
   * Add image processing job to queue
   */
  async addImageProcessing(
    filePath: string,
    outputPath: string,
    options?: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      format?: 'jpeg' | 'png' | 'webp';
      priority?: number;
    }
  ): Promise<string> {
    try {
      const job = await fileProcessingQueue.add(
        JOB_TYPES.PROCESS_IMAGE,
        {
          filePath,
          outputPath,
          options: {
            maxWidth: options?.maxWidth,
            maxHeight: options?.maxHeight,
            quality: options?.quality,
            format: options?.format,
          },
        },
        {
          priority: options?.priority || 0,
        }
      );

      logger.log(`📥 Added image processing job ${job.id} for ${filePath}`);
      return job.id!;
    } catch (error: any) {
      logger.error('Failed to add image processing job:', error.message);
      throw error;
    }
  }

  /**
   * Add video processing job to queue
   */
  async addVideoProcessing(
    filePath: string,
    outputPath: string,
    options?: {
      priority?: number;
    }
  ): Promise<string> {
    try {
      const job = await fileProcessingQueue.add(
        JOB_TYPES.PROCESS_VIDEO,
        {
          filePath,
          outputPath,
        },
        {
          priority: options?.priority || 0,
        }
      );

      logger.log(`📥 Added video processing job ${job.id} for ${filePath}`);
      return job.id!;
    } catch (error: any) {
      logger.error('Failed to add video processing job:', error.message);
      throw error;
    }
  }

  /**
   * Add avatar optimization job to queue
   */
  async addAvatarOptimization(
    filePath: string,
    userId: string,
    options?: {
      priority?: number;
    }
  ): Promise<string> {
    try {
      const job = await fileProcessingQueue.add(
        JOB_TYPES.OPTIMIZE_AVATAR,
        {
          filePath,
          userId,
        },
        {
          priority: options?.priority || 10, // Higher priority for avatars
        }
      );

      logger.log(`📥 Added avatar optimization job ${job.id} for user ${userId}`);
      return job.id!;
    } catch (error: any) {
      logger.error('Failed to add avatar optimization job:', error.message);
      throw error;
    }
  }

  /**
   * Get queue stats
   */
  async getStats() {
    const [
      pushWaiting,
      pushActive,
      pushCompleted,
      pushFailed,
      fileWaiting,
      fileActive,
      fileCompleted,
      fileFailed,
    ] = await Promise.all([
      pushNotificationQueue.getWaitingCount(),
      pushNotificationQueue.getActiveCount(),
      pushNotificationQueue.getCompletedCount(),
      pushNotificationQueue.getFailedCount(),
      fileProcessingQueue.getWaitingCount(),
      fileProcessingQueue.getActiveCount(),
      fileProcessingQueue.getCompletedCount(),
      fileProcessingQueue.getFailedCount(),
    ]);

    return {
      pushNotifications: {
        waiting: pushWaiting,
        active: pushActive,
        completed: pushCompleted,
        failed: pushFailed,
        total: pushWaiting + pushActive + pushCompleted + pushFailed,
      },
      fileProcessing: {
        waiting: fileWaiting,
        active: fileActive,
        completed: fileCompleted,
        failed: fileFailed,
        total: fileWaiting + fileActive + fileCompleted + fileFailed,
      },
    };
  }
}

export const queueService = new QueueService();

