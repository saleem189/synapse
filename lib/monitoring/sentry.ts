// ================================
// Sentry Error Tracking & Monitoring
// ================================
// Helper functions for manual Sentry error tracking
// 
// Note: Sentry is automatically initialized via:
// - sentry.client.config.ts (client-side)
// - sentry.server.config.ts (server-side)
// - sentry.edge.config.ts (edge runtime)
// - instrumentation.ts (Next.js instrumentation)
//
// Official Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
// Setup Guide: https://chatflow.sentry.io/onboarding/setup-docs/
// Your Dashboard: https://chatflow.sentry.io/

import * as Sentry from '@sentry/nextjs';

/**
 * Capture an exception/error
 */
export function captureException(error: Error, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true') {
    Sentry.captureException(error, {
      extra: context,
      tags: {
        component: context?.component as string || 'unknown',
      },
    });
  } else {
    // In development, just log to console
    console.error('🔴 Error (would be sent to Sentry):', error, context);
  }
}

/**
 * Capture a message (for important events, not general logging)
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' | 'fatal' = 'info',
  context?: Record<string, unknown>
) {
  if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true') {
    Sentry.captureMessage(message, {
      level,
      extra: context,
    });
  } else {
    console.log(`📝 Message (would be sent to Sentry [${level}]):`, message, context);
  }
}

/**
 * Add breadcrumb (for context leading up to errors)
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, unknown>
) {
  if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true') {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data,
      timestamp: Date.now() / 1000,
    });
  }
}

/**
 * Set user context (call after authentication)
 */
export function setUser(user: { id: string; email?: string; username?: string }) {
  if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true') {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  }
}

/**
 * Clear user context (call on logout)
 */
export function clearUser() {
  if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true') {
    Sentry.setUser(null);
  }
}

/**
 * Set additional context (tags, extra data)
 */
export function setContext(key: string, context: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true') {
    Sentry.setContext(key, context);
  }
}

/**
 * Wrap async function with error tracking
 */
export function withErrorTracking<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: string
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        function: fn.name,
        context,
        args: args.length > 0 ? JSON.stringify(args) : undefined,
      });
      throw error;
    }
  }) as T;
}

