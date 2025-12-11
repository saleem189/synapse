# Video & Voice Call - Quick Reference Guide

**Date:** ${new Date().toISOString().split('T')[0]}

---

## 🎯 Quick Decision Matrix

| Need | Recommended Library | Why |
|------|-------------------|-----|
| **1-on-1 calls, MVP** | `simple-peer` | Smallest, simplest, works with existing Socket.io |
| **Quick prototyping** | `peerjs` | Easy setup, good docs |
| **Large groups (10+)** | `mediasoup` | SFU architecture, production-ready |
| **Enterprise reliability** | `Twilio Video` | Managed service, 99.99% uptime |
| **Modern open-source** | `LiveKit` | TypeScript-first, good features |

---

## ✅ Recommended: simple-peer

### Why?
- ✅ **50KB bundle** (smallest)
- ✅ **Simple API** (easy to learn)
- ✅ **Works with Socket.io** (leverage existing infrastructure)
- ✅ **Perfect for MVP** (1-on-1 and small groups)

### Installation
```bash
npm install simple-peer
npm install --save-dev @types/simple-peer
```

### Basic Usage
```typescript
import Peer from 'simple-peer';

// Create peer connection
const peer = new Peer({ initiator: true, trickle: false });

// Signal via Socket.io (you already have this!)
peer.on('signal', (data) => {
  socket.emit('webrtc-signal', { to: userId, signal: data });
});

// Receive signal
socket.on('webrtc-signal', ({ from, signal }) => {
  peer.signal(signal);
});

// Handle stream
peer.on('stream', (stream) => {
  videoRef.current.srcObject = stream;
});
```

---

## 🏗️ Architecture Overview

```
Client (React)
  ├── Video Call Component
  ├── simple-peer (WebRTC)
  └── Socket.io Client (Signaling) ✅ Already have this!

Backend
  ├── Socket.io Server (Signaling) ✅ Already have this!
  ├── STUN Server (Free: Google)
  └── TURN Server (Optional, for production)
```

---

## 📋 Implementation Checklist

### Phase 1: Foundation (Week 1-2)
- [ ] Install `simple-peer`
- [ ] Create WebRTC service
- [ ] Extend Socket.io events
- [ ] Build basic call UI
- [ ] Test 1-on-1 video call

### Phase 2: Features (Week 3-4)
- [ ] Mute/unmute
- [ ] Video toggle
- [ ] Screen sharing
- [ ] Call controls
- [ ] Call history (database)

### Phase 3: Groups (Week 5-6)
- [ ] Small group calls (2-4 users)
- [ ] Participant grid
- [ ] Join/leave handling

### Phase 4: Production (Week 7-8)
- [ ] TURN server setup
- [ ] Error handling
- [ ] Performance optimization
- [ ] Mobile support

---

## 🔌 Socket.io Events Needed

Add these to `lib/socket.ts`:

```typescript
// ClientToServerEvents
"call-initiate": (data: { roomId: string; callType: 'video' | 'audio' }) => void;
"call-accept": (data: { callId: string }) => void;
"call-reject": (data: { callId: string }) => void;
"call-end": (data: { callId: string }) => void;
"webrtc-signal": (data: { to: string; signal: any }) => void;

// ServerToClientEvents
"incoming-call": (data: { from: string; roomId: string; callType: string }) => void;
"call-ended": (data: { callId: string }) => void;
"webrtc-signal": (data: { from: string; signal: any }) => void;
```

---

## 🗄️ Database Schema

Add to `prisma/schema.prisma`:

```prisma
model CallSession {
  id        String   @id @default(cuid())
  roomId    String
  callType  CallType @default(VIDEO)
  status    CallStatus @default(ACTIVE)
  startedAt DateTime @default(now())
  endedAt   DateTime?
  participants CallParticipant[]
}

model CallParticipant {
  id            String   @id @default(cuid())
  callSessionId String
  userId        String
  joinedAt      DateTime @default(now())
  leftAt        DateTime?
}

enum CallType { VIDEO AUDIO }
enum CallStatus { ACTIVE ENDED MISSED REJECTED }
```

---

## 💰 Cost Estimate

| Option | Monthly Cost |
|--------|-------------|
| **simple-peer (MVP)** | $0-10 (free STUN) |
| **simple-peer + TURN** | $10-50 (VPS) |
| **mediasoup** | $70-300 (server + bandwidth) |
| **Twilio Video** | Variable ($0.004/min/participant) |

**Recommendation:** Start free, add TURN when needed.

---

## 🚀 Quick Start Steps

1. **Install:**
   ```bash
   npm install simple-peer
   ```

2. **Create WebRTC hook:**
   ```typescript
   // hooks/use-peer-connection.ts
   import Peer from 'simple-peer';
   import { getSocket } from '@/lib/socket';
   ```

3. **Add Socket events:**
   - Extend `lib/socket.ts` with call events
   - Update `backend/server.js` to handle call events

4. **Build UI:**
   - Create `VideoCallModal` component
   - Add call buttons to chat room header

5. **Test:**
   - Start with 1-on-1 video call
   - Test on same network first
   - Add STUN servers for cross-network

---

## 📚 Key Resources

- **Full Report:** `AUDIT_REPORTS/VIDEO_CALL_RESEARCH_REPORT.md`
- **simple-peer Docs:** https://github.com/feross/simple-peer
- **WebRTC Guide:** https://webrtc.org/getting-started/
- **Socket.io Docs:** https://socket.io/docs/v4/

---

## ⚠️ Important Notes

1. **STUN/TURN Required:** For NAT traversal (most networks)
2. **Browser Permissions:** Already handled by your permission system ✅
3. **Bandwidth:** Video calls use ~500KB/s - 2MB/s per participant
4. **Mobile:** Test on mobile devices early
5. **Error Handling:** Network issues are common, handle gracefully

---

**Next Step:** Review full report, then decide on library and timeline.

