# Quick Implementation Guide
## Step-by-Step Code Templates

This guide provides ready-to-use code templates for implementing the recommended architecture.

---

## 1. Enhanced DI Container with Factory Support

**File:** `lib/di/enhanced-container.ts`

```typescript
import { ConfigService } from '@/lib/config/config.service';

type Factory<T> = (config?: any) => T | Promise<T>;
type AsyncFactory<T> = (config?: any) => Promise<T>;

export class EnhancedDIContainer {
  private services = new Map<string, Factory<any>>();
  private factories = new Map<string, AsyncFactory<any>>();
  private singletons = new Map<string, any>();
  private configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;
  }

  /**
   * Register a synchronous service factory
   */
  register<T>(key: string, factory: Factory<T>, singleton: boolean = true): void {
    if (singleton) {
      this.services.set(key, () => {
        if (!this.singletons.has(key)) {
          this.singletons.set(key, factory());
        }
        return this.singletons.get(key);
      });
    } else {
      this.services.set(key, factory);
    }
  }

  /**
   * Register an async factory that can resolve config at runtime
   */
  registerFactory<T>(
    key: string,
    factory: AsyncFactory<T>,
    configKey?: string
  ): void {
    this.factories.set(key, async () => {
      // Check cache first
      if (this.singletons.has(key)) {
        return this.singletons.get(key);
      }

      // Get config if needed
      let config: any = undefined;
      if (configKey) {
        config = await this.configService.get(configKey);
      }

      // Create instance
      const instance = await factory(config);
      
      // Cache singleton
      this.singletons.set(key, instance);
      return instance;
    });
  }

  /**
   * Resolve a service (sync or async)
   */
  async resolve<T>(key: string): Promise<T> {
    // Try factory first
    if (this.factories.has(key)) {
      const factory = this.factories.get(key)!;
      return await factory();
    }

    // Try regular service
    if (this.services.has(key)) {
      const factory = this.services.get(key)!;
      return factory() as T;
    }

    throw new Error(`Service '${key}' not found`);
  }

  /**
   * Clear singleton cache (useful for testing or config updates)
   */
  clearSingleton(key: string): void {
    this.singletons.delete(key);
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this.singletons.clear();
  }
}
```

---

## 2. Configuration Service

**File:** `lib/config/config.service.ts`

```typescript
import { Redis } from 'ioredis';
import prisma from '@/lib/prisma';
import { EventBus } from '@/lib/events/event-bus';

export class ConfigService {
  private cache = new Map<string, { value: any; expiresAt: number }>();
  private redis: Redis;
  private eventBus: EventBus;
  private defaultTTL = 300; // 5 minutes

  constructor(redis: Redis, eventBus: EventBus) {
    this.redis = redis;
    this.eventBus = eventBus;
    
    // Watch for config changes
    this.setupWatcher();
  }

  async get<T>(key: string, defaultValue?: T): Promise<T> {
    // Check memory cache
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }

    // Check Redis
    const redisValue = await this.redis.get(`config:${key}`);
    if (redisValue) {
      const value = JSON.parse(redisValue);
      this.cache.set(key, {
        value,
        expiresAt: Date.now() + this.defaultTTL * 1000,
      });
      return value as T;
    }

    // Check database
    const config = await prisma.config.findUnique({ where: { key } });
    if (config) {
      const value = config.value as T;
      
      // Update Redis and cache
      await this.redis.set(`config:${key}`, JSON.stringify(value));
      this.cache.set(key, {
        value,
        expiresAt: Date.now() + this.defaultTTL * 1000,
      });
      
      return value;
    }

    // Return default or throw
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    
    throw new Error(`Config key '${key}' not found`);
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    // Update database
    await prisma.config.upsert({
      where: { key },
      update: { value, updatedAt: new Date() },
      create: { key, value },
    });

    // Update Redis
    await this.redis.set(`config:${key}`, JSON.stringify(value));
    if (ttl) {
      await this.redis.expire(`config:${key}`, ttl);
    }

    // Update cache
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttl || this.defaultTTL) * 1000,
    });

    // Publish event
    await this.eventBus.publish('config.updated', { key, value });
  }

  async delete(key: string): Promise<void> {
    await prisma.config.delete({ where: { key } });
    await this.redis.del(`config:${key}`);
    this.cache.delete(key);
    await this.eventBus.publish('config.deleted', { key });
  }

  private setupWatcher(): void {
    const subscriber = this.redis.duplicate();
    subscriber.psubscribe('config:*');
    
    subscriber.on('pmessage', (pattern, channel, message) => {
      const key = channel.replace('config:', '');
      const value = JSON.parse(message);
      
      // Update cache
      this.cache.set(key, {
        value,
        expiresAt: Date.now() + this.defaultTTL * 1000,
      });
    });
  }
}
```

---

## 3. Event Bus Implementation

**File:** `lib/events/event-bus.ts`

```typescript
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

export interface EventPayload {
  event: string;
  data: any;
  id: string;
  timestamp: number;
  source?: string;
}

export class EventBus {
  private redis: Redis;
  private subscribers = new Map<string, Set<(data: any) => void>>();
  private patternSubscribers = new Map<string, Set<(event: string, data: any) => void>>();

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async publish(event: string, data: any, source?: string): Promise<void> {
    const payload: EventPayload = {
      event,
      data,
      id: uuidv4(),
      timestamp: Date.now(),
      source: source || 'api',
    };

    // Publish to Redis
    await this.redis.publish(`events:${event}`, JSON.stringify(payload));

    // Store in event log (for replay/debugging)
    await this.redis.lpush(`events:log:${event}`, JSON.stringify(payload));
    await this.redis.ltrim(`events:log:${event}`, 0, 999); // Keep last 1000

    // Store in global event log
    await this.redis.lpush('events:log:all', JSON.stringify(payload));
    await this.redis.ltrim('events:log:all', 0, 9999); // Keep last 10000
  }

  async subscribe(event: string, handler: (data: any) => void): Promise<() => void> {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
      
      // Set up Redis subscription
      const subscriber = this.redis.duplicate();
      await subscriber.subscribe(`events:${event}`);
      
      subscriber.on('message', (channel, message) => {
        const payload: EventPayload = JSON.parse(message);
        this.subscribers.get(event)?.forEach(h => h(payload.data));
      });
    }

    this.subscribers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.subscribers.get(event)?.delete(handler);
    };
  }

  async subscribePattern(
    pattern: string,
    handler: (event: string, data: any) => void
  ): Promise<() => void> {
    if (!this.patternSubscribers.has(pattern)) {
      this.patternSubscribers.set(pattern, new Set());
      
      const subscriber = this.redis.duplicate();
      await subscriber.psubscribe(`events:${pattern}`);
      
      subscriber.on('pmessage', (pattern, channel, message) => {
        const event = channel.replace('events:', '');
        const payload: EventPayload = JSON.parse(message);
        this.patternSubscribers.get(pattern)?.forEach(h => h(event, payload.data));
      });
    }

    this.patternSubscribers.get(pattern)!.add(handler);

    return () => {
      this.patternSubscribers.get(pattern)?.delete(handler);
    };
  }

  async getEventHistory(event: string, limit: number = 100): Promise<EventPayload[]> {
    const events = await this.redis.lrange(`events:log:${event}`, 0, limit - 1);
    return events.map(e => JSON.parse(e));
  }
}
```

---

## 4. Email Service Factory

**File:** `lib/services/factories/email.factory.ts`

```typescript
export interface EmailParams {
  to: string | string[];
  from: string;
  subject: string;
  html?: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface EmailResult {
  messageId: string;
  status: 'sent' | 'failed';
  provider: string;
}

export interface EmailProvider {
  sendEmail(params: EmailParams): Promise<EmailResult>;
  sendBulk(params: EmailParams[]): Promise<EmailResult[]>;
  getStatus(messageId: string): Promise<'sent' | 'delivered' | 'failed' | 'unknown'>;
}

// AWS SES Implementation
export class AWSSESProvider implements EmailProvider {
  private ses: AWS.SES;

  constructor(config: { region: string; accessKeyId?: string; secretAccessKey?: string }) {
    this.ses = new AWS.SES({
      region: config.region,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    });
  }

  async sendEmail(params: EmailParams): Promise<EmailResult> {
    try {
      const result = await this.ses.sendEmail({
        Source: params.from,
        Destination: {
          ToAddresses: Array.isArray(params.to) ? params.to : [params.to],
          CcAddresses: params.cc,
          BccAddresses: params.bcc,
        },
        Message: {
          Subject: { Data: params.subject, Charset: 'UTF-8' },
          Body: {
            Html: params.html ? { Data: params.html, Charset: 'UTF-8' } : undefined,
            Text: params.text ? { Data: params.text, Charset: 'UTF-8' } : undefined,
          },
        },
      }).promise();

      return {
        messageId: result.MessageId!,
        status: 'sent',
        provider: 'aws-ses',
      };
    } catch (error: any) {
      throw new Error(`AWS SES error: ${error.message}`);
    }
  }

  async sendBulk(params: EmailParams[]): Promise<EmailResult[]> {
    // Implementation for bulk sending
    return Promise.all(params.map(p => this.sendEmail(p)));
  }

  async getStatus(messageId: string): Promise<'sent' | 'delivered' | 'failed' | 'unknown'> {
    // AWS SES doesn't provide direct status, would need SNS for bounce/complaint
    return 'unknown';
  }
}

// SendGrid Implementation
export class SendGridProvider implements EmailProvider {
  private sgMail: any;

  constructor(config: { apiKey: string }) {
    this.sgMail = require('@sendgrid/mail');
    this.sgMail.setApiKey(config.apiKey);
  }

  async sendEmail(params: EmailParams): Promise<EmailResult> {
    try {
      const [response] = await this.sgMail.send({
        to: params.to,
        from: params.from,
        subject: params.subject,
        html: params.html,
        text: params.text,
        cc: params.cc,
        bcc: params.bcc,
      });

      return {
        messageId: response.headers['x-message-id'] || 'unknown',
        status: 'sent',
        provider: 'sendgrid',
      };
    } catch (error: any) {
      throw new Error(`SendGrid error: ${error.message}`);
    }
  }

  async sendBulk(params: EmailParams[]): Promise<EmailResult[]> {
    return Promise.all(params.map(p => this.sendEmail(p)));
  }

  async getStatus(messageId: string): Promise<'sent' | 'delivered' | 'failed' | 'unknown'> {
    return 'unknown';
  }
}

// Factory
export class EmailServiceFactory {
  private static providers = new Map<string, (config: any) => EmailProvider>();

  static register(name: string, factory: (config: any) => EmailProvider) {
    this.providers.set(name, factory);
  }

  static async create(config?: any): Promise<EmailProvider> {
    // Get provider from config service or environment
    const configService = await import('@/lib/di').then(m => 
      m.getService<import('@/lib/config/config.service').ConfigService>('configService')
    );
    
    const providerName = config?.provider || 
      await configService.get('email.provider', process.env.EMAIL_PROVIDER || 'aws-ses');
    
    const providerConfig = config || 
      await configService.get(`email.providers.${providerName}`, {});

    const factory = this.providers.get(providerName);
    if (!factory) {
      throw new Error(`Email provider '${providerName}' not registered`);
    }

    return factory(providerConfig);
  }
}

// Register providers
EmailServiceFactory.register('aws-ses', (config) => new AWSSESProvider(config));
EmailServiceFactory.register('sendgrid', (config) => new SendGridProvider(config));
```

---

## 5. OTP Authentication Provider

**File:** `lib/auth/otp.provider.ts`

```typescript
import { Redis } from 'ioredis';
import { SMSServiceFactory } from '@/lib/services/factories/sms.factory';

export class OTPAuthProvider {
  private redis: Redis;
  private otpLength = 6;
  private otpTTL = 300; // 5 minutes

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async sendOTP(phone: string): Promise<{ otpId: string; expiresIn: number }> {
    // Generate OTP
    const otp = this.generateOTP();
    const otpId = `otp:${phone}:${Date.now()}`;

    // Store in Redis
    await this.redis.setex(otpId, this.otpTTL, otp);

    // Send via SMS
    const smsService = await SMSServiceFactory.create();
    await smsService.send(phone, `Your verification code is: ${otp}. Valid for 5 minutes.`);

    return {
      otpId: otpId.replace('otp:', ''),
      expiresIn: this.otpTTL,
    };
  }

  async verifyOTP(phone: string, otp: string, otpId?: string): Promise<boolean> {
    // If otpId provided, use it
    if (otpId) {
      const stored = await this.redis.get(`otp:${phone}:${otpId}`);
      if (stored === otp) {
        await this.redis.del(`otp:${phone}:${otpId}`);
        return true;
      }
      return false;
    }

    // Otherwise, check all OTPs for this phone
    const keys = await this.redis.keys(`otp:${phone}:*`);
    for (const key of keys) {
      const stored = await this.redis.get(key);
      if (stored === otp) {
        await this.redis.del(key);
        return true;
      }
    }

    return false;
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
```

---

## 6. Permission Middleware

**File:** `lib/middleware/permission.middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getService } from '@/lib/di';
import { PermissionService } from '@/lib/permissions/permission.service';

export function requirePermission(resource: string, action: string) {
  return async (req: NextRequest) => {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissionService = getService<PermissionService>('permissionService');
    const hasPermission = await permissionService.checkPermission(
      session.user.id,
      resource,
      action
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return null; // Continue
  };
}

// Usage in API route
export async function DELETE(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const check = await requirePermission('room', 'delete')(request);
  if (check) return check;

  // Continue with delete logic
  // ...
}
```

---

## 7. Service Registration in DI

**File:** `lib/di/providers.ts` (Updated)

```typescript
import { EnhancedDIContainer } from './enhanced-container';
import { ConfigService } from '@/lib/config/config.service';
import { EventBus } from '@/lib/events/event-bus';
import { redisConnection } from '@/lib/queue/redis-connection';

export function setupDI(): void {
  const container = new EnhancedDIContainer(
    getService<ConfigService>('configService')
  );

  // Register core services
  container.register('configService', () => new ConfigService(redisConnection, eventBus));
  container.register('eventBus', () => new EventBus(redisConnection));

  // Register factories
  container.registerFactory('emailService', async (config) => {
    const EmailServiceFactory = await import('@/lib/services/factories/email.factory');
    return await EmailServiceFactory.EmailServiceFactory.create(config);
  }, 'email.provider');

  container.registerFactory('smsService', async (config) => {
    const SMSServiceFactory = await import('@/lib/services/factories/sms.factory');
    return await SMSServiceFactory.SMSServiceFactory.create(config);
  }, 'sms.provider');

  // Register other services...
}
```

---

## 8. Event Handlers Setup

**File:** `lib/events/handlers/index.ts`

```typescript
import { EventBus } from '../event-bus';
import { getService } from '@/lib/di';

export async function setupEventHandlers() {
  const eventBus = getService<EventBus>('eventBus');

  // User registered event
  await eventBus.subscribe('user.registered', async (data) => {
    // Send welcome email
    const emailService = await EmailServiceFactory.create();
    await emailService.sendEmail({
      to: data.email,
      from: 'noreply@yourapp.com',
      subject: 'Welcome!',
      html: generateWelcomeEmail(data.userId),
    });

    // Create notification preferences
    await prisma.notificationPreference.create({
      data: {
        userId: data.userId,
        email: true,
        push: true,
        sms: false,
      },
    });

    // Track analytics
    await analyticsService.track('user_registered', {
      userId: data.userId,
      timestamp: data.timestamp,
    });
  });

  // Message sent event
  await eventBus.subscribe('message.sent', async (data) => {
    // Send push notifications (already queued, but can add more logic)
    // Update analytics
    await analyticsService.track('message_sent', {
      roomId: data.roomId,
      userId: data.userId,
    });
  });
}
```

---

## 9. Feature Flags

**File:** `lib/features/feature-flags.ts`

```typescript
import { ConfigService } from '@/lib/config/config.service';

export class FeatureFlags {
  private configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;
  }

  async isEnabled(feature: string, userId?: string): Promise<boolean> {
    // Check global flag
    const global = await this.configService.get(`features.${feature}.enabled`, false);
    if (!global) return false;

    // Check user-specific override
    if (userId) {
      const userOverride = await this.configService.get(
        `features.${feature}.users.${userId}`,
        null
      );
      if (userOverride !== null) return userOverride;
    }

    // Check percentage rollout
    const rollout = await this.configService.get(`features.${feature}.rollout`, 100);
    if (userId) {
      // Consistent hash for user
      const hash = this.hashUserId(userId);
      return (hash % 100) < rollout;
    }

    return rollout === 100;
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
```

---

## 10. Usage Examples

### Switching Email Provider at Runtime

```typescript
// Update config
const configService = getService<ConfigService>('configService');
await configService.set('email.provider', 'sendgrid');

// Clear singleton cache
const container = getService<EnhancedDIContainer>('container');
container.clearSingleton('emailService');

// Next time emailService is resolved, it will use SendGrid
const emailService = await container.resolve<EmailProvider>('emailService');
```

### Publishing Events

```typescript
const eventBus = getService<EventBus>('eventBus');

// Publish user registration event
await eventBus.publish('user.registered', {
  userId: user.id,
  email: user.email,
  timestamp: Date.now(),
});
```

### Using Feature Flags

```typescript
const featureFlags = getService<FeatureFlags>('featureFlags');

if (await featureFlags.isEnabled('new-chat-ui', userId)) {
  // Show new UI
} else {
  // Show old UI
}
```

---

This guide provides the foundation for implementing the recommended architecture. Start with Phase 1 (Foundation) and gradually add more features.

