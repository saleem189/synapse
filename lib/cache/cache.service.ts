// ================================
// Cache Service
// ================================
// Redis-based caching for query results and frequently accessed data
// Reduces database load and improves response times

import { Redis } from 'ioredis';
import { redisConnection } from '@/lib/queue/redis-connection';
import { logger } from '@/lib/logger';

export class CacheService {
  private redis: Redis;

  constructor(redis?: Redis) {
    this.redis = redis || redisConnection;
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
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached value with TTL
   */
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      logger.error('Cache set error:', error);
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
      logger.error('Cache delete error:', error);
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
        logger.log(`🗑️ Invalidated ${keys.length} cache keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      logger.error('Cache invalidate error:', error);
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

// Export singleton instance
export const cacheService = new CacheService();

