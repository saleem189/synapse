// ================================
// Prisma Client Singleton
// ================================
// This module exports a singleton instance of the Prisma Client
// to prevent multiple instances in development (hot reloading)

import { PrismaClient, Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

// Declare a global variable to hold the Prisma Client instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Configure connection pool and timeouts
// Connection pool configuration can be in DATABASE_URL or here
// Recommended: Add to DATABASE_URL for better control
// DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10&connect_timeout=10&statement_timeout=5000"
const getDatabaseUrl = (): string => {
  const baseUrl = process.env.DATABASE_URL || "";
  
  // If URL already has query params, append to them
  if (baseUrl.includes("?")) {
    // Check if timeout params already exist
    if (!baseUrl.includes("statement_timeout")) {
      return `${baseUrl}&statement_timeout=5000`;
    }
    return baseUrl;
  }
  
  // Add timeout params if not in URL
  // Note: Connection pool params should be in DATABASE_URL for best results
  return `${baseUrl}?statement_timeout=5000`;
};

// Create or reuse the Prisma Client instance
// In production: always create a new instance
// In development: reuse the existing instance to avoid too many connections
// CRITICAL FIX: Added connection pool configuration, timeouts, and slow query logging
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' }, // Enable query event logging
      { emit: 'stdout', level: 'error' },
      ...(process.env.NODE_ENV === "development" 
        ? [{ emit: 'stdout', level: 'warn' } as const]
        : []
      ),
    ],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  });

// Slow query logging - log queries that take longer than 1 second
prisma.$on('query', (e: Prisma.QueryEvent) => {
  const slowQueryThreshold = 1000; // 1 second in milliseconds
  
  if (e.duration > slowQueryThreshold) {
    logger.warn('🐌 Slow query detected', {
      query: e.query,
      duration: `${e.duration}ms`,
      params: e.params,
      target: e.target,
    });
  }
  
  // In development, log all queries
  if (process.env.NODE_ENV === "development" && e.duration > 100) {
    logger.log(`[Query] ${e.duration}ms - ${e.query.substring(0, 100)}...`);
  }
});

// Store the instance in the global object during development
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;

