# 🚀 Complete Developer Guide - Synapse

**Everything you need to know to contribute to Synapse**

> **💡 New to Synapse?** Start with [01-ARCHITECTURE-OVERVIEW.md](./01-ARCHITECTURE-OVERVIEW.md), then read [CODEBASE_GUIDE.md](./CODEBASE_GUIDE.md)

---

## 📋 Table of Contents

1. [Notification System](#notification-system)
2. [Frontend Architecture](#frontend-architecture)
3. [Theme System](#theme-system)
4. [Memory Management](#memory-management)
5. [API Patterns](#api-patterns)
6. [Quick Reference](#quick-reference)

---

## Notification System

### Overview

Synapse uses a **dual notification strategy**:

| Type | Technology | When Used |
|------|------------|-----------|
| **Real-time** | Socket.io | User is online and connected |
| **Push** | Web Push API | User is offline or tab is closed |

### Architecture

```
Message Created
  ↓
MessageNotificationService.sendPushNotifications()
  ↓
┌─────────────────────────────────────────┐
│  Check: Is user online?                  │
│  (Check Socket.io connectedUsers Map)   │
└─────────────┬───────────────────────────┘
              │
      ┌───────┴───────┐
      │               │
   ✅ ONLINE       ❌ OFFLINE
      │               │
      ▼               ▼
 Socket.io        Queue Push
 Broadcast        Notification
 (Instant)        (Background)
      │               │
      ▼               ▼
 User sees        BullMQ Worker
 message          processes job
 immediately           │
                       ▼
                  Web Push API
                  sends notification
                       │
                       ▼
                  Browser shows
                  notification
```

---

### Implementation

#### 1. MessageNotificationService

**Location:** `lib/services/message-notification.service.ts`

```typescript
export class MessageNotificationService {
  constructor(
    private roomRepo: RoomRepository,
    private queueService: QueueService,
    private logger: ILogger,
    private pushService: PushService
  ) {}

  async sendPushNotifications(
    roomId: string,
    senderId: string,
    content: string,
    type: string,
    fileName?: string
  ): Promise<void> {
    try {
      // 1. Get room with members
      const room = await this.roomRepo.findByIdWithRelations(roomId);
      if (!room) return;

      // 2. Get recipients (exclude sender)
      const recipients = room.members
        .filter(m => m.userId !== senderId)
        .map(m => m.userId);

      if (recipients.length === 0) return;

      // 3. Build notification payload
      const notification = {
        title: `New message in ${room.name}`,
        body: type === 'text' ? content : `📎 ${fileName || 'File'}`,
        url: `/chat/${roomId}`,
        icon: '/icon-192x192.png',
      };

      // 4. Queue push notification for each recipient
      await Promise.all(
        recipients.map(userId =>
          this.queueService.addPushNotification({
            userId,
            payload: notification,
          })
        )
      );

      this.logger.log(`Push notifications queued for ${recipients.length} users`);
    } catch (error) {
      this.logger.error('Failed to send push notifications:', error);
      throw error;
    }
  }
}
```

---

#### 2. PushService (Web Push API)

**Location:** `lib/services/push.service.ts`

```typescript
export class PushService {
  private webpush: typeof webpush;

  constructor(private logger: ILogger) {
    // Initialize web-push with VAPID keys
    this.webpush = webpush;
    this.webpush.setVapID(
      'mailto:your-email@example.com',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );
  }

  async saveSubscription(userId: string, subscription: PushSubscription) {
    try {
      await prisma.pushSubscription.upsert({
        where: {
          userId_endpoint: {
            userId,
            endpoint: subscription.endpoint,
          },
        },
        update: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        create: {
          userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      });

      this.logger.log(`Push subscription saved for user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to save push subscription:', error);
      throw error;
    }
  }

  async sendNotification(userId: string, payload: {
    title: string;
    body: string;
    url?: string;
    icon?: string;
  }) {
    // Get all subscriptions for the user
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) return;

    const notificationPayload = JSON.stringify(payload);

    // Send to all subscriptions
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
          return { success: true };
        } catch (error: unknown) {
          // If subscription is invalid (410 Gone), delete it
          const webPushError = error as { statusCode?: number };
          if (webPushError.statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } });
            this.logger.log(`Removed invalid subscription ${sub.id}`);
          }
          return { success: false, error };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    this.logger.log(`Push notification sent: ${successful}/${subscriptions.length}`);
  }
}
```

---

#### 3. Client-Side Integration

**Hook:** `hooks/use-push-notifications.ts`

```typescript
export function usePushNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const subscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.error('Push notifications not supported');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Notification permission denied');
        return;
      }

      // 2. Register Service Worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // 3. Get VAPID Public Key
      const { publicKey } = await fetch('/api/push/vapid-public-key').then(r => r.json());

      // 4. Subscribe to PushManager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // 5. Send subscription to backend
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      setIsSubscribed(true);
      toast.success('Notifications enabled!');
    } catch (error) {
      console.error('Failed to subscribe:', error);
      toast.error('Failed to enable notifications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isSubscribed, isLoading, subscribe };
}
```

---

## Frontend Architecture

### Component Patterns

Synapse uses a **feature-based component architecture**:

```
components/
├── ui/                     # shadcn/ui components (reusable primitives)
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   └── ...
├── chat/                   # Chat-specific components
│   ├── chat-sidebar.tsx
│   ├── chat-messages.tsx
│   ├── message-item.tsx
│   └── message-input.tsx
├── admin/                  # Admin-specific components
│   ├── admin-sidebar.tsx
│   ├── user-table.tsx
│   └── stats-dashboard.tsx
└── shared/                 # Shared across features
    ├── user-avatar.tsx
    ├── loading-spinner.tsx
    └── error-boundary.tsx

features/                   # Feature modules (self-contained)
├── video-call/
│   ├── components/
│   │   ├── call-controls.tsx
│   │   ├── participant-grid.tsx
│   │   └── device-settings.tsx
│   ├── hooks/
│   │   ├── use-video-call.ts
│   │   ├── use-peer-connection.ts
│   │   └── use-media-stream.ts
│   └── services/
│       └── webrtc.service.ts
├── mentions/
│   └── ...
└── pinned-messages/
    └── ...
```

---

### State Management Strategy

| State Type | Solution | Use Case | Example |
|------------|----------|----------|---------|
| **Server State** | React Query | API data, cache | Messages, rooms, users |
| **Global UI State** | Zustand | Cross-component UI | Modals, sidebars, theme |
| **Local State** | useState | Component-specific | Form inputs, toggles |
| **URL State** | searchParams | Shareable state | Search queries, filters |

#### Example: React Query for Server State

```typescript
// hooks/api/use-messages.ts
export function useMessages(roomId: string) {
  return useQuery({
    queryKey: ['messages', roomId],
    queryFn: async () => {
      const res = await fetch(`/api/rooms/${roomId}/messages`);
      return res.json();
    },
    staleTime: 60000, // Consider fresh for 1 minute
    gcTime: 300000,   // Keep in cache for 5 minutes
  });
}

// In component:
function ChatMessages({ roomId }) {
  const { data: messages, isLoading, error } = useMessages(roomId);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return <div>{messages.map(msg => <MessageItem key={msg.id} message={msg} />)}</div>;
}
```

#### Example: Zustand for Global UI State

```typescript
// stores/ui-store.ts
interface UIStore {
  isSettingsModalOpen: boolean;
  isSidebarOpen: boolean;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isSettingsModalOpen: false,
  isSidebarOpen: true,
  openSettingsModal: () => set({ isSettingsModalOpen: true }),
  closeSettingsModal: () => set({ isSettingsModalOpen: false }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}));

// In component:
function Header() {
  const openSettings = useUIStore(state => state.openSettingsModal);
  return <button onClick={openSettings}>Settings</button>;
}
```

---

### Component Communication

**1. Parent → Child (Props)**
```typescript
<MessageItem message={message} onDelete={handleDelete} />
```

**2. Child → Parent (Callbacks)**
```typescript
function MessageItem({ message, onDelete }: Props) {
  return <button onClick={() => onDelete(message.id)}>Delete</button>;
}
```

**3. Sibling → Sibling (Shared State)**
```typescript
// Via Zustand or React Query
const messages = useMessagesStore(state => state.messages);
```

**4. Across App (Events via Socket.io)**
```typescript
// Component A emits
socket.emit('message:new', message);

// Component B listens
socket.on('message:new', (msg) => { ... });
```

---

## Theme System

### Overview

Synapse uses a **CSS-variable-based theme system** with:
- ✅ Light/Dark/System modes
- ✅ Solid/Glassmorphic styles
- ✅ Real-time theme switching
- ✅ Persistent user preferences

### Architecture

```
User clicks Theme Toggle
  ↓
ThemeProvider.setTheme('dark')
  ↓
applyTheme('dark')
  ↓
1. Get theme colors from theme definitions
2. Apply CSS variables to document.documentElement
3. Add/remove 'dark' class
4. Save to localStorage
  ↓
All components automatically update
(CSS variables change = instant re-render)
```

---

### Implementation

#### Theme Definitions

**Location:** `lib/design-system/themes/index.ts`

```typescript
export const lightTheme = {
  name: 'light' as const,
  colors: {
    background: '0 0% 100%',
    foreground: '240 10% 3.9%',
    card: '0 0% 100%',
    'card-foreground': '240 10% 3.9%',
    popover: '0 0% 100%',
    'popover-foreground': '240 10% 3.9%',
    primary: '240 5.9% 10%',
    'primary-foreground': '0 0% 98%',
    secondary: '240 4.8% 95.9%',
    'secondary-foreground': '240 5.9% 10%',
    muted: '240 4.8% 95.9%',
    'muted-foreground': '240 3.8% 46.1%',
    accent: '240 4.8% 95.9%',
    'accent-foreground': '240 5.9% 10%',
    destructive: '0 84.2% 60.2%',
    'destructive-foreground': '0 0% 98%',
    border: '240 5.9% 90%',
    input: '240 5.9% 90%',
    ring: '240 5.9% 10%',
    // ... more colors
  },
};

export const darkTheme = {
  name: 'dark' as const,
  colors: {
    background: '240 10% 3.9%',
    foreground: '0 0% 98%',
    // ... dark mode colors
  },
};
```

---

#### ThemeProvider

**Location:** `lib/design-system/providers/theme-provider.tsx`

```typescript
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { applyTheme } from '../utils/apply-theme';
import type { Theme } from '../themes';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system';
    return (localStorage.getItem('theme') as Theme) || 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Apply theme on mount and when theme changes
  useEffect(() => {
    const resolved = applyTheme(theme);
    setResolvedTheme(resolved);
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  // Listen to system theme changes when theme is 'system'
  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const resolved = applyTheme('system');
      setResolvedTheme(resolved);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

---

#### applyTheme Utility

**Location:** `lib/design-system/utils/apply-theme.ts`

```typescript
export function applyTheme(themeName: Theme): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light'; // SSR fallback
  }

  const root = document.documentElement;
  
  // Determine actual theme
  let theme = themeName === 'system' 
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? darkTheme : lightTheme)
    : themeName === 'dark' ? darkTheme : lightTheme;
  
  // Apply color CSS variables
  Object.entries(theme.colors).forEach(([key, value]) => {
    // Convert camelCase to kebab-case
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    root.style.setProperty(`--color-${cssKey}`, value);
    
    // Also set shadcn/ui compatible variables
    const shadcnMapping: Record<string, string> = {
      background: '--background',
      foreground: '--foreground',
      // ... more mappings
    };
    
    if (shadcnMapping[cssKey]) {
      root.style.setProperty(shadcnMapping[cssKey], value);
    }
  });
  
  // Update dark class
  if (theme.name === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  
  return theme.name;
}
```

---

#### Theme Toggle Component

**Location:** `components/ui/theme-toggle.tsx`

```typescript
'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/design-system/providers/theme-provider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="w-10 h-10 rounded-xl flex items-center justify-center bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-all"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-amber-500" />
      ) : (
        <Moon className="w-5 h-5 text-surface-600" />
      )}
    </button>
  );
}
```

---

### Using Theme Colors in Components

```tsx
// Tailwind classes automatically use CSS variables
<div className="bg-background text-foreground">
  <Card className="bg-card text-card-foreground">
    <Button className="bg-primary text-primary-foreground">
      Click me
    </Button>
  </Card>
</div>

// Direct CSS variables (if needed)
<div style={{ backgroundColor: 'hsl(var(--background))' }}>
  Custom element
</div>
```

---

## Memory Management

### Critical Areas

#### 1. Socket.io Event Listeners

**⚠️ MOST CRITICAL MEMORY LEAK SOURCE**

**Problem:**
```javascript
// ❌ BAD: Memory leak!
socket.on('message:new', handler);
// Handler never removed = memory leak!
```

**Solution:**
```javascript
// ✅ GOOD: Cleanup on disconnect
socket.on('disconnect', () => {
  socket.removeAllListeners(); // Remove ALL listeners
});
```

**Location:** `backend/server.js` (lines 1263-1274)

```javascript
// In disconnect handler:
socket.removeAllListeners(); // ⚠️ CRITICAL!
```

---

#### 2. WebRTC Peer Connections

**Problem:**
```typescript
// ❌ BAD: Peer connection never closed
const peer = new Peer({ ... });
// When component unmounts, peer still active!
```

**Solution:**
```typescript
// ✅ GOOD: Cleanup in useEffect
useEffect(() => {
  const peer = webrtcService.createPeer(userId, options, callbacks);
  
  return () => {
    webrtcService.destroyPeer(userId); // Cleanup on unmount
  };
}, [userId]);
```

---

#### 3. React Query Subscriptions

**Problem:**
```typescript
// ❌ BAD: Query never unsubscribed
const { data } = useQuery(['messages', roomId], fetchMessages);
// When component unmounts, query still subscribed!
```

**Solution:**
React Query handles this automatically! But you can configure:

```typescript
useQuery({
  queryKey: ['messages', roomId],
  queryFn: fetchMessages,
  staleTime: 60000,
  gcTime: 300000, // Garbage collect after 5 minutes of inactivity
});
```

---

#### 4. Socket.io Client Listeners

**Problem:**
```typescript
// ❌ BAD: Listener never removed
useEffect(() => {
  socket.on('message:new', handleMessage);
  // Missing cleanup!
}, []);
```

**Solution:**
```typescript
// ✅ GOOD: Remove listener on unmount
useEffect(() => {
  socket.on('message:new', handleMessage);
  
  return () => {
    socket.off('message:new', handleMessage); // Cleanup
  };
}, []);
```

---

### Memory Leak Detection

**Chrome DevTools:**
1. Open DevTools → Memory tab
2. Take heap snapshot
3. Perform actions (connect/disconnect, join/leave rooms)
4. Take another snapshot
5. Compare snapshots - look for growing objects

**Node.js (Server):**
```javascript
// Log memory usage
setInterval(() => {
  const used = process.memoryUsage();
  console.log('Memory Usage:', {
    rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(used.external / 1024 / 1024)}MB`,
  });
}, 60000); // Every minute
```

---

## API Patterns

### Standard API Route Structure

**All API routes follow this pattern:**

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateRequest } from '@/lib/middleware/validate-request';
import { rateLimit, RateLimitPresets } from '@/lib/middleware/rate-limit';
import { getService } from '@/lib/di';
import type { ExampleService } from '@/lib/services/example.service';
import { exampleSchema } from '@/lib/validations';

export async function GET(req: NextRequest) {
  // 1. Rate limiting
  const rateLimitResult = await rateLimit(req, RateLimitPresets.standard);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  // 2. Authentication
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 3. Authorization (if needed)
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 4. Validate query parameters (if needed)
  const { searchParams } = new URL(req.url);
  const validation = validateQueryParams(searchParams, querySchema);
  if (!validation.success) {
    return validation.response;
  }

  try {
    // 5. Get service from DI container
    const exampleService = await getService<ExampleService>('exampleService');

    // 6. Business logic
    const result = await exampleService.getData(validation.data);

    // 7. Return response
    return NextResponse.json(result);
  } catch (error) {
    // 8. Error handling
    console.error('Error in GET /api/example:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Rate limiting
  const rateLimitResult = await rateLimit(req, RateLimitPresets.standard);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  // Authentication
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Validate request body
  const validation = await validateRequest(req, exampleSchema);
  if (!validation.success) {
    return validation.response;
  }

  try {
    // Get service
    const exampleService = await getService<ExampleService>('exampleService');

    // Business logic
    const result = await exampleService.create(validation.data);

    // Return response
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/example:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

### Validation with Zod

**Define schemas in:** `lib/validations.ts`

```typescript
import { z } from 'zod';

export const createMessageSchema = z.object({
  roomId: z.string().min(1, 'Room ID is required'),
  content: z.string().min(1, 'Content is required').max(5000, 'Content too long'),
  attachments: z.array(z.object({
    url: z.string().url(),
    name: z.string(),
    size: z.number(),
    type: z.string(),
  })).optional(),
});

export const updateMessageSchema = z.object({
  content: z.string().min(1, 'Content is required').max(5000, 'Content too long'),
});

export const getUsersQuerySchema = z.object({
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().optional(),
});
```

---

### Rate Limiting Presets

**Location:** `lib/middleware/rate-limit.ts`

```typescript
export const RateLimitPresets = {
  strict: { max: 5, window: 60 },      // 5 requests/minute
  admin: { max: 30, window: 60 },      // 30 requests/minute
  standard: { max: 60, window: 60 },   // 60 requests/minute
  relaxed: { max: 100, window: 60 },   // 100 requests/minute
};

// Usage:
const result = await rateLimit(req, RateLimitPresets.strict);
```

---

## Quick Reference

### Common Commands

```bash
# Start development
npm run dev              # Next.js app (port 3000)
npm run server           # Socket.io server (port 3001)
npm run worker           # BullMQ worker

# Database
npx prisma migrate dev   # Create & apply migration
npx prisma studio        # Open Prisma Studio
npx prisma generate      # Regenerate Prisma Client

# Testing
npm run test             # Run all tests
npm run test:watch       # Watch mode

# Build
npm run build            # Production build
npm run start            # Start production server

# Code quality
npm run lint             # ESLint
npm run type-check       # TypeScript
```

---

### File Locations Cheatsheet

| Need | Location |
|------|----------|
| Create new service | `lib/services/` + register in `lib/di/providers.ts` |
| Create new API route | `app/api/` |
| Add Zod schema | `lib/validations.ts` |
| Create UI component | `components/ui/` (use shadcn/ui) |
| Create feature module | `features/` |
| Add background job | `lib/queue/job-processors.ts` |
| Modify database | `prisma/schema.prisma` + `npx prisma migrate dev` |
| Add Socket.io event | `backend/server.js` |
| Create custom hook | `hooks/` |

---

### Code Snippets

#### Create New Service

```typescript
// 1. Create service class (lib/services/my-service.ts)
export class MyService {
  constructor(
    private myRepo: MyRepository,
    private logger: ILogger
  ) {}

  async doSomething(): Promise<Result> {
    this.logger.log('Doing something...');
    return await this.myRepo.find();
  }
}

// 2. Register in DI (lib/di/providers.ts)
container.register('myService', async () => {
  const myRepo = await container.resolve('myRepository');
  const logger = await container.resolve('logger');
  return new MyService(myRepo, logger);
}, true);

// 3. Use in API route
const myService = await getService<MyService>('myService');
const result = await myService.doSomething();
```

#### Add Socket.io Event

```javascript
// backend/server.js
socket.on('my-event', async (data) => {
  logger.log(`Received my-event from ${socket.userId}`);
  
  // Validate data
  const validated = myEventSchema.safeParse(data);
  if (!validated.success) {
    socket.emit('error', { message: 'Invalid data' });
    return;
  }

  // Process event
  // ...

  // Broadcast to room
  io.to(data.roomId).emit('my-event-response', result);
});
```

#### React Query Hook

```typescript
// hooks/api/use-my-data.ts
export function useMyData(id: string) {
  return useQuery({
    queryKey: ['myData', id],
    queryFn: async () => {
      const res = await fetch(`/api/my-data/${id}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    staleTime: 60000,
  });
}

// In component:
const { data, isLoading, error } = useMyData(id);
```

---

## Summary

**Key Takeaways:**

1. ✅ **Notifications:** Dual strategy (Socket.io + Push API)
2. ✅ **Frontend:** Feature-based, React Query + Zustand
3. ✅ **Theme:** CSS variables, persistent preferences
4. ✅ **Memory:** Always cleanup listeners & connections
5. ✅ **API:** Standard pattern (rate limit → auth → validate → service → response)

**Next Steps:**

- Read [CODEBASE_GUIDE.md](./CODEBASE_GUIDE.md) for existing services
- Check [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines
- Start small - fix a bug or add a minor feature
- Ask questions in discussions!

---

**Questions?** Open an issue or discussion on GitHub!

