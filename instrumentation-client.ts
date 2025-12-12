// ================================
// Sentry Client Instrumentation
// ================================
// This file configures Sentry initialization on the client-side
// Official Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
// Setup Guide: https://synapse.sentry.io/onboarding/setup-docs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // DSN from environment variable - required for Sentry to work
  // Set NEXT_PUBLIC_SENTRY_DSN in your .env.local file
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  environment: process.env.NODE_ENV || 'development',

  // Add optional integrations for additional features
  integrations: [
    Sentry.replayIntegration({
      // Mask all text content and user input for privacy
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Performance monitoring: 10% in production, 100% in development
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session Replay: 10% of sessions in production, 100% in development
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Always capture replays when errors occur
  replaysOnErrorSampleRate: 1.0,

  // Security: Only send PII if explicitly enabled
  sendDefaultPii: process.env.SENTRY_SEND_PII === 'true',

  // Filter sensitive data before sending
  beforeSend(event, hint) {
    // Remove sensitive data from client-side events
    if (event.request) {
      if (event.request.cookies) {
        delete event.request.cookies;
      }
      
      // Remove sensitive headers
      if (event.request.headers) {
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
        const headers = event.request.headers;
        sensitiveHeaders.forEach(header => {
          if (headers && headers[header]) {
            delete headers[header];
          }
        });
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

  // Filter out certain URLs
  denyUrls: [
    // Browser extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
  ],
});

// Note: captureRouterTransitionStart may not be available in all Sentry versions
// Router transitions are automatically tracked by Sentry SDK