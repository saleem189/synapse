# Video & Voice Call Implementation Plan - simple-peer

**Date:** ${new Date().toISOString().split('T')[0]}  
**Library:** simple-peer  
**Status:** Ready to Implement

---

## Implementation Overview

This plan outlines the step-by-step implementation of video and voice call features using `simple-peer` with the existing Socket.io infrastructure.

---

## Phase 1: Foundation Setup (Week 1)

### Step 1.1: Install Dependencies
```bash
npm install simple-peer
npm install --save-dev @types/simple-peer
```

### Step 1.2: Database Schema Extension
**File:** `prisma/schema.prisma`

Add:
- `CallSession` model
- `CallParticipant` model
- `CallType` enum
- `CallStatus` enum
- Relations to `User` and `ChatRoom`

### Step 1.3: Extend Socket.io Events
**Files:**
- `lib/socket.ts` - Add call event types
- `backend/server.js` - Add call event handlers

**New Events:**
- `call-initiate`
- `call-accept`
- `call-reject`
- `call-end`
- `webrtc-signal`
- `call-join`
- `call-leave`
- `call-mute`
- `call-video-toggle`
- `call-screen-share`

### Step 1.4: Create WebRTC Service
**File:** `lib/services/webrtc.service.ts`

**Responsibilities:**
- Manage peer connections
- Handle signaling
- Media stream management
- Connection state management

### Step 1.5: Create STUN/TURN Configuration
**File:** `lib/config/webrtc-config.ts`

**Configuration:**
- Free STUN servers (Google)
- TURN server setup (optional for MVP)

---

## Phase 2: Core Components (Week 2)

### Step 2.1: Video Call Provider (Context)
**File:** `features/video-call/components/video-call-provider.tsx`

**Features:**
- Global call state management
- Active call tracking
- Participant management
- Call event handling

### Step 2.2: Media Stream Hook
**File:** `features/video-call/hooks/use-media-stream.ts`

**Features:**
- Request camera/microphone access
- Handle permissions
- Create media streams
- Cleanup on unmount

### Step 2.3: Peer Connection Hook
**File:** `features/video-call/hooks/use-peer-connection.ts`

**Features:**
- Create/manage peer connections
- Handle signaling
- Stream management
- Connection state

### Step 2.4: Video Call Hook (Main)
**File:** `features/video-call/hooks/use-video-call.ts`

**Features:**
- Start/end calls
- Accept/reject calls
- Mute/unmute
- Toggle video
- Screen share

---

## Phase 3: UI Components (Week 3)

### Step 3.1: Video Call Modal
**File:** `features/video-call/components/video-call-modal.tsx`

**Features:**
- Main call interface
- Participant video grid
- Call controls
- Call status display

### Step 3.2: Participant Video Component
**File:** `features/video-call/components/participant-video.tsx`

**Features:**
- Individual participant view
- Video element
- Muted indicator
- Speaking indicator
- Name display

### Step 3.3: Participant Grid
**File:** `features/video-call/components/participant-grid.tsx`

**Features:**
- Grid layout for multiple participants
- Responsive design
- Active speaker highlighting

### Step 3.4: Call Controls
**File:** `features/video-call/components/call-controls.tsx`

**Features:**
- Mute/unmute button
- Video toggle button
- Screen share button
- End call button
- Settings button

### Step 3.5: Incoming Call Dialog
**File:** `features/video-call/components/incoming-call-dialog.tsx`

**Features:**
- Incoming call notification
- Accept/reject buttons
- Caller information
- Ring animation

---

## Phase 4: Integration (Week 4)

### Step 4.1: Chat Room Header Integration
**File:** `components/chat/chat-room-header.tsx`

**Add:**
- Video call button
- Audio call button
- Active call indicator

### Step 4.2: Call History Component
**File:** `features/video-call/components/call-history.tsx`

**Features:**
- List of past calls
- Call details (duration, participants)
- Call type (video/audio)
- Call status (ended, missed, rejected)

### Step 4.3: API Routes
**Files:**
- `app/api/calls/route.ts` - List calls
- `app/api/calls/[callId]/route.ts` - Get call details

### Step 4.4: Call Service (Backend)
**File:** `lib/services/call.service.ts`

**Features:**
- Create call sessions
- Update call status
- Get call history
- Get active calls

---

## Phase 5: Advanced Features (Week 5-6)

### Step 5.1: Screen Sharing
**File:** `features/video-call/hooks/use-screen-share.ts`

**Features:**
- Request screen share
- Handle screen share stream
- Stop screen share
- Display screen share

### Step 5.2: Group Calls (2-4 participants)
**File:** `features/video-call/hooks/use-group-call.ts`

**Features:**
- Mesh topology implementation
- Multiple peer connections
- Participant management
- Bandwidth optimization

### Step 5.3: Call Recording (Optional)
**File:** `features/video-call/hooks/use-call-recording.ts`

**Features:**
- Record call audio/video
- Save recording
- Playback functionality

### Step 5.4: Error Handling & Reconnection
**File:** `features/video-call/utils/error-handler.ts`

**Features:**
- Connection failure handling
- Reconnection logic
- Error messages
- Fallback strategies

---

## Phase 6: Polish & Production (Week 7-8)

### Step 6.1: Performance Optimization
- Adaptive bitrate
- Video quality adjustment
- Bandwidth management
- CPU usage optimization

### Step 6.2: Mobile Responsiveness
- Mobile UI adjustments
- Touch controls
- Responsive layouts
- Mobile-specific optimizations

### Step 6.3: Accessibility
- Keyboard navigation
- Screen reader support
- ARIA labels
- Focus management

### Step 6.4: Testing
- Unit tests
- Integration tests
- E2E tests
- Performance tests

### Step 6.5: Documentation
- Component documentation
- API documentation
- User guide
- Developer guide

---

## File Structure

```
features/video-call/
├── index.ts                          # Public exports
├── types.ts                          # ✅ Already exists
├── components/
│   ├── video-call-provider.tsx       # Context provider
│   ├── video-call-modal.tsx          # Main call UI
│   ├── participant-video.tsx         # Individual participant
│   ├── participant-grid.tsx           # Grid layout
│   ├── call-controls.tsx             # Control buttons
│   ├── incoming-call-dialog.tsx      # Incoming call UI
│   └── call-history.tsx              # Call history list
├── hooks/
│   ├── use-video-call.ts             # Main call hook
│   ├── use-media-stream.ts           # Media access
│   ├── use-peer-connection.ts        # Peer management
│   ├── use-group-call.ts             # Group call logic
│   ├── use-screen-share.ts           # Screen sharing
│   └── use-call-history.ts           # Call history
├── services/
│   └── webrtc.service.ts             # WebRTC logic
└── utils/
    ├── stun-turn-config.ts           # ICE servers
    ├── media-helpers.ts               # Media utilities
    └── error-handler.ts               # Error handling

lib/
├── services/
│   ├── webrtc.service.ts              # WebRTC service
│   └── call.service.ts                # Call service
├── config/
│   └── webrtc-config.ts               # WebRTC config
└── socket.ts                          # Extended events

app/api/calls/
├── route.ts                           # GET: list calls
└── [callId]/
    └── route.ts                       # GET: call details
```

---

## Implementation Order

### Week 1: Foundation
1. ✅ Install dependencies
2. ✅ Database schema
3. ✅ Socket.io events
4. ✅ WebRTC service
5. ✅ STUN/TURN config

### Week 2: Core Logic
1. ✅ Media stream hook
2. ✅ Peer connection hook
3. ✅ Video call hook
4. ✅ Video call provider

### Week 3: UI Components
1. ✅ Video call modal
2. ✅ Participant video
3. ✅ Participant grid
4. ✅ Call controls
5. ✅ Incoming call dialog

### Week 4: Integration
1. ✅ Chat room header buttons
2. ✅ Call history
3. ✅ API routes
4. ✅ Backend service

### Week 5-6: Advanced
1. ✅ Screen sharing
2. ✅ Group calls
3. ✅ Error handling

### Week 7-8: Polish
1. ✅ Performance
2. ✅ Mobile
3. ✅ Accessibility
4. ✅ Testing

---

## Key Implementation Details

### 1. Signaling Flow

```
User A initiates call
  ↓
Create peer (initiator: true)
  ↓
Get media stream
  ↓
Emit 'call-initiate' via Socket.io
  ↓
Server broadcasts to User B
  ↓
User B receives 'incoming-call'
  ↓
User B accepts, creates peer (initiator: false)
  ↓
Exchange WebRTC signals via 'webrtc-signal'
  ↓
Peer connection established
  ↓
Streams exchanged
```

### 2. STUN/TURN Configuration

```typescript
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

// For production, add TURN:
// { urls: 'turn:your-turn-server.com:3478', username: '...', credential: '...' }
```

### 3. Media Stream Management

```typescript
// Get user media
const stream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
});

// Add to peer
peer.addStream(stream);

// Cleanup
stream.getTracks().forEach(track => track.stop());
```

### 4. Error Handling

```typescript
peer.on('error', (err) => {
  // Handle connection errors
  // Retry with different ICE servers
  // Fallback to audio-only
});
```

---

## Testing Checklist

### Unit Tests
- [ ] WebRTC service methods
- [ ] Hook functionality
- [ ] Component rendering
- [ ] Error handling

### Integration Tests
- [ ] Call initiation flow
- [ ] Signal exchange
- [ ] Media stream handling
- [ ] Call ending

### E2E Tests
- [ ] Complete call flow (1-on-1)
- [ ] Group call (2-4 participants)
- [ ] Screen sharing
- [ ] Error scenarios

### Performance Tests
- [ ] Bandwidth usage
- [ ] CPU usage
- [ ] Memory usage
- [ ] Connection latency

---

## Success Criteria

### MVP (Week 4)
- ✅ 1-on-1 video calls work
- ✅ 1-on-1 audio calls work
- ✅ Mute/unmute works
- ✅ Video toggle works
- ✅ Call history saved
- ✅ Basic error handling

### Full Feature (Week 8)
- ✅ Group calls (2-4 participants)
- ✅ Screen sharing
- ✅ Call recording (optional)
- ✅ Mobile responsive
- ✅ Accessible
- ✅ Production ready

---

## Next Steps

1. **Review this plan** - Confirm approach
2. **Start Phase 1** - Foundation setup
3. **Iterate** - Build and test incrementally
4. **Deploy** - Release when ready

---

**Ready to start implementation!** 🚀

