// ================================
// Push Notification Service
// ================================
// Handles push notifications using Web Push API
// Uses VAPID keys for authentication
// SERVER-ONLY: Uses Node.js modules

import 'server-only'; // Mark as server-only to prevent client bundling

import webpush from 'web-push';
import prisma from '@/lib/prisma';
import { getService } from '@/lib/di';
import { ConfigService } from '@/lib/config/config.service';
import type { ILogger } from '@/lib/logger/logger.interface';

/**
 * Push subscription structure
 */
export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class PushService {
  private webpush: typeof webpush;
  private configService: ConfigService | null = null;

  constructor(private logger: ILogger) {
    this.webpush = webpush;
    this.initializeVAPID();
  }

  /**
   * Get config service (lazy initialization)
   */
  private async getConfigService(): Promise<ConfigService> {
    if (!this.configService) {
      this.configService = await getService<ConfigService>('configService');
    }
    return this.configService;
  }

  /**
   * Initialize VAPID keys from config or environment
   * ConfigService now automatically falls back to environment variables
   */
  private async initializeVAPID(): Promise<void> {
    try {
      // Get from ConfigService (automatically checks DB -> Redis -> Env vars)
      const configService = await this.getConfigService();

      const subject = await configService.get<string>('push.vapid.subject');
      const publicKey = await configService.get<string>('push.vapid.publicKey');
      const privateKey = await configService.get<string>('push.vapid.privateKey');

      if (subject && publicKey && privateKey) {
        this.webpush.setVapidDetails(subject, publicKey, privateKey);
        this.logger.log('✅ VAPID keys configured for push notifications');
      } else {
        this.logger.warn('⚠️ VAPID keys not found. Push notifications will not work.', {
          component: 'PushService',
        });
      }
    } catch (error) {
      this.logger.warn('⚠️ VAPID keys not found. Push notifications will not work.', {
        component: 'PushService',
      });
      this.logger.error('Error initializing VAPID:', error, {
        component: 'PushService',
      });
    }
  }

  /**
   * Save a push subscription for a user
   */
  async saveSubscription(userId: string, subscription: PushSubscription): Promise<{ id: string; userId: string; endpoint: string; p256dh: string; auth: string; createdAt: Date; updatedAt: Date }> {
    try {
      this.logger.log('saveSubscription called with:', userId, subscription);

      if (!userId || !subscription || !subscription.endpoint) {
        throw new Error('Invalid subscription data');
      }

      // Extract keys
      const p256dh = subscription.keys?.p256dh;
      const auth = subscription.keys?.auth;

      this.logger.log('Extracted keys:', p256dh ? 'p256dh exists' : 'p256dh missing', auth ? 'auth exists' : 'auth missing');

      if (!p256dh || !auth) {
        throw new Error('Invalid subscription keys');
      }

      // Check if subscription already exists
      const existing = await prisma.pushSubscription.findFirst({
        where: {
          userId,
          endpoint: subscription.endpoint,
        },
      });

      if (existing) {
        this.logger.log('Subscription already exists:', existing.id);
        return existing;
      }

      // Create new subscription
      this.logger.log('Creating new subscription...');
      const result = await prisma.pushSubscription.create({
        data: {
          userId,
          endpoint: subscription.endpoint,
          p256dh,
          auth,
        },
      });
      this.logger.log('Subscription created:', result.id);
      return result;
    } catch (error) {
      this.logger.error('Error in saveSubscription:', error, {
        component: 'PushService',
        userId,
      });
      throw error;
    }
  }

  /**
   * Send a notification to a user
   */
  async sendNotification(userId: string, payload: { title: string; body: string; url?: string; icon?: string }) {
    if (!userId) return;

    // Get all subscriptions for the user
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) return;

    const notificationPayload = JSON.stringify(payload);

    // Send to all subscriptions using Promise.allSettled to handle failures gracefully
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await this.webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            notificationPayload
          );
          return { success: true, subscriptionId: sub.id };
        } catch (error: unknown) {
          // If subscription is invalid (410 Gone), delete it
          const webPushError = error as { statusCode?: number };
          if (webPushError.statusCode === 410) {
            await prisma.pushSubscription.delete({
              where: { id: sub.id },
            });
            this.logger.log(`Removed invalid subscription ${sub.id}`);
          } else {
            this.logger.error(`Error sending push notification to ${sub.id}:`, error, {
              component: 'PushService',
              subscriptionId: sub.id,
              userId,
            });
          }
          return { success: false, subscriptionId: sub.id, error };
        }
      })
    );

    // Log summary with details
    const failed = results.filter(
      r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
    );
    const successful = results.filter(
      r => r.status === 'fulfilled' && r.value.success
    );
    
    if (failed.length > 0) {
      const failedDetails = failed.map(r => {
        if (r.status === 'rejected') {
          return { subscriptionId: 'unknown', error: r.reason?.message || 'Unknown error' };
        }
        const errorMessage = r.value.error && typeof r.value.error === 'object' && 'message' in r.value.error 
          ? String(r.value.error.message) 
          : 'Unknown error';
        return { subscriptionId: r.value.subscriptionId, error: errorMessage };
      });
      this.logger.warn(
        `Failed to send ${failed.length}/${subscriptions.length} push notifications`,
        { component: 'PushService', userId, failed: failedDetails }
      );
    }
    
    if (successful.length > 0) {
      this.logger.log(`✅ Successfully sent ${successful.length}/${subscriptions.length} push notifications`);
    }
  }
}

// Note: pushService singleton is now created in DI container (providers.ts)
// This export is kept for backward compatibility during migration
