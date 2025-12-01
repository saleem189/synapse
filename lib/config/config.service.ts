// ================================
// Configuration Service
// ================================
// Centralized configuration management with Redis caching
// Supports runtime configuration updates without redeployment

import { Redis } from 'ioredis';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

interface CachedConfig {
  value: any;
  expiresAt: number;
}

export class ConfigService {
  private cache = new Map<string, CachedConfig>();
  private redis: Redis;
  private defaultTTL = 300; // 5 minutes in seconds
  private subscriber: Redis | null = null;

  // Custom mapping for environment variables that don't follow the standard pattern
  private envKeyMap: Record<string, string> = {
    'push.vapid.publicKey': 'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
    'push.vapid.privateKey': 'VAPID_PRIVATE_KEY',
    'push.vapid.subject': 'NEXT_PUBLIC_VAPID_SUBJECT',
    'email.from': 'EMAIL_FROM',
    'email.provider': 'EMAIL_PROVIDER',
  };

  constructor(redis: Redis) {
    this.redis = redis;
    this.setupWatcher();
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
      logger.error(`Error reading config from Redis for key '${key}':`, error);
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
          logger.warn(`Failed to update Redis cache for key '${key}':`, error);
        }

        this.cache.set(key, {
          value,
          expiresAt: Date.now() + this.defaultTTL * 1000,
        });

        return value;
      }
    } catch (error) {
      logger.error(`Error reading config from database for key '${key}':`, error);
    }

    // Check environment variables
    const envKey = this.keyToEnvVar(key);
    const envValue = process.env[envKey];

    if (envValue !== undefined) {
      const isSensitive = this.isSensitiveKey(key);
      logger.log(`📌 Using environment variable '${envKey}' for config key '${key}'${isSensitive ? ' (value hidden)' : ''}`);

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
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      // Update database
      await prisma.config.upsert({
        where: { key },
        update: { value, updatedAt: new Date() },
        create: { key, value },
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

      logger.log(`✅ Config updated: ${key}`);
    } catch (error) {
      logger.error(`Error setting config for key '${key}':`, error);
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
      logger.log(`✅ Config deleted: ${key}`);
    } catch (error) {
      logger.error(`Error deleting config for key '${key}':`, error);
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
      logger.error('Error getting all config keys:', error);
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
          logger.log(`🔄 Config cache cleared: ${actualKey}`);
        } else {
          // Config was updated
          try {
            const value = JSON.parse(message);
            this.cache.set(key, {
              value,
              expiresAt: Date.now() + this.defaultTTL * 1000,
            });
            logger.log(`🔄 Config cache updated: ${key}`);
          } catch (error) {
            logger.error(`Error parsing config update for '${key}':`, error);
          }
        }
      });

      logger.log('✅ Config service watcher initialized');
    } catch (error) {
      logger.error('Error setting up config watcher:', error);
    }
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
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

