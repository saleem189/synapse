// ================================
// Cache Service
// ================================
// Redis-based caching for query results and frequently accessed data
// Reduces database load and improves response times
// SERVER-ONLY: Uses Redis (Node.js only)

import 'server-only'; // Mark as server-only to prevent client bundling

import { Redis } from 'ioredis';
import type { ILogger } from '@/lib/logger/logger.interface';

export class CacheService {
  private redis: Redis;
  private logger: ILogger;

  constructor(redis: Redis, logger: ILogger) {
    this.redis = redis;
    this.logger = logger;
  }

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      if (!cached) {
        return null;
      }
      return JSON.parse(cached) as T;
    } catch (error) {
      this.logger.error('Cache get error:', error, { component: 'CacheService', key });
      return null;
    }
  }

  /**
   * Set cached value with TTL
   */
  async set(key: string, value: unknown, ttl: number = 3600): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      this.logger.error('Cache set error:', error, { component: 'CacheService', key });
      // Don't throw - caching failures shouldn't break the app
    }
  }

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error('Cache delete error:', error, { component: 'CacheService', key });
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(`Invalidated ${keys.length} cache keys matching pattern: ${pattern}`, {
          component: 'CacheService',
          pattern,
          keysCount: keys.length,
        });
      }
    } catch (error) {
      this.logger.error('Cache invalidate error:', error, { component: 'CacheService', pattern });
    }
  }

  /**
   * Invalidate all room-related cache
   */
  async invalidateRoom(roomId: string): Promise<void> {
    await Promise.all([
      this.invalidate(`room:${roomId}*`),
      this.invalidate(`rooms:user:*`),
      this.invalidate(`messages:room:${roomId}*`),
    ]);
  }

  /**
   * Invalidate all user-related cache
   */
  async invalidateUser(userId: string): Promise<void> {
    await Promise.all([
      this.invalidate(`user:${userId}*`),
      this.invalidate(`rooms:user:${userId}*`),
    ]);
  }

  /**
   * Get or set cached value (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    await this.set(key, value, ttl);
    return value;
  }
}

// Note: CacheService is now fully integrated with DI
// Use getService<CacheService>('cacheService') from @/lib/di instead of this factory
// This export is kept for backward compatibility but should not be used in new code
export async function getCacheService(): Promise<CacheService> {
  // Dynamic import to avoid Turbopack module resolution issues
  const { redisConnection } = await import('@/lib/queue/redis-connection');
  const { getService } = await import('@/lib/di');
  const logger = await getService<ILogger>('logger');
  return new CacheService(redisConnection, logger);
}

