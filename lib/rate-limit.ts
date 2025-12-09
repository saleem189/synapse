// ================================
// Rate Limiting
// ================================
// Rate limiting utilities for API routes and Socket.IO
// CRITICAL FIX: Now uses Redis for distributed rate limiting

import { NextRequest } from 'next/server';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { redisConnection } from '@/lib/queue/redis-connection';
import { logger } from '@/lib/logger';

/**
 * Redis-based rate limiter for distributed systems
 * Falls back to in-memory if Redis is unavailable
 */
class DistributedRateLimiter {
  private redisLimiter: RateLimiterRedis | null = null;
  private memoryLimiter: Map<string, number[]> | null = null;
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly keyPrefix: string;

  constructor(maxRequests: number, windowMs: number, keyPrefix: string) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.keyPrefix = keyPrefix;

    // Try to initialize Redis rate limiter
    try {
      this.redisLimiter = new RateLimiterRedis({
        storeClient: redisConnection,
        keyPrefix: `rl:${keyPrefix}:`,
        points: maxRequests,
        duration: Math.floor(windowMs / 1000), // Convert to seconds
        blockDuration: Math.floor(windowMs / 1000), // Block for same duration
      });
      logger.log(`✅ Redis rate limiter initialized: ${keyPrefix}`);
    } catch (error) {
      logger.warn(`⚠️ Redis rate limiter failed, using in-memory fallback: ${keyPrefix}`, error);
      // Fallback to in-memory (simple implementation)
      this.memoryLimiter = new Map<string, number[]>();
      setInterval(() => this.cleanup(), 60000);
    }
  }

  /**
   * Check if request should be allowed
   */
  async isAllowed(identifier: string): Promise<boolean> {
    if (this.redisLimiter) {
      try {
        await this.redisLimiter.consume(identifier);
        return true;
      } catch (rejRes) {
        return false;
      }
    }

    // Fallback to in-memory
    if (!this.memoryLimiter) {
      this.memoryLimiter = new Map();
    }
    const now = Date.now();
    const requests = this.memoryLimiter.get(identifier) || [];
    const validRequests = requests.filter((time: number) => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.memoryLimiter.set(identifier, validRequests);
    return true;
  }

  /**
   * Get remaining requests
   */
  async getRemaining(identifier: string): Promise<number> {
    if (this.redisLimiter) {
      try {
        const res = await this.redisLimiter.get(identifier);
        return res ? res.remainingPoints : this.maxRequests;
      } catch {
        return this.maxRequests;
      }
    }

    // Fallback
    if (!this.memoryLimiter) {
      this.memoryLimiter = new Map();
    }
    const now = Date.now();
    const requests = this.memoryLimiter.get(identifier) || [];
    const validRequests = requests.filter((time: number) => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - validRequests.length);
  }

  /**
   * Get reset time
   */
  async getResetTime(identifier: string): Promise<number> {
    if (this.redisLimiter) {
      try {
        const res = await this.redisLimiter.get(identifier);
        return res ? res.msBeforeNext + Date.now() : Date.now() + this.windowMs;
      } catch {
        return Date.now() + this.windowMs;
      }
    }

    // Fallback
    if (!this.memoryLimiter) {
      this.memoryLimiter = new Map();
    }
    const now = Date.now();
    const requests = this.memoryLimiter.get(identifier) || [];
    const validRequests = requests.filter((time: number) => now - time < this.windowMs);
    if (validRequests.length === 0) {
      return now + this.windowMs;
    }
    const oldestRequest = Math.min(...validRequests);
    return oldestRequest + this.windowMs;
  }

  private cleanup(): void {
    if (!this.memoryLimiter) {
      return;
    }
    const now = Date.now();
    for (const [identifier, requests] of this.memoryLimiter.entries()) {
      const validRequests = requests.filter((time: number) => now - time < this.windowMs);
      if (validRequests.length === 0) {
        this.memoryLimiter.delete(identifier);
      } else {
        this.memoryLimiter.set(identifier, validRequests);
      }
    }
  }
}

// Create distributed rate limiters
export const messageRateLimiter = new DistributedRateLimiter(20, 60000, 'message'); // 20 messages per minute
export const apiRateLimiter = new DistributedRateLimiter(100, 60000, 'api'); // 100 requests per minute
export const authRateLimiter = new DistributedRateLimiter(5, 60000, 'auth'); // 5 auth attempts per minute
export const uploadRateLimiter = new DistributedRateLimiter(10, 60000, 'upload'); // 10 uploads per minute
export const ipRateLimiter = new DistributedRateLimiter(200, 60000, 'ip'); // 200 requests per minute per IP

/**
 * Get client identifier from request
 * Uses IP address or user ID if available
 */
export function getClientIdentifier(request: NextRequest, userId?: string): string {
  // Prefer user ID if available (more accurate for authenticated users)
  if (userId) {
    return `user:${userId}`;
  }
  
  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded 
    ? forwarded.split(',')[0].trim()
    : request.headers.get('x-real-ip') 
    || request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || 'unknown';
  
  return `ip:${ip}`;
}

/**
 * Rate limit middleware for API routes
 * Returns NextResponse with 429 status if rate limited
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  limiter: DistributedRateLimiter,
  userId?: string
): Promise<{ allowed: boolean; response?: Response }> {
  const identifier = getClientIdentifier(request, userId);
  
  const isAllowed = await limiter.isAllowed(identifier);
  const remaining = await limiter.getRemaining(identifier);
  const resetTime = await limiter.getResetTime(identifier);
  
  if (!isAllowed) {
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please slow down.',
            retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
            remaining,
            limit: limiter['maxRequests'],
          },
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': limiter['maxRequests'].toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': resetTime.toString(),
            'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
          },
        }
      ),
    };
  }
  
  // Add rate limit headers to successful responses
  return {
    allowed: true,
    response: new Response(null, {
      status: 200,
      headers: {
        'X-RateLimit-Limit': limiter['maxRequests'].toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetTime.toString(),
      },
    }),
  };
}

