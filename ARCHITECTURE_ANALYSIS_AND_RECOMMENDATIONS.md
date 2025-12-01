# Backend Architecture Analysis & Recommendations
## Scalability, Maintainability, and Decoupling Strategy

---

## Executive Summary

This document provides a comprehensive analysis of the current backend architecture and detailed recommendations for building a fully decoupled, scalable, and maintainable system that supports:
- Runtime service selection (e.g., switch email providers without redeployment)
- OTP-based authentication and phone verification
- Email verification via AWS SES or other providers
- User role and permission management
- Third-party integrations (payments, SMS, etc.)
- Microservices architecture (analytics, notifications, chat)
- High concurrency and resilience

---

## 1. Current Architecture Analysis

### 1.1 Current State

**Architecture Pattern:** Monolithic Next.js Application with API Routes

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js App Router                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  API Routes  │  │   Pages      │  │  Components  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼──────────────────┼──────────────────┼──────────┘
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼──────────┐
│              Service Layer (DI Container)                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Message  │ │  Room    │ │  User    │ │  Admin   │  │
│  │ Service  │ │ Service  │ │ Service  │ │ Service  │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │
└───────┼────────────┼─────────────┼────────────┼─────────┘
        │            │             │            │
┌───────▼────────────▼─────────────▼────────────▼─────────┐
│              Repository Layer (Prisma)                   │
└───────────────────────────┬──────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────┐
│              PostgreSQL Database                          │
└───────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Background Services                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Socket.IO    │  │  BullMQ      │  │  Push        │  │
│  │ Server       │  │  Worker      │  │  Service     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Strengths

✅ **Dependency Injection Container** - Basic DI pattern implemented
✅ **Repository Pattern** - Data access layer abstracted
✅ **Service Layer** - Business logic separated
✅ **Queue System** - BullMQ for background jobs
✅ **Real-time Support** - Socket.IO with Redis adapter
✅ **Type Safety** - TypeScript throughout

### 1.3 Critical Bottlenecks & Issues

#### 🔴 **High Priority Issues**

1. **Tight Coupling**
   - `PushService` directly imported, not via DI
   - Services hardcode dependencies (e.g., `webpush` in `PushService`)
   - No abstraction layer for third-party services

2. **No Service Factory Pattern**
   - Cannot switch providers at runtime
   - Configuration hardcoded in service classes
   - No strategy pattern for interchangeable services

3. **Limited Scalability**
   - Single Next.js instance (no horizontal scaling for API routes)
   - Socket.IO server is standalone but not containerized
   - No load balancing strategy

4. **No Event-Driven Architecture**
   - Services call each other directly
   - No event bus for decoupled communication
   - Difficult to add new features without modifying existing code

5. **Configuration Management**
   - Environment variables scattered
   - No centralized config service
   - No runtime configuration updates

6. **No Feature Flags**
   - Cannot enable/disable features without deployment
   - No A/B testing capability
   - No gradual rollouts

#### 🟡 **Medium Priority Issues**

7. **Authentication Limitations**
   - Only email/password auth
   - No OTP support
   - No phone verification
   - No multi-factor authentication

8. **No Permission System**
   - Basic role system (`user`, `admin`)
   - No granular permissions
   - No RBAC (Role-Based Access Control)

9. **Notification System**
   - Only push notifications
   - No email notifications
   - No SMS support
   - No notification preferences

10. **No Service Discovery**
    - Services hardcoded
    - No dynamic service registration
    - Cannot add microservices easily

---

## 2. Recommended Architecture

### 2.1 Target Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway / Load Balancer                 │
│                    (AWS ALB / CloudFlare / Nginx)               │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐
│  Next.js API  │  │  Next.js API    │  │  Next.js API    │
│   Instance 1  │  │   Instance 2    │  │   Instance N    │
└───────┬────────┘  └────────┬────────┘  └────────┬────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐
│  Service Layer │  │  Event Bus      │  │  Config Service │
│  (DI Container)│  │  (Redis Pub/Sub)│  │  (Redis/DynamoDB)│
└───────┬────────┘  └────────┬────────┘  └────────┬────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    Service Factory Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Email Factory│  │  SMS Factory │  │  Auth Factory│          │
│  │ - AWS SES    │  │ - Twilio     │  │ - OTP        │          │
│  │ - SendGrid   │  │ - AWS SNS    │  │ - JWT        │          │
│  │ - Mailgun    │  │ - Custom     │  │ - OAuth      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    Queue System (BullMQ)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Email Queue  │  │  SMS Queue   │  │  File Queue  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    Worker Processes                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Email Worker │  │  SMS Worker  │  │  File Worker │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Microservices (Optional)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Analytics    │  │ Notification │  │  Chat        │          │
│  │ Service      │  │  Service     │  │  Service     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Core Design Patterns

#### **1. Service Factory Pattern**
```typescript
// Abstract interface
interface EmailProvider {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

// Concrete implementations
class AWSSESProvider implements EmailProvider { ... }
class SendGridProvider implements EmailProvider { ... }
class MailgunProvider implements EmailProvider { ... }

// Factory
class EmailServiceFactory {
  static create(provider: string): EmailProvider {
    switch(provider) {
      case 'aws-ses': return new AWSSESProvider();
      case 'sendgrid': return new SendGridProvider();
      case 'mailgun': return new MailgunProvider();
      default: throw new Error(`Unknown provider: ${provider}`);
    }
  }
}
```

#### **2. Strategy Pattern with Runtime Selection**
```typescript
// Service registry with runtime configuration
class ServiceRegistry {
  private providers = new Map<string, any>();
  
  register(name: string, factory: () => any) {
    this.providers.set(name, factory);
  }
  
  resolve<T>(name: string): T {
    const factory = this.providers.get(name);
    if (!factory) throw new Error(`Service ${name} not found`);
    return factory();
  }
}

// Runtime configuration from Redis/Database
class ConfigService {
  async getProvider(serviceType: string): Promise<string> {
    // Fetch from Redis or Database
    return await redis.get(`config:${serviceType}:provider`);
  }
}
```

#### **3. Event-Driven Architecture**
```typescript
// Event bus using Redis Pub/Sub
class EventBus {
  async publish(event: string, data: any) {
    await redis.publish(`events:${event}`, JSON.stringify(data));
  }
  
  async subscribe(event: string, handler: (data: any) => void) {
    const subscriber = redis.duplicate();
    await subscriber.subscribe(`events:${event}`);
    subscriber.on('message', (channel, message) => {
      handler(JSON.parse(message));
    });
  }
}

// Usage
eventBus.publish('user.registered', { userId, email });
eventBus.subscribe('user.registered', async (data) => {
  await emailService.sendWelcomeEmail(data.email);
});
```

#### **4. Dependency Injection with Factory Support**
```typescript
// Enhanced DI Container
class DIContainer {
  private factories = new Map<string, (config: any) => any>();
  private instances = new Map<string, any>();
  
  registerFactory<T>(
    key: string,
    factory: (config: any) => T
  ) {
    this.factories.set(key, factory);
  }
  
  async resolve<T>(key: string): Promise<T> {
    // Check if instance exists
    if (this.instances.has(key)) {
      return this.instances.get(key);
    }
    
    // Get factory and config
    const factory = this.factories.get(key);
    if (!factory) throw new Error(`Factory ${key} not found`);
    
    const config = await configService.get(key);
    const instance = factory(config);
    
    // Cache instance
    this.instances.set(key, instance);
    return instance;
  }
}
```

---

## 3. Detailed Component Architecture

### 3.1 Service Factory System

**Location:** `lib/services/factories/`

```
lib/services/factories/
├── email.factory.ts          # Email provider factory
├── sms.factory.ts            # SMS provider factory
├── auth.factory.ts           # Authentication provider factory
├── payment.factory.ts        # Payment gateway factory
├── storage.factory.ts        # File storage factory (S3, GCS, etc.)
└── index.ts                  # Export all factories
```

**Implementation Example:**
```typescript
// lib/services/factories/email.factory.ts
export interface EmailProvider {
  sendEmail(params: EmailParams): Promise<EmailResult>;
  sendBulk(params: BulkEmailParams): Promise<BulkEmailResult>;
  getStatus(messageId: string): Promise<EmailStatus>;
}

export class EmailServiceFactory {
  private static providers = new Map<string, () => EmailProvider>();
  
  static register(name: string, factory: () => EmailProvider) {
    this.providers.set(name, factory);
  }
  
  static async create(config?: EmailConfig): Promise<EmailProvider> {
    // Get provider from config service or environment
    const providerName = config?.provider || 
      await configService.get('email.provider') || 
      process.env.EMAIL_PROVIDER || 
      'aws-ses';
    
    const factory = this.providers.get(providerName);
    if (!factory) {
      throw new Error(`Email provider '${providerName}' not registered`);
    }
    
    return factory();
  }
}

// Register providers
EmailServiceFactory.register('aws-ses', () => new AWSSESProvider());
EmailServiceFactory.register('sendgrid', () => new SendGridProvider());
EmailServiceFactory.register('mailgun', () => new MailgunProvider());
```

### 3.2 Configuration Service

**Location:** `lib/config/`

```typescript
// lib/config/config.service.ts
export class ConfigService {
  private cache = new Map<string, any>();
  private redis: Redis;
  
  async get<T>(key: string, defaultValue?: T): Promise<T> {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    // Check Redis
    const value = await this.redis.get(`config:${key}`);
    if (value) {
      const parsed = JSON.parse(value);
      this.cache.set(key, parsed);
      return parsed;
    }
    
    // Check database
    const config = await prisma.config.findUnique({ where: { key } });
    if (config) {
      await this.redis.set(`config:${key}`, JSON.stringify(config.value));
      this.cache.set(key, config.value);
      return config.value as T;
    }
    
    // Return default or throw
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Config key '${key}' not found`);
  }
  
  async set(key: string, value: any, ttl?: number) {
    await prisma.config.upsert({
      where: { key },
      update: { value, updatedAt: new Date() },
      create: { key, value },
    });
    
    await this.redis.set(`config:${key}`, JSON.stringify(value));
    if (ttl) await this.redis.expire(`config:${key}`, ttl);
    this.cache.set(key, value);
    
    // Publish config change event
    await eventBus.publish('config.updated', { key, value });
  }
  
  async watch(key: string, callback: (value: any) => void) {
    const subscriber = redis.duplicate();
    await subscriber.subscribe(`config:${key}`);
    subscriber.on('message', (channel, message) => {
      const value = JSON.parse(message);
      this.cache.set(key, value);
      callback(value);
    });
  }
}
```

### 3.3 Event Bus System

**Location:** `lib/events/`

```typescript
// lib/events/event-bus.ts
export class EventBus {
  private redis: Redis;
  private subscribers = new Map<string, Set<(data: any) => void>>();
  
  async publish(event: string, data: any) {
    const payload = {
      event,
      data,
      timestamp: Date.now(),
      id: generateId(),
    };
    
    await this.redis.publish(`events:${event}`, JSON.stringify(payload));
    
    // Also store in event log for replay/debugging
    await this.redis.lpush(`events:log:${event}`, JSON.stringify(payload));
    await this.redis.ltrim(`events:log:${event}`, 0, 1000); // Keep last 1000
  }
  
  async subscribe(event: string, handler: (data: any) => void) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
      
      // Set up Redis subscription
      const subscriber = this.redis.duplicate();
      await subscriber.subscribe(`events:${event}`);
      subscriber.on('message', (channel, message) => {
        const payload = JSON.parse(message);
        this.subscribers.get(event)?.forEach(h => h(payload.data));
      });
    }
    
    this.subscribers.get(event)!.add(handler);
    
    return () => {
      this.subscribers.get(event)?.delete(handler);
    };
  }
  
  async subscribePattern(pattern: string, handler: (event: string, data: any) => void) {
    const subscriber = this.redis.duplicate();
    const psubscriber = subscriber.duplicate();
    
    await psubscriber.psubscribe(`events:${pattern}`);
    psubscriber.on('pmessage', (pattern, channel, message) => {
      const event = channel.replace('events:', '');
      const payload = JSON.parse(message);
      handler(event, payload.data);
    });
  }
}
```

### 3.4 Authentication & Authorization System

**Location:** `lib/auth/`

```typescript
// lib/auth/auth.factory.ts
export interface AuthProvider {
  authenticate(credentials: AuthCredentials): Promise<AuthResult>;
  verifyToken(token: string): Promise<User>;
  refreshToken(token: string): Promise<string>;
}

export class AuthServiceFactory {
  static async create(type: 'jwt' | 'otp' | 'oauth'): Promise<AuthProvider> {
    switch(type) {
      case 'jwt':
        return new JWTAuthProvider();
      case 'otp':
        return new OTPAuthProvider();
      case 'oauth':
        return new OAuthProvider();
      default:
        throw new Error(`Unknown auth type: ${type}`);
    }
  }
}

// lib/auth/otp.provider.ts
export class OTPAuthProvider implements AuthProvider {
  async sendOTP(phone: string): Promise<void> {
    const otp = generateOTP();
    await redis.setex(`otp:${phone}`, 300, otp); // 5 min TTL
    
    // Use SMS factory to send
    const smsService = await SMSServiceFactory.create();
    await smsService.send(phone, `Your OTP is: ${otp}`);
  }
  
  async verifyOTP(phone: string, otp: string): Promise<boolean> {
    const stored = await redis.get(`otp:${phone}`);
    if (stored === otp) {
      await redis.del(`otp:${phone}`);
      return true;
    }
    return false;
  }
}
```

### 3.5 Permission & Role System

**Location:** `lib/permissions/`

```typescript
// lib/permissions/permission.service.ts
export class PermissionService {
  async checkPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { permissions: true } } },
    });
    
    // Check direct permissions
    const hasDirect = user?.permissions?.some(
      p => p.resource === resource && p.action === action
    );
    if (hasDirect) return true;
    
    // Check role permissions
    const hasRole = user?.roles?.some(role =>
      role.permissions.some(
        p => p.resource === resource && p.action === action
      )
    );
    
    return hasRole || false;
  }
  
  async grantPermission(userId: string, resource: string, action: string) {
    await prisma.userPermission.create({
      data: { userId, resource, action },
    });
    
    // Invalidate cache
    await redis.del(`permissions:${userId}`);
  }
}

// Middleware
export function requirePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const hasPermission = await permissionService.checkPermission(
      userId,
      resource,
      action
    );
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    next();
  };
}
```

---

## 4. Infrastructure Recommendations

### 4.1 AWS Services Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AWS CloudFront                        │
│              (CDN for static assets)                     │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              Application Load Balancer                  │
│              (ALB with SSL termination)                 │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
┌───────▼────┐  ┌────▼────┐  ┌───▼────┐
│  ECS Fargate│  │ ECS Fargate│ │ ECS Fargate│
│  Next.js   │  │  Next.js   │ │  Next.js   │
│  Task 1    │  │  Task 2    │ │  Task N    │
└───────┬────┘  └────┬────┘  └───┬────┘
        │            │            │
        └────────────┼────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                    ElastiCache (Redis)                   │
│  - Queue (BullMQ)                                       │
│  - Cache                                                │
│  - Pub/Sub (Event Bus)                                  │
│  - Session Store                                        │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              RDS PostgreSQL (Multi-AZ)                  │
│  - Primary Database                                      │
│  - Read Replicas (for scaling reads)                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Background Services (ECS)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Socket.IO    │  │  BullMQ      │  │  Analytics   │  │
│  │ Workers      │  │  Workers     │  │  Workers     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              AWS Services                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  SES (Email) │  │  SNS (SMS)   │  │  S3 (Files)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Scaling Strategy

**Horizontal Scaling:**
- **API Layer:** ECS Fargate with auto-scaling (CPU/Memory based)
- **Workers:** Separate ECS services with independent scaling
- **Database:** Read replicas for read-heavy operations
- **Cache:** ElastiCache cluster mode for high availability

**Vertical Scaling:**
- **Database:** Upgrade instance type for write-heavy workloads
- **Cache:** Increase node size for larger datasets

**Load Balancing:**
- **ALB:** Route traffic to healthy ECS tasks
- **Health Checks:** `/health` endpoint on each service
- **Sticky Sessions:** For Socket.IO connections

### 4.3 Queue Management

**BullMQ Configuration:**
```typescript
// Separate queues for different priorities
const queues = {
  critical: new Queue('critical', { 
    connection: redis,
    defaultJobOptions: { priority: 10 }
  }),
  normal: new Queue('normal', { 
    connection: redis,
    defaultJobOptions: { priority: 5 }
  }),
  low: new Queue('low', { 
    connection: redis,
    defaultJobOptions: { priority: 1 }
  }),
};

// Workers with different concurrency
const criticalWorker = new Worker('critical', processor, {
  connection: redis,
  concurrency: 10, // Higher for critical
});

const normalWorker = new Worker('normal', processor, {
  connection: redis,
  concurrency: 5,
});
```

### 4.4 Service Discovery

**Option 1: Redis-based Service Registry**
```typescript
class ServiceRegistry {
  async register(serviceName: string, endpoint: string, metadata: any) {
    await redis.hset(`services:${serviceName}`, {
      endpoint,
      metadata: JSON.stringify(metadata),
      lastHeartbeat: Date.now(),
    });
    
    // Set expiration (service must heartbeat)
    await redis.expire(`services:${serviceName}`, 30);
  }
  
  async discover(serviceName: string): Promise<string[]> {
    const services = await redis.hgetall(`services:${serviceName}`);
    return Object.values(services).map(s => JSON.parse(s).endpoint);
  }
}
```

**Option 2: AWS ECS Service Discovery**
- Use ECS service discovery for automatic DNS-based discovery
- Services register with Route 53 private hosted zone

---

## 5. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Implement Configuration Service
- [ ] Create Service Factory base classes
- [ ] Set up Event Bus
- [ ] Enhance DI Container with factory support

### Phase 2: Email System (Week 3)
- [ ] Create Email Provider interface
- [ ] Implement AWS SES provider
- [ ] Implement SendGrid provider
- [ ] Create Email Service Factory
- [ ] Migrate existing email logic

### Phase 3: Authentication (Week 4)
- [ ] Implement OTP provider
- [ ] Add phone verification
- [ ] Create Auth Factory
- [ ] Add MFA support

### Phase 4: Permissions (Week 5)
- [ ] Design permission schema
- [ ] Implement Permission Service
- [ ] Create permission middleware
- [ ] Add RBAC support

### Phase 5: Infrastructure (Week 6)
- [ ] Set up AWS infrastructure
- [ ] Configure ECS services
- [ ] Set up ElastiCache
- [ ] Configure load balancer

### Phase 6: Microservices (Weeks 7-8)
- [ ] Extract analytics service
- [ ] Extract notification service
- [ ] Implement service discovery
- [ ] Set up inter-service communication

---

## 6. Best Practices

### 6.1 Service Design
- **Single Responsibility:** Each service does one thing well
- **Interface-Based:** All services implement interfaces
- **Stateless:** Services don't store state (use Redis/DB)
- **Idempotent:** Operations can be safely retried

### 6.2 Error Handling
- **Retry Logic:** Exponential backoff for transient failures
- **Circuit Breaker:** Prevent cascade failures
- **Dead Letter Queue:** Store failed jobs for analysis
- **Monitoring:** CloudWatch alarms for error rates

### 6.3 Security
- **Secrets Management:** AWS Secrets Manager or Parameter Store
- **Encryption:** TLS in transit, encryption at rest
- **Rate Limiting:** Per-user and per-IP limits
- **Input Validation:** Zod schemas for all inputs

### 6.4 Monitoring & Observability
- **Logging:** Structured logging (JSON) to CloudWatch
- **Metrics:** Custom metrics for business logic
- **Tracing:** AWS X-Ray for distributed tracing
- **Alerts:** CloudWatch alarms for critical metrics

---

## 7. Potential Challenges & Solutions

### Challenge 1: Service Discovery at Scale
**Problem:** How to discover services dynamically without hardcoding

**Solution:**
- Use Redis-based service registry with heartbeats
- Implement health checks and automatic deregistration
- Use AWS ECS Service Discovery for containerized services

### Challenge 2: Configuration Management
**Problem:** How to update configuration without redeployment

**Solution:**
- Centralized Config Service with Redis cache
- Watch mechanism for config changes
- Event-driven config updates

### Challenge 3: Versioning Services
**Problem:** How to handle multiple versions of services

**Solution:**
- Version in service registry metadata
- API versioning in routes (`/v1/`, `/v2/`)
- Feature flags for gradual rollouts

### Challenge 4: Inter-Service Communication
**Problem:** How services communicate without tight coupling

**Solution:**
- Event-driven architecture with Redis Pub/Sub
- Message queues for async communication
- REST/GraphQL for synchronous calls (when needed)

### Challenge 5: Data Consistency
**Problem:** How to maintain consistency across services

**Solution:**
- Event sourcing for audit trail
- Saga pattern for distributed transactions
- Eventually consistent where possible

---

## 8. Code Examples

### 8.1 Complete Email Service Factory

```typescript
// lib/services/factories/email.factory.ts
export interface EmailProvider {
  sendEmail(params: EmailParams): Promise<EmailResult>;
  sendBulk(params: BulkEmailParams): Promise<BulkEmailResult>;
}

export class AWSSESProvider implements EmailProvider {
  constructor(private config: AWSSESConfig) {}
  
  async sendEmail(params: EmailParams): Promise<EmailResult> {
    const ses = new AWS.SES({ region: this.config.region });
    const result = await ses.sendEmail({
      Source: params.from,
      Destination: { ToAddresses: [params.to] },
      Message: {
        Subject: { Data: params.subject },
        Body: { Html: { Data: params.html } },
      },
    }).promise();
    
    return { messageId: result.MessageId, status: 'sent' };
  }
  
  async sendBulk(params: BulkEmailParams): Promise<BulkEmailResult> {
    // Implementation
  }
}

export class SendGridProvider implements EmailProvider {
  constructor(private config: SendGridConfig) {
    this.sgMail.setApiKey(config.apiKey);
  }
  
  async sendEmail(params: EmailParams): Promise<EmailResult> {
    const [response] = await this.sgMail.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      html: params.html,
    });
    
    return { messageId: response.headers['x-message-id'], status: 'sent' };
  }
}

export class EmailServiceFactory {
  private static providers = new Map<string, (config: any) => EmailProvider>();
  
  static register(name: string, factory: (config: any) => EmailProvider) {
    this.providers.set(name, factory);
  }
  
  static async create(): Promise<EmailProvider> {
    const configService = getService<ConfigService>('configService');
    const providerName = await configService.get('email.provider', 'aws-ses');
    const providerConfig = await configService.get(`email.providers.${providerName}`);
    
    const factory = this.providers.get(providerName);
    if (!factory) {
      throw new Error(`Email provider '${providerName}' not registered`);
    }
    
    return factory(providerConfig);
  }
}

// Registration
EmailServiceFactory.register('aws-ses', (config) => new AWSSESProvider(config));
EmailServiceFactory.register('sendgrid', (config) => new SendGridProvider(config));
EmailServiceFactory.register('mailgun', (config) => new MailgunProvider(config));
```

### 8.2 Event-Driven User Registration

```typescript
// lib/services/user.service.ts
export class UserService {
  async register(email: string, password: string) {
    // Create user
    const user = await this.userRepo.create({ email, password });
    
    // Publish event (non-blocking)
    await eventBus.publish('user.registered', {
      userId: user.id,
      email: user.email,
      timestamp: Date.now(),
    });
    
    return user;
  }
}

// lib/events/handlers/user.handlers.ts
export function setupUserEventHandlers() {
  // Welcome email
  eventBus.subscribe('user.registered', async (data) => {
    const emailService = await EmailServiceFactory.create();
    await emailService.sendEmail({
      to: data.email,
      subject: 'Welcome!',
      html: generateWelcomeEmail(data.userId),
    });
  });
  
  // Analytics
  eventBus.subscribe('user.registered', async (data) => {
    await analyticsService.track('user_registered', {
      userId: data.userId,
      timestamp: data.timestamp,
    });
  });
  
  // Notification preferences
  eventBus.subscribe('user.registered', async (data) => {
    await prisma.notificationPreference.create({
      data: {
        userId: data.userId,
        email: true,
        push: true,
        sms: false,
      },
    });
  });
}
```

---

## 9. Database Schema Extensions

```prisma
// Add to schema.prisma

model Config {
  id        String   @id @default(cuid())
  key       String   @unique
  value     Json
  updatedAt DateTime @updatedAt
  createdAt DateTime @default(now())
  
  @@map("configs")
}

model Permission {
  id        String   @id @default(cuid())
  resource  String
  action    String
  createdAt DateTime @default(now())
  
  roles     RolePermission[]
  users     UserPermission[]
  
  @@unique([resource, action])
  @@map("permissions")
}

model Role {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  createdAt   DateTime @default(now())
  
  users       UserRole[]
  permissions RolePermission[]
  
  @@map("roles")
}

model RolePermission {
  id           String   @id @default(cuid())
  roleId       String
  permissionId String
  createdAt    DateTime @default(now())
  
  role       Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  
  @@unique([roleId, permissionId])
  @@map("role_permissions")
}

model UserRole {
  id        String   @id @default(cuid())
  userId    String
  roleId    String
  createdAt DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)
  
  @@unique([userId, roleId])
  @@map("user_roles")
}

model UserPermission {
  id           String   @id @default(cuid())
  userId       String
  permissionId String
  createdAt    DateTime @default(now())
  
  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  
  @@unique([userId, permissionId])
  @@map("user_permissions")
}

model NotificationPreference {
  id        String   @id @default(cuid())
  userId    String   @unique
  email     Boolean  @default(true)
  push      Boolean  @default(true)
  sms       Boolean  @default(false)
  updatedAt DateTime @updatedAt
  createdAt DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("notification_preferences")
}

model OTP {
  id        String   @id @default(cuid())
  phone     String
  code      String
  expiresAt DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())
  
  @@index([phone, used])
  @@map("otps")
}
```

---

## 10. Conclusion

This architecture provides:

✅ **Full Decoupling:** Services can be swapped at runtime
✅ **Scalability:** Horizontal scaling at every layer
✅ **Maintainability:** Clear separation of concerns
✅ **Extensibility:** Easy to add new features
✅ **Resilience:** Error handling and retry logic
✅ **Observability:** Comprehensive monitoring

**Next Steps:**
1. Review and approve architecture
2. Start Phase 1 implementation
3. Set up AWS infrastructure
4. Begin service factory implementation

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Author:** Senior Software Engineer & Cloud Infrastructure Expert

