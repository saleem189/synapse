# Notifications

Understand how push notifications work in Synapse.

---

## Notification Strategy

Synapse uses a **dual notification system**:

### 1. Real-time (Socket.io)

For users who are **online**.

**Delivery:** Instant (~10ms)  
**Method:** WebSocket  
**Use case:** Active users see updates immediately

### 2. Push Notifications (Web Push API)

For users who are **offline** or have tab closed.

**Delivery:** Background (~1-5 seconds)  
**Method:** Service Worker + Web Push  
**Use case:** Notify users even when app is closed

---

## How It Works

```
Message Sent
  ↓
┌─────────────────────────┐
│  Is user online?        │
│  (Socket.io connected)  │
└──────────┬──────────────┘
           │
    ┌──────┴──────┐
    │             │
  YES            NO
    │             │
    ▼             ▼
WebSocket    Queue Push
Broadcast    Notification
(Instant)    (Background)
    │             │
    ▼             ▼
User sees     Browser shows
in real-time  notification
```

---

## Push Notification Setup

### 1. Subscribe

Request permission and subscribe to push notifications.

```javascript
// Request permission
const permission = await Notification.requestPermission();

if (permission === 'granted') {
  // Register service worker
  const registration = await navigator.serviceWorker.register('/sw.js');
  
  // Get VAPID public key
  const { publicKey } = await fetch('/api/push/vapid-public-key').then(r => r.json());
  
  // Subscribe
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey)
  });
  
  // Save subscription
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ subscription })
  });
}
```

### 2. Service Worker

Handle incoming push notifications.

```javascript
// sw.js
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: {
        url: data.url || '/'
      }
    })
  );
});

// Handle click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
```

---

## Notification Types

### New Message

```json
{
  "title": "New message in Team Chat",
  "body": "Jane Smith: Hello team!",
  "url": "/chat/room_123",
  "icon": "/icon-192x192.png"
}
```

### Incoming Call

```json
{
  "title": "Incoming video call",
  "body": "John Doe is calling you",
  "url": "/call/call_xyz789",
  "icon": "/icon-192x192.png"
}
```

### Mention

```json
{
  "title": "You were mentioned",
  "body": "@you in Team Chat",
  "url": "/chat/room_123#msg_456",
  "icon": "/icon-192x192.png"
}
```

---

## Notification Preferences

### Global Settings

```bash
PATCH /api/users/me/settings

{
  "notifications": {
    "enabled": true,
    "sound": true,
    "desktop": true
  }
}
```

### Per-Room Settings

```bash
PATCH /api/rooms/{roomId}/settings

{
  "notifications": "all" | "mentions" | "none"
}
```

**Options:**
- `all` - Notify for every message
- `mentions` - Only when mentioned (@you)
- `none` - Mute room

---

## Platform Support

| Platform | Support | Method |
|----------|---------|--------|
| **Chrome** | ✅ Full | Web Push API |
| **Firefox** | ✅ Full | Web Push API |
| **Safari** | ✅ iOS 16.4+ | Web Push API |
| **Edge** | ✅ Full | Web Push API |
| **Mobile Web** | ✅ Android | Web Push API |
| **iOS Web** | ✅ iOS 16.4+ | Web Push API |

---

## Best Practices

### Permission Requests

**✅ Good timing:**
- After user signs up
- When user joins first room
- In settings page

**❌ Bad timing:**
- Immediately on page load
- Before user sees value
- Repeatedly after denial

### Notification Content

**✅ Good:**
- Clear, actionable
- Shows sender name
- Includes context
- Has deep link

**❌ Bad:**
- Generic ("New notification")
- No context
- Missing sender info
- No action

### Frequency

- **Group by sender** (don't spam)
- **Batch multiple messages** from same person
- **Respect quiet hours** (if configured)
- **Mute when active** (don't notify if user is already in the chat)

---

## Security

### VAPID Keys

Synapse uses VAPID for authentication:

```env
VAPID_PUBLIC_KEY="your-public-key"
VAPID_PRIVATE_KEY="your-private-key"
```

**Generate keys:**
```bash
npx web-push generate-vapid-keys
```

### Subscription Storage

Push subscriptions stored securely:

```typescript
interface PushSubscription {
  userId: string;         // Who owns it
  endpoint: string;       // Push service URL
  p256dh: string;        // Encryption key (public)
  auth: string;          // Authentication secret
}
```

**Security:**
- Keys never exposed to client
- Subscriptions tied to user account
- Invalid subscriptions auto-deleted

---

## Debugging

### Check Subscription

```javascript
const registration = await navigator.serviceWorker.ready;
const subscription = await registration.pushManager.getSubscription();

if (subscription) {
  console.log('✅ Subscribed:', subscription.endpoint);
} else {
  console.log('❌ Not subscribed');
}
```

### Test Notification

```bash
POST /api/push/test

{
  "title": "Test Notification",
  "body": "If you see this, push works!"
}
```

### Common Issues

**Permission denied:**
- User clicked "Block"
- Fix: Reset in browser settings

**Service worker not registered:**
- Check `/sw.js` exists
- Verify HTTPS (required in production)

**Notifications not appearing:**
- Check browser notification settings
- Verify push service reachable
- Check server logs for errors

---

## Next Steps

- **[Real-time Events](./realtime.md)** - WebSocket notifications
- **[Messages](./messages.md)** - Message delivery
- **[Rooms](./rooms.md)** - Per-room settings

---

## Related

- **[Real-time Communication](./realtime.md)**
- **[Messages](./messages.md)**
- **[Video Calls](./video-calls.md)**

