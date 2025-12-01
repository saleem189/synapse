# Event-Driven Email Flow
## How Emails Are Sent When User Registers

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  1. User Registers via API                                  │
│     POST /api/auth/register                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  2. UserService.register()                                   │
│     - Validates email                                        │
│     - Hashes password                                        │
│     - Creates user in database                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Event Published                                          │
│     eventBus.publish('user.registered', {                   │
│       userId, email, name, timestamp                         │
│     })                                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Redis Pub/Sub                                            │
│     Event published to Redis channel:                        │
│     "events:user.registered"                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Event Handler Receives Event                             │
│     (Registered in setupEmailEventHandlers)                  │
│     Handler function is called with event data               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Email Handler Executes                                   │
│     - Gets EmailService from DI                              │
│     - Calls emailService.sendWelcomeEmail()                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  7. EmailService Uses Factory                                │
│     - EmailServiceFactory.getInstance()                      │
│     - Gets provider from config (or default)                 │
│     - Creates provider instance                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  8. Provider Sends Email                                      │
│     - MockAWSSESProvider (or configured provider)            │
│     - Returns EmailResult with messageId                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Step-by-Step Code Flow

### Step 1: User Registration API
**File:** `app/api/auth/register/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const { name, email, password } = await request.json();
  
  // Calls UserService
  const user = await userService.register(name, email, password);
  
  return NextResponse.json({ user }, { status: 201 });
}
```

### Step 2: UserService Creates User
**File:** `lib/services/user.service.ts`

```typescript
async register(name: string, email: string, password: string) {
  // 1. Validate and hash password
  const hashedPassword = await bcrypt.hash(password, 12);
  
  // 2. Create user in database
  const user = await this.userRepo.create({
    name,
    email,
    password: hashedPassword,
    status: 'offline',
  });
  
  // 3. Publish event (NON-BLOCKING)
  const eventBus = getService<EventBus>('eventBus');
  await eventBus.publish('user.registered', {
    userId: user.id,
    email: user.email,
    name: user.name,
    timestamp: Date.now(),
  });
  
  // 4. Return user (API responds immediately)
  return { id: user.id, name: user.name, email: user.email };
}
```

**Key Point:** The API responds immediately! Email is sent asynchronously.

### Step 3: Event Bus Publishes to Redis
**File:** `lib/events/event-bus.ts`

```typescript
async publish(event: string, data: any) {
  const payload = {
    event: 'user.registered',
    data: { userId, email, name, timestamp },
    id: uuidv4(),
    timestamp: Date.now(),
  };
  
  // Publish to Redis channel
  await this.redis.publish(`events:user.registered`, JSON.stringify(payload));
  
  // Store in event log
  await this.redis.lpush(`events:log:user.registered`, JSON.stringify(payload));
}
```

### Step 4: Event Handler Listens (Already Set Up)
**File:** `lib/events/handlers/email.handlers.ts`

This handler was registered when the app started:

```typescript
export async function setupEmailEventHandlers() {
  const eventBus = getService<EventBus>('eventBus');
  const emailService = getService<EmailService>('emailService');
  
  // Register listener for 'user.registered' event
  await eventBus.subscribe('user.registered', async (data) => {
    // This function is called when event is published
    try {
      logger.log(`📧 Sending welcome email to ${data.email}`);
      await emailService.sendWelcomeEmail(data.email, data.name);
    } catch (error) {
      logger.error(`Failed to send welcome email:`, error);
    }
  });
}
```

**When is this set up?** 
- Called in `lib/di/providers.ts` after DI setup
- Runs once at application startup
- Listener stays active and waits for events

### Step 5: Redis Pub/Sub Delivers Event
**File:** `lib/events/event-bus.ts`

```typescript
// When eventBus.subscribe() was called, it set up a Redis subscriber:
const subscriber = this.redis.duplicate();
await subscriber.subscribe(`events:user.registered`);

// When event is published, Redis delivers it:
subscriber.on('message', (channel, message) => {
  const payload = JSON.parse(message);
  // payload.data contains { userId, email, name, timestamp }
  
  // Call all registered handlers
  this.subscribers.get('user.registered')?.forEach(handler => {
    handler(payload.data); // Calls the email handler function
  });
});
```

### Step 6: Email Handler Executes
**File:** `lib/events/handlers/email.handlers.ts`

```typescript
// Handler function receives the data
await eventBus.subscribe('user.registered', async (data) => {
  // data = { userId: '...', email: 'user@example.com', name: 'John', timestamp: ... }
  
  // Get EmailService and send email
  const emailService = getService<EmailService>('emailService');
  await emailService.sendWelcomeEmail(data.email, data.name);
});
```

### Step 7: EmailService Sends Email
**File:** `lib/services/email.service.ts`

```typescript
async sendWelcomeEmail(email: string, name: string) {
  // Uses factory to get provider
  const provider = await EmailServiceFactory.getInstance().create();
  
  // Sends email via provider
  return await provider.sendEmail({
    to: email,
    from: 'noreply@yourapp.com',
    subject: 'Welcome!',
    html: `<h1>Welcome, ${name}!</h1>...`,
  });
}
```

### Step 8: Provider Sends (Currently Mock)
**File:** `lib/services/factories/email.factory.ts`

```typescript
// MockAWSSESProvider.sendEmail()
async sendEmail(params: EmailParams) {
  // Simulate delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Log (in real version, this would call AWS SES)
  logger.log(`📧 [MOCK AWS SES] Sending email:`, {
    to: params.to,
    subject: params.subject,
  });
  
  // Return result
  return {
    messageId: `mock-ses-${Date.now()}`,
    status: 'sent',
    provider: 'aws-ses',
  };
}
```

---

## 🔑 Key Points

### 1. **Non-Blocking**
- User registration API responds immediately
- Email is sent asynchronously in the background
- User doesn't wait for email to be sent

### 2. **Decoupled**
- UserService doesn't know about EmailService
- They communicate via events
- Easy to add more handlers (e.g., analytics, notifications)

### 3. **Event-Driven**
- One event can trigger multiple handlers
- You can add more handlers without changing existing code
- Example: Add analytics handler for `user.registered` event

### 4. **Redis Pub/Sub**
- Events are published to Redis
- All subscribers receive the event
- Works across multiple server instances (horizontal scaling)

---

## 🧪 Testing the Flow

### 1. Register a User
```bash
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

### 2. Check Logs
You should see:
```
✅ User created successfully
📤 Event published: user.registered
📧 Sending welcome email to john@example.com
📧 [MOCK AWS SES] Sending email: { to: 'john@example.com', subject: 'Welcome!' }
✅ Email sent: { messageId: 'mock-ses-...', status: 'sent' }
```

### 3. Verify Event Log
Events are stored in Redis:
```typescript
const eventBus = getService<EventBus>('eventBus');
const history = await eventBus.getEventHistory('user.registered', 10);
console.log(history); // See all user.registered events
```

---

## 🔍 How to Verify It's Working

### Check Event Handler Registration
```typescript
// In your app startup, check logs for:
// "✅ Email event handlers registered"
```

### Check Event Publishing
```typescript
// When user registers, check logs for:
// "📤 Event published: user.registered (event-id)"
```

### Check Email Sending
```typescript
// Check logs for:
// "📧 Sending welcome email to user@example.com"
// "📧 [MOCK AWS SES] Sending email: ..."
```

---

## 🎯 Benefits of This Architecture

1. **Scalable**: Multiple handlers can listen to same event
2. **Maintainable**: Easy to add/remove handlers
3. **Testable**: Can test handlers independently
4. **Resilient**: If email fails, user registration still succeeds
5. **Flexible**: Can add more actions on user registration (analytics, notifications, etc.)

---

## 📊 Multiple Handlers Example

You can have multiple handlers for the same event:

```typescript
// Handler 1: Send welcome email
eventBus.subscribe('user.registered', async (data) => {
  await emailService.sendWelcomeEmail(data.email, data.name);
});

// Handler 2: Track analytics
eventBus.subscribe('user.registered', async (data) => {
  await analyticsService.track('user_registered', data);
});

// Handler 3: Create notification preferences
eventBus.subscribe('user.registered', async (data) => {
  await prisma.notificationPreference.create({
    data: { userId: data.userId, email: true, push: true },
  });
});
```

All three handlers run when `user.registered` event is published!

---

## 🚀 Summary

**Flow:**
1. User registers → `UserService.register()`
2. User created in database
3. Event published → `eventBus.publish('user.registered', data)`
4. Redis delivers event to all subscribers
5. Email handler receives event
6. Email handler calls `emailService.sendWelcomeEmail()`
7. Email sent via provider (currently mock)

**Key:** Everything is **asynchronous** and **decoupled**!

