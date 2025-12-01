import webpush from 'web-push';
import prisma from '@/lib/prisma';
import { getService } from '@/lib/di';
import { ConfigService } from '@/lib/config/config.service';
import { logger } from '@/lib/logger';

export class PushService {
  private webpush: typeof webpush;
  private configService: ConfigService | null = null;

  constructor() {
    this.webpush = webpush;
    this.initializeVAPID();
  }

  /**
   * Initialize VAPID keys from config or environment
   * ConfigService now automatically falls back to environment variables
   */
  private async initializeVAPID(): Promise<void> {
    try {
      // Get from ConfigService (automatically checks DB -> Redis -> Env vars)
      this.configService = getService<ConfigService>('configService');

      const subject = await this.configService.get<string>('push.vapid.subject');
      const publicKey = await this.configService.get<string>('push.vapid.publicKey');
      const privateKey = await this.configService.get<string>('push.vapid.privateKey');

      if (subject && publicKey && privateKey) {
        this.webpush.setVapidDetails(subject, publicKey, privateKey);
        logger.log('✅ VAPID keys configured for push notifications');
      } else {
        logger.warn('⚠️ VAPID keys not found. Push notifications will not work.');
      }
    } catch (error) {
      logger.warn('⚠️ VAPID keys not found. Push notifications will not work.');
      logger.error('Error initializing VAPID:', error);
    }
  }

  /**
   * Save a push subscription for a user
   */
  async saveSubscription(userId: string, subscription: any) {
    try {
      logger.log('saveSubscription called with:', { userId, subscription });

      if (!userId || !subscription || !subscription.endpoint) {
        throw new Error('Invalid subscription data');
      }

      // Extract keys
      const p256dh = subscription.keys?.p256dh;
      const auth = subscription.keys?.auth;

      logger.log('Extracted keys:', { p256dh: !!p256dh, auth: !!auth });

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
        logger.log('Subscription already exists:', existing.id);
        return existing;
      }

      // Create new subscription
      logger.log('Creating new subscription...');
      const result = await prisma.pushSubscription.create({
        data: {
          userId,
          endpoint: subscription.endpoint,
          p256dh,
          auth,
        },
      });
      logger.log('Subscription created:', result.id);
      return result;
    } catch (error) {
      logger.error('Error in saveSubscription:', error);
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

    // Send to all subscriptions
    const promises = subscriptions.map(async (sub) => {
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
      } catch (error: any) {
        // If subscription is invalid (410 Gone), delete it
        if (error.statusCode === 410) {
          await prisma.pushSubscription.delete({
            where: { id: sub.id },
          });
        } else {
          logger.error('Error sending push notification:', error);
        }
      }
    });

    await Promise.all(promises);
  }
}

export const pushService = new PushService();
