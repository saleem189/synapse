// ================================
// Sentry Server Configuration
// ================================
// This file configures Sentry for the server-side (API routes, server components)
// Official Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
// Setup Guide: https://synapse.sentry.io/onboarding/setup-docs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // DSN from environment variable - required for Sentry to work
  // Set NEXT_PUBLIC_SENTRY_DSN in your .env.local file
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  environment: process.env.NODE_ENV || 'development',

  // Performance monitoring: 10% in production, 100% in development
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Security: Only send PII if explicitly enabled
  // PII includes user email, IP address, etc.
  // Set SENTRY_SEND_PII=true in .env.local to enable
  sendDefaultPii: process.env.SENTRY_SEND_PII === 'true',

  // Filter sensitive data before sending
  beforeSend(event, hint) {
    if (event.request) {
      // Remove sensitive headers
      if (event.request.headers) {
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
        const headers = event.request.headers;
        sensitiveHeaders.forEach(header => {
          if (headers && headers[header]) {
            delete headers[header];
          }
        });
      }
      
      // Remove cookies
      if (event.request.cookies) {
        delete event.request.cookies;
      }
    }
    
    // Don't send events in development (unless explicitly enabled)
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_SENTRY_ENABLED !== 'true') {
      return null; // Don't send in development
    }
    
    return event;
  },

  // Ignore certain errors
  ignoreErrors: [
    // Browser extensions
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    // Network errors that are expected
    'NetworkError',
    'Failed to fetch',
    // Next.js specific
    'NEXT_REDIRECT',
    'NEXT_NOT_FOUND',
  ],
});
