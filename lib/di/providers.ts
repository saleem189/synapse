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
import { RoomService } from '@/lib/services/room.service';
import { UserService } from '@/lib/services/user.service';
import { AdminService } from '@/lib/services/admin.service';
import { QueueService } from '@/lib/queue/queue-service';
import { EmailService } from '@/lib/services/email.service';
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
  
  // Config Service (needs Redis)
  const configService = new ConfigService(redisConnection);
  container.register('configService', () => configService, true);
  container.setConfigService(configService);
  
  // Event Bus (needs Redis)
  const eventBus = new EventBus(redisConnection);
  container.register('eventBus', () => eventBus, true);
  
  // Register Prisma client (singleton)
  container.register('prisma', () => prisma, true);

  // Register Repositories (singletons)
  container.register('messageRepository', () => {
    return new MessageRepository(container.resolveSync('prisma'));
  }, true);

  container.register('roomRepository', () => {
    return new RoomRepository(container.resolveSync('prisma'));
  }, true);

  container.register('userRepository', () => {
    return new UserRepository(container.resolveSync('prisma'));
  }, true);

  // Register Queue Service FIRST (before other services that depend on it)
  container.register('queueService', () => {
    return new QueueService();
  }, true);

  // Register Push Service FIRST (before MessageService that might use it as fallback)
  // Use dynamic import to avoid circular dependencies
  const pushServiceModule = require('@/lib/services/push.service');
  container.register('pushService', () => pushServiceModule.pushService, true);

  // Register Services (singletons)
  container.register('messageService', () => {
    return new MessageService(
      container.resolveSync('messageRepository'),
      container.resolveSync('roomRepository'),
      container.resolveSync('queueService'),
      container.resolveSync('pushService') // Optional fallback
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

