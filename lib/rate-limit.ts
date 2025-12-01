// ================================
// Rate Limiting
// ================================
// Rate limiting utilities for API routes and Socket.IO
// Uses in-memory rate limiting (for single server) or can be extended to use Redis

import { NextRequest } from 'next/server';

/**
 * Simple in-memory rate limiter
 * For production with multiple servers, use Redis-based rate limiting
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    
    // Clean up old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if request should be allowed
   * @param identifier - Unique identifier (IP, user ID, etc.)
   * @returns true if allowed, false if rate limited
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Remove requests outside the time window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }

  /**
   * Get remaining requests for an identifier
   */
  getRemaining(identifier: string): number {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    const validRequests = requests.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - validRequests.length);
  }

  /**
   * Get reset time (when the rate limit window resets)
   */
  getResetTime(identifier: string): number {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length === 0) {
      return now + this.windowMs;
    }
    
    const oldestRequest = Math.min(...validRequests);
    return oldestRequest + this.windowMs;
  }

  /**
   * Clean up old entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => now - time < this.windowMs);
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }
}

// Create rate limiters for different endpoints
export const messageRateLimiter = new RateLimiter(20, 60000); // 20 messages per minute
export const apiRateLimiter = new RateLimiter(100, 60000); // 100 requests per minute
export const authRateLimiter = new RateLimiter(5, 60000); // 5 auth attempts per minute
export const uploadRateLimiter = new RateLimiter(10, 60000); // 10 uploads per minute

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
    || request.ip 
    || 'unknown';
  
  return `ip:${ip}`;
}

/**
 * Rate limit middleware for API routes
 * Returns NextResponse with 429 status if rate limited
 */
export function rateLimitMiddleware(
  request: NextRequest,
  limiter: RateLimiter,
  userId?: string
): { allowed: boolean; response?: Response } {
  const identifier = getClientIdentifier(request, userId);
  
  if (!limiter.isAllowed(identifier)) {
    const resetTime = limiter.getResetTime(identifier);
    const remaining = limiter.getRemaining(identifier);
    
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
  
  const remaining = limiter.getRemaining(identifier);
  const resetTime = limiter.getResetTime(identifier);
  
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

