// ================================
// Email Event Handlers
// ================================
// Handles email-related events from the event bus

import { getService } from '@/lib/di';
import { EventBus } from '@/lib/events/event-bus';
import { EmailService } from '@/lib/services/email.service';
import type { ILogger } from '@/lib/logger/logger.interface';

/**
 * Set up email event handlers
 * Call this during application startup
 */
export async function setupEmailEventHandlers(): Promise<void> {
  const eventBus = await getService<EventBus>('eventBus');
  const emailService = await getService<EmailService>('emailService');
  const logger = await getService<ILogger>('logger');

  // User registered - send welcome email
  await eventBus.subscribe('user.registered', async (data: { userId: string; email: string; name: string }) => {
    try {
      logger.log(`📧 Sending welcome email to ${data.email}`);
      await emailService.sendWelcomeEmail(data.email, data.name);
    } catch (error: unknown) {
      logger.error(`Failed to send welcome email to ${data.email}:`, error, {
        component: 'EmailEventHandlers',
        email: data.email,
      });
    }
  });

  // Password reset requested
  await eventBus.subscribe('user.password-reset-requested', async (data: {
    email: string;
    resetToken: string;
    resetUrl: string;
  }) => {
    try {
      logger.log(`📧 Sending password reset email to ${data.email}`);
      await emailService.sendPasswordResetEmail(data.email, data.resetToken, data.resetUrl);
    } catch (error: unknown) {
      logger.error(`Failed to send password reset email to ${data.email}:`, error, {
        component: 'EmailEventHandlers',
        email: data.email,
      });
    }
  });

  // Email verification requested
  await eventBus.subscribe('user.email-verification-requested', async (data: {
    email: string;
    verificationToken: string;
    verificationUrl: string;
  }) => {
    try {
      logger.log(`📧 Sending verification email to ${data.email}`);
      await emailService.sendVerificationEmail(data.email, data.verificationToken, data.verificationUrl);
    } catch (error: unknown) {
      logger.error(`Failed to send verification email to ${data.email}:`, error, {
        component: 'EmailEventHandlers',
        email: data.email,
      });
    }
  });

  // Notification email
  await eventBus.subscribe('email.notification', async (data: {
    email: string;
    subject: string;
    message: string;
    actionUrl?: string;
    actionText?: string;
  }) => {
    try {
      logger.log(`📧 Sending notification email to ${data.email}`);
      await emailService.sendNotificationEmail(
        data.email,
        data.subject,
        data.message,
        data.actionUrl,
        data.actionText
      );
    } catch (error: unknown) {
      logger.error(`Failed to send notification email to ${data.email}:`, error, {
        component: 'EmailEventHandlers',
        email: data.email,
      });
    }
  });

  logger.log('✅ Email event handlers registered');
}

