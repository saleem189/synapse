// ================================
// Cache Headers Constants
// ================================
// Standardized cache headers for API routes

/**
 * Cache header configurations for different resource types
 * 
 * Format: 'private|public, s-maxage=<seconds>, stale-while-revalidate=<seconds>'
 * 
 * - private: Content is user-specific, should not be cached by CDN
 * - public: Content can be cached by CDN
 * - s-maxage: How long CDN should cache (seconds)
 * - stale-while-revalidate: How long to serve stale content while revalidating (seconds)
 */
export const CACHE_HEADERS = {
  // Messages: Frequently changing, user-specific
  messages: 'private, s-maxage=10, stale-while-revalidate=30',
  
  // Rooms: Moderately changing, can be public
  rooms: 'private, s-maxage=60, stale-while-revalidate=120',
  
  // Users: Less frequently changing, can be public
  users: 'public, s-maxage=300, stale-while-revalidate=600',
  
  // Admin: Frequently changing, private
  admin: 'private, s-maxage=30, stale-while-revalidate=60',
  
  // Admin stats: Can be cached for short periods
  adminStats: 'private, s-maxage=30, stale-while-revalidate=60',
  
  // Admin users: Less frequently changing
  adminUsers: 'private, s-maxage=60, stale-while-revalidate=120',
  
  // Public content: Can be cached longer
  public: 'public, s-maxage=60, stale-while-revalidate=120',
  
  // No cache: For sensitive or real-time data
  noCache: 'no-store, no-cache, must-revalidate',
} as const;

/**
 * Helper function to set cache headers on a response
 */
export function setCacheHeaders(
  response: Response,
  headerType: keyof typeof CACHE_HEADERS
): void {
  response.headers.set('Cache-Control', CACHE_HEADERS[headerType]);
}

