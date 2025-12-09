// ================================
// Configuration Service
// ================================
// Centralized configuration management with Redis caching
// Supports runtime configuration updates without redeployment

import { Redis } from 'ioredis';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { ILogger } from '@/lib/logger/logger.interface';

interface CachedConfig {
  value: unknown;
  expiresAt: number;
}

export class ConfigService {
  private cache = new Map<string, CachedConfig>();
  private redis: Redis;
  private defaultTTL = 300; // 5 minutes in seconds
  private maxCacheSize = 500; // Maximum cache entries to prevent unbounded growth
  private subscriber: Redis | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Custom mapping for environment variables that don't follow the standard pattern
  private envKeyMap: Record<string, string> = {
    'push.vapid.publicKey': 'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
    'push.vapid.privateKey': 'VAPID_PRIVATE_KEY',
    'push.vapid.subject': 'NEXT_PUBLIC_VAPID_SUBJECT',
    'email.from': 'EMAIL_FROM',
    'email.provider': 'EMAIL_PROVIDER',
  };

  constructor(redis: Redis, private logger: ILogger) {
    this.redis = redis;
    this.setupWatcher();
    this.startCacheCleanup();
  }

  /**
   * Get configuration value
   * Checks cache -> Redis -> Database -> Environment Variables
   */
  async get<T>(key: string, defaultValue?: T): Promise<T> {
    // Check memory cache first
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }

    // Enforce cache size limit before adding new entries
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldestEntry();
    }

    // Check Redis
    try {
      const redisValue = await this.redis.get(`config:${key}`);
      if (redisValue) {
        const value = JSON.parse(redisValue);
        this.cache.set(key, {
          value,
          expiresAt: Date.now() + this.defaultTTL * 1000,
        });
        return value as T;
      }
    } catch (error) {
      this.logger.error(`Error reading config from Redis for key '${key}':`, error, {
        component: 'ConfigService',
        key,
      });
    }

    // Check database
    try {
      const config = await prisma.config.findUnique({ where: { key } });
      if (config) {
        const value = config.value as T;

        // Update Redis and cache
        try {
          await this.redis.set(`config:${key}`, JSON.stringify(value));
        } catch (error) {
          this.logger.warn(`Failed to update Redis cache for key '${key}':`, {
            component: 'ConfigService',
            key,
          }, false);
        }

        this.cache.set(key, {
          value,
          expiresAt: Date.now() + this.defaultTTL * 1000,
        });

        return value;
      }
    } catch (error) {
      this.logger.error(`Error reading config from database for key '${key}':`, error, {
        component: 'ConfigService',
        key,
      });
    }

    // Check environment variables
    const envKey = this.keyToEnvVar(key);
    const envValue = process.env[envKey];

    if (envValue !== undefined) {
      const isSensitive = this.isSensitiveKey(key);
      this.logger.log(`📌 Using environment variable '${envKey}' for config key '${key}'${isSensitive ? ' (value hidden)' : ''}`);

      // Try to parse as JSON for objects/arrays/booleans/numbers
      const parsedValue = this.parseEnvValue<T>(envValue);
      return parsedValue;
    }

    // Return default or throw
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw new Error(`Config key '${key}' not found in cache, Redis, database, or environment`);
  }

  /**
   * Set configuration value
   * Updates Database -> Redis -> Cache
   */
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    try {
      // Update database
      // Prisma expects InputJsonValue for JSON fields, so we need to cast unknown to it
      const jsonValue = value as Prisma.InputJsonValue;
      await prisma.config.upsert({
        where: { key },
        update: { value: jsonValue, updatedAt: new Date() },
        create: { key, value: jsonValue },
      });

      // Update Redis
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(`config:${key}`, ttl, serialized);
      } else {
        await this.redis.set(`config:${key}`, serialized);
      }

      // Update cache
      this.cache.set(key, {
        value,
        expiresAt: Date.now() + (ttl || this.defaultTTL) * 1000,
      });

      // Publish change event
      await this.redis.publish(`config:${key}`, serialized);

      this.logger.log(`✅ Config updated: ${key}`);
    } catch (error) {
      this.logger.error(`Error setting config for key '${key}':`, error, {
        component: 'ConfigService',
        key,
      });
      throw error;
    }
  }

  /**
   * Delete configuration
   */
  async delete(key: string): Promise<void> {
    try {
      await prisma.config.delete({ where: { key } });
      await this.redis.del(`config:${key}`);
      this.cache.delete(key);
      await this.redis.publish(`config:${key}:deleted`, '1');
      this.logger.log(`✅ Config deleted: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting config for key '${key}':`, error, {
        component: 'ConfigService',
        key,
      });
      throw error;
    }
  }

  /**
   * Get all configuration keys
   */
  async getAllKeys(): Promise<string[]> {
    try {
      const configs = await prisma.config.findMany({
        select: { key: true },
      });
      return configs.map((c: { key: string }) => c.key);
    } catch (error) {
      this.logger.error('Error getting all config keys:', error, {
        component: 'ConfigService',
      });
      return [];
    }
  }

  /**
   * Clear cache for a specific key
   */
  clearCache(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all caches
   */
  clearAllCache(): void {
    this.cache.clear();
  }

  /**
   * Set up Redis watcher for config changes
   */
  private setupWatcher(): void {
    try {
      this.subscriber = this.redis.duplicate();
      this.subscriber.psubscribe('config:*');

      this.subscriber.on('pmessage', (pattern, channel, message) => {
        const key = channel.replace('config:', '');

        if (key.endsWith(':deleted')) {
          // Config was deleted
          const actualKey = key.replace(':deleted', '');
          this.cache.delete(actualKey);
          this.logger.log(`🔄 Config cache cleared: ${actualKey}`);
        } else {
          // Config was updated
          try {
            const value = JSON.parse(message);
            this.cache.set(key, {
              value,
              expiresAt: Date.now() + this.defaultTTL * 1000,
            });
            this.logger.log(`🔄 Config cache updated: ${key}`);
          } catch (error) {
            this.logger.error(`Error parsing config update for '${key}':`, error, {
              component: 'ConfigService',
              key,
            });
          }
        }
      });

      this.logger.log('✅ Config service watcher initialized');
    } catch (error) {
      this.logger.error('Error setting up config watcher:', error, {
        component: 'ConfigService',
      });
    }
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, config] of this.cache.entries()) {
      if (config.expiresAt < now) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    // If still over limit after cleaning expired entries, evict oldest
    while (this.cache.size >= this.maxCacheSize) {
      this.evictOldestEntry();
      cleaned++;
    }
    
    if (cleaned > 0) {
      this.logger.log(`🧹 Cleaned ${cleaned} cache entries (expired: ${cleaned}, evicted: ${cleaned})`);
    }
  }

  /**
   * Evict the oldest cache entry (LRU-style)
   */
  private evictOldestEntry(): void {
    if (this.cache.size === 0) return;
    
    let oldestKey: string | null = null;
    let oldestExpiry = Infinity;
    
    for (const [key, config] of this.cache.entries()) {
      if (config.expiresAt < oldestExpiry) {
        oldestExpiry = config.expiresAt;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Start periodic cache cleanup
   */
  private startCacheCleanup(): void {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000); // 1 minute
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }
    this.cache.clear();
  }

  /**
   * Convert config key to environment variable name
   * Examples:
   *   'email.from' -> 'EMAIL_FROM'
   *   'push.vapid.publicKey' -> 'PUSH_VAPID_PUBLIC_KEY' (via custom mapping)
   */
  private keyToEnvVar(key: string): string {
    // Check custom mapping first
    if (this.envKeyMap[key]) {
      return this.envKeyMap[key];
    }

    // Default: convert dots to underscores and uppercase
    return key.replace(/\./g, '_').toUpperCase();
  }

  /**
   * Check if a config key contains sensitive information
   */
  private isSensitiveKey(key: string): boolean {
    const sensitivePatterns = ['password', 'secret', 'key', 'token', 'auth', 'credential'];
    const lowerKey = key.toLowerCase();
    return sensitivePatterns.some(pattern => lowerKey.includes(pattern));
  }

  /**
   * Parse environment variable value with type conversion
   */
  private parseEnvValue<T>(value: string): T {
    // Try to parse as JSON (for objects, arrays, booleans, numbers)
    try {
      return JSON.parse(value) as T;
    } catch {
      // If JSON parsing fails, return as string
      return value as T;
    }
  }
}

