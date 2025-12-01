// ================================
// Email Service
// ================================
// High-level email service that uses the Email Factory
// Provides convenient methods for common email operations

import { EmailServiceFactory, type EmailParams, type EmailResult } from './factories/email.factory';
import { getService } from '@/lib/di';
import { ConfigService } from '@/lib/config/config.service';
import { logger } from '@/lib/logger';

export class EmailService {
  private configService: ConfigService;

  constructor() {
    this.configService = getService<ConfigService>('configService');
  }

  /**
   * Send a single email
   */
  async sendEmail(params: EmailParams): Promise<EmailResult> {
    try {
      const provider = await EmailServiceFactory.getInstance().create();
      return await provider.sendEmail(params);
    } catch (error: any) {
      logger.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulk(emails: EmailParams[]): Promise<{ sent: number; failed: number; results: EmailResult[] }> {
    try {
      const provider = await EmailServiceFactory.getInstance().create();
      return await provider.sendBulk({ emails });
    } catch (error: any) {
      logger.error('Error sending bulk emails:', error);
      throw error;
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(email: string, name: string): Promise<EmailResult> {
    const from = await this.configService.get('email.from', 'noreply@yourapp.com');

    return await this.sendEmail({
      to: email,
      from,
      subject: 'Welcome to Our Platform!',
      html: `
        <h1>Welcome, ${name}!</h1>
        <p>Thank you for joining us. We're excited to have you on board.</p>
        <p>Get started by exploring our features and connecting with others.</p>
      `,
      text: `Welcome, ${name}! Thank you for joining us.`,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string, resetUrl: string): Promise<EmailResult> {
    const from = await this.configService.get('email.from', 'noreply@yourapp.com');

    return await this.sendEmail({
      to: email,
      from,
      subject: 'Reset Your Password',
      html: `
        <h1>Password Reset Request</h1>
        <p>You requested to reset your password. Click the link below to continue:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>Or use this token: <code>${resetToken}</code></p>
        <p>This link will expire in 1 hour.</p>
      `,
      text: `Password Reset Request\n\nClick here to reset: ${resetUrl}\n\nToken: ${resetToken}`,
    });
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(email: string, verificationToken: string, verificationUrl: string): Promise<EmailResult> {
    const from = await this.configService.get('email.from', 'noreply@yourapp.com');

    return await this.sendEmail({
      to: email,
      from,
      subject: 'Verify Your Email Address',
      html: `
        <h1>Verify Your Email</h1>
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>Or use this token: <code>${verificationToken}</code></p>
      `,
      text: `Verify Your Email\n\nClick here: ${verificationUrl}\n\nToken: ${verificationToken}`,
    });
  }

  /**
   * Send notification email
   */
  async sendNotificationEmail(
    email: string,
    subject: string,
    message: string,
    actionUrl?: string,
    actionText?: string
  ): Promise<EmailResult> {
    const html = `
      <h1>${subject}</h1>
      <p>${message}</p>
      ${actionUrl ? `<p><a href="${actionUrl}">${actionText || 'View Details'}</a></p>` : ''}
    `;

    const from = await this.configService.get('email.from', 'noreply@yourapp.com');

    return await this.sendEmail({
      to: email,
      from,
      subject,
      html,
      text: `${subject}\n\n${message}${actionUrl ? `\n\n${actionUrl}` : ''}`,
    });
  }

  /**
   * Get current email provider
   */
  async getCurrentProvider(): Promise<string> {
    return await this.configService.get('email.provider', 'aws-ses');
  }

  /**
   * Switch email provider at runtime
   */
  async switchProvider(provider: string): Promise<void> {
    const factory = EmailServiceFactory.getInstance();
    if (!factory.isProviderRegistered(provider)) {
      throw new Error(`Email provider '${provider}' is not registered`);
    }

    await this.configService.set('email.provider', provider);

    logger.log(`✅ Email provider switched to: ${provider}`);
    logger.log(`   Next email will use: ${provider}`);
  }
}

