// ================================
// Redis Connection for BullMQ
// ================================
// Simple Redis connection configuration for BullMQ queues

import Redis from 'ioredis';
import { logger } from '@/lib/logger';
import { config as envConfig } from 'dotenv';
envConfig();

// Parse Redis URL or use defaults
function getRedisConfig() {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    // Parse URL format: redis://:password@host:port
    try {
      const url = new URL(redisUrl);
      return {
        host: url.hostname || 'localhost',
        port: parseInt(url.port || '6379', 10),
        password: url.password || undefined,
        maxRetriesPerRequest: null, // Required for BullMQ
      };
    } catch (error) {
      logger.error('Invalid REDIS_URL format, using defaults');
    }
  }

  console.log('🔍 ENV CHECK:', {
    REDIS_URL: process.env.REDIS_URL,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
  });

  // Default configuration
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null, // Required for BullMQ
  };
}

// Create Redis connection
const config = getRedisConfig();

export const redisConnection = new Redis({
  ...config,
  retryStrategy: (times) => {
    if (times > 10) {
      logger.error('Redis connection failed after 10 retries');
      return null; // Stop retrying
    }
    const delay = Math.min(times * 100, 3000);
    logger.warn(`Redis connection retry ${times} in ${delay}ms`);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true; // Reconnect on READONLY error
    }
    return false;
  },
});

// Handle connection events
redisConnection.on('connect', () => {
  logger.log('✅ Redis connected for BullMQ');
});

redisConnection.on('error', (err) => {
  logger.error('❌ Redis connection error:', err.message);
});

redisConnection.on('close', () => {
  logger.warn('⚠️ Redis connection closed');
});

redisConnection.on('reconnecting', () => {
  logger.log('🔄 Redis reconnecting...');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  redisConnection.quit();
});

process.on('SIGINT', () => {
  redisConnection.quit();
});

