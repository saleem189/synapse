// ================================
// Shutdown Handlers (Node.js Only)
// ================================
// This file contains Node.js-specific shutdown handlers
// It should only be imported in Node.js runtime, not Edge Runtime

// Track if handlers are already registered to prevent duplicates
let handlersRegistered = false;

/**
 * Register shutdown handlers for graceful resource cleanup
 * Ensures all services with destroy() methods are properly cleaned up
 * Prevents memory leaks and connection pool exhaustion
 */
export function registerShutdownHandlers(): void {
  // Only register in Node.js runtime, not Edge Runtime
  if (typeof process === 'undefined' || !process.exit || !process.on) {
    return;
  }

  // Prevent multiple registrations
  if (handlersRegistered) {
    return;
  }
  handlersRegistered = true;

  let isShuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    // Prevent multiple shutdown attempts
    if (isShuttingDown) {
      console.log(`[Shutdown] Already shutting down, ignoring ${signal}`);
      return;
    }
    isShuttingDown = true;

    console.log(`\n🛑 [Shutdown] Received ${signal}, shutting down gracefully...`);

    try {
      // Stop performance monitoring
      try {
        const { getService } = await import('@/lib/di');
        const { getPerformanceMonitor } = await import('@/lib/monitoring/performance-monitor');
        const logger = await getService<import('@/lib/logger/logger.interface').ILogger>('logger');
        const monitor = getPerformanceMonitor(logger);
        monitor.destroy();
        console.log('✅ [Shutdown] Performance monitor stopped');
      } catch (error) {
        // Non-critical, continue shutdown
        console.warn('⚠️ [Shutdown] Error stopping performance monitor:', error);
      }

      // Destroy DI container (calls destroy() on all services)
      const { destroyDI } = await import('@/lib/di/providers');
      await destroyDI();
      console.log('✅ [Shutdown] DI container destroyed');
    } catch (error) {
      console.error('❌ [Shutdown] Error during DI cleanup:', error);
    }

    try {
      // Close main Redis connection - use dynamic require to prevent client bundling
      // Only in Node.js runtime
      if (typeof require !== 'undefined') {
        const { redisConnection } = require('@/lib/queue/redis-connection');
        await redisConnection.quit();
        console.log('✅ [Shutdown] Redis connection closed');
      }
    } catch (error) {
      console.error('❌ [Shutdown] Error closing Redis:', error);
    }

    // Give time for cleanup operations to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('✅ [Shutdown] Graceful shutdown complete');
    if (typeof process !== 'undefined' && process.exit) {
      process.exit(0);
    }
  };

  // Register signal handlers (only in Node.js)
  if (typeof process !== 'undefined' && process.on) {
    // Increase max listeners to prevent warnings if multiple handlers are needed
    // (e.g., in development with hot reloading or multiple processes)
    if (process.setMaxListeners) {
      process.setMaxListeners(15);
    }
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions (log and shutdown)
    process.on('uncaughtException', async (error) => {
      console.error('❌ [Shutdown] Uncaught exception:', error);
      await shutdown('uncaughtException');
    });

    // Handle unhandled promise rejections (log and shutdown)
    process.on('unhandledRejection', async (reason, promise) => {
      console.error('❌ [Shutdown] Unhandled rejection at:', promise, 'reason:', reason);
      await shutdown('unhandledRejection');
    });
  }
}

