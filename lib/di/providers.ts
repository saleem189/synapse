// ================================
// Service Providers
// ================================
// Registers all services with the DI container

import { container } from './container';
import prisma from '@/lib/prisma';
import { redisConnection } from '@/lib/queue/redis-connection';
import { ConfigService } from '@/lib/config/config.service';
import { EventBus } from '@/lib/events/event-bus';

// Repositories
import { MessageRepository } from '@/lib/repositories/message.repository';
import { RoomRepository } from '@/lib/repositories/room.repository';
import { UserRepository } from '@/lib/repositories/user.repository';

// Services
import { MessageService } from '@/lib/services/message.service';
import { MessageNotificationService } from '@/lib/services/message-notification.service';
import { MessageReactionService } from '@/lib/services/message-reaction.service';
import { MessageReadService } from '@/lib/services/message-read.service';
import { RoomService } from '@/lib/services/room.service';
import { UserService } from '@/lib/services/user.service';
import { AdminService } from '@/lib/services/admin.service';
import { QueueService } from '@/lib/queue/queue-service';
import { EmailService } from '@/lib/services/email.service';
import { CacheService, cacheService } from '@/lib/cache/cache.service';
import { logger } from '@/lib/logger';

/**
 * Initialize and register all services with the DI container
 * Call this once at application startup
 */
export function setupDI(): void {
  // Register core infrastructure services FIRST
  // These are needed by other services
  
  // Redis connection (shared instance)
  container.register('redis', () => redisConnection, true);
  
  // Cache Service (needs Redis)
  container.register('cacheService', () => cacheService, true);
  
  // Config Service (needs Redis)
  const configService = new ConfigService(redisConnection);
  container.register('configService', () => configService, true);
  container.setConfigService(configService);
  
  // Event Bus (needs Redis)
  const eventBus = new EventBus(redisConnection);
  container.register('eventBus', () => eventBus, true);
  
  // Register Prisma client (singleton)
  container.register('prisma', () => prisma, true);

  // Register Repositories (singletons) with cache service
  container.register('messageRepository', () => {
    return new MessageRepository(
      container.resolveSync('prisma'),
      container.resolveSync('cacheService')
    );
  }, true);

  container.register('roomRepository', () => {
    return new RoomRepository(
      container.resolveSync('prisma'),
      container.resolveSync('cacheService')
    );
  }, true);

  container.register('userRepository', () => {
    return new UserRepository(
      container.resolveSync('prisma'),
      container.resolveSync('cacheService')
    );
  }, true);

  // Register Queue Service FIRST (before other services that depend on it)
  container.register('queueService', () => {
    return new QueueService();
  }, true);

  // Register Push Service FIRST (before MessageService that might use it as fallback)
  // Use dynamic import to avoid circular dependencies
  const pushServiceModule = require('@/lib/services/push.service');
  container.register('pushService', () => pushServiceModule.pushService, true);

  // Register specialized message services FIRST (before MessageService)
  container.register('messageNotificationService', () => {
    return new MessageNotificationService(
      container.resolveSync('roomRepository'),
      container.resolveSync('queueService'),
      container.resolveSync('pushService') // Optional fallback
    );
  }, true);

  container.register('messageReactionService', () => {
    return new MessageReactionService(
      container.resolveSync('messageRepository'),
      container.resolveSync('roomRepository')
    );
  }, true);

  container.register('messageReadService', () => {
    return new MessageReadService(
      container.resolveSync('messageRepository'),
      container.resolveSync('roomRepository')
    );
  }, true);

  // Register MessageService (core CRUD operations)
  // Uses composition with specialized services
  container.register('messageService', () => {
    return new MessageService(
      container.resolveSync('messageRepository'),
      container.resolveSync('roomRepository'),
      container.resolveSync('cacheService'), // Optional - for manual cache invalidation
      container.resolveSync('messageNotificationService'), // Optional - for push notifications
      container.resolveSync('messageReactionService'), // Optional - for reactions
      container.resolveSync('messageReadService') // Optional - for read receipts
    );
  }, true);

  container.register('roomService', () => {
    return new RoomService(
      container.resolveSync('roomRepository'),
      container.resolveSync('userRepository')
    );
  }, true);

  container.register('userService', () => {
    return new UserService(
      container.resolveSync('userRepository')
    );
  }, true);

  // Register Email Service (uses factory pattern)
  container.register('emailService', () => {
    return new EmailService();
  }, true);

  // Update MessageService to include PushService (if needed for fallback)
  // Note: MessageService primarily uses queueService, pushService is fallback only
}

/**
 * Set up event handlers (called after DI setup)
 */
async function setupEventHandlers(): Promise<void> {
  try {
    const { setupEmailEventHandlers } = await import('@/lib/events/handlers');
    await setupEmailEventHandlers();
  } catch (error) {
    logger.error('Error setting up event handlers:', error);
  }
}

// Set up event handlers after a short delay to ensure all services are registered
setTimeout(() => {
  setupEventHandlers();
}, 100);

/**
 * Get a service from the container (synchronous)
 * Use this for services that are registered synchronously
 * For async factories, use getServiceAsync()
 */
export function getService<T>(key: string): T {
  return container.resolveSync<T>(key);
}

/**
 * Get a service from the container (asynchronous)
 * Use this for services that are registered with registerFactory()
 */
export async function getServiceAsync<T>(key: string): Promise<T> {
  return await container.resolve<T>(key);
}

// Initialize on module load
setupDI();

