# Video Calls

Understand how peer-to-peer video calling works in Synapse.

---

## How It Works

Synapse uses **WebRTC** for direct peer-to-peer video/audio streaming:

```
┌─────────────┐                           ┌─────────────┐
│   User A    │                           │   User B    │
│  (Caller)   │                           │  (Callee)   │
└──────┬──────┘                           └──────┬──────┘
       │                                         │
       │  1. Initiate call (Socket.io)         │
       │────────────────────────────────────────>│
       │                                         │
       │  2. Accept call (Socket.io)            │
       │<────────────────────────────────────────│
       │                                         │
       │  3. Exchange WebRTC signals (Socket.io)│
       │<───────────────────────────────────────>│
       │                                         │
       │  4. Establish P2P connection           │
       │═════════════════════════════════════════│
       │                                         │
       │  5. Media flows directly (not via server)
       │<═══════════════════════════════════════>│
       │         Video + Audio                   │
```

**Key Point:** After signaling, media flows **directly between users** (peer-to-peer), not through the server!

---

## Technologies

### WebRTC

Browser API for peer-to-peer communication.

**Handles:**
- Camera/microphone access
- Media encoding/decoding
- NAT traversal (STUN/TURN)
- Encryption (DTLS-SRTP)

### Socket.io (Signaling)

Coordinates the connection setup.

**Handles:**
- Call initiation
- Call acceptance/rejection
- ICE candidate exchange
- Call end notifications

### simple-peer

JavaScript wrapper for WebRTC.

**Benefits:**
- Simpler API than raw WebRTC
- Handles browser differences
- Built-in error handling

---

## Call Flow

### 1. Initiate Call

```javascript
// Create call session
POST /api/call-sessions
{
  "roomId": "room_123",
  "type": "video"
}

// Notify participants via Socket.io
socket.emit('call-initiate', {
  callId: 'call_xyz789',
  participants: ['user_456']
});
```

### 2. Receive Call

```javascript
// Callee receives notification
socket.on('call-incoming', (data) => {
  // Show incoming call UI
  // {
  //   callId: 'call_xyz789',
  //   from: 'user_123',
  //   fromName: 'Jane Smith',
  //   type: 'video'
  // }
});
```

### 3. Accept Call

```javascript
// Get camera/microphone
const stream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
});

// Accept call
socket.emit('call-accept', { callId: 'call_xyz789' });
```

### 4. WebRTC Connection

```javascript
// Create peer connection
const peer = new Peer({
  initiator: true/false,  // true for caller
  stream: localStream,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  }
});

// Exchange signals
peer.on('signal', (signal) => {
  socket.emit('webrtc-signal', {
    callId,
    to: otherUserId,
    signal
  });
});

// Receive remote stream
peer.on('stream', (remoteStream) => {
  remoteVideo.srcObject = remoteStream;
});
```

---

## Call Types

### Video Call

Both video and audio enabled.

```javascript
const stream = await getUserMedia({
  video: true,
  audio: true
});
```

### Audio-Only Call

Voice call without video.

```javascript
const stream = await getUserMedia({
  video: false,
  audio: true
});
```

### Screen Sharing

Share your screen instead of camera.

```javascript
const stream = await navigator.mediaDevices.getDisplayMedia({
  video: true,
  audio: false
});
```

---

## Media Controls

### Mute/Unmute

```javascript
const audioTrack = localStream.getAudioTracks()[0];
audioTrack.enabled = !audioTrack.enabled;

// Notify others
socket.emit(audioTrack.enabled ? 'call-unmute' : 'call-mute', {
  callId
});
```

### Video On/Off

```javascript
const videoTrack = localStream.getVideoTracks()[0];
videoTrack.enabled = !videoTrack.enabled;

socket.emit(videoTrack.enabled ? 'call-video-on' : 'call-video-off', {
  callId
});
```

---

## Network Requirements

### STUN Servers

Help discover your public IP address for P2P connection.

**Free STUN servers:**
- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`

### TURN Servers (Optional)

Relay traffic when P2P fails (strict firewalls/NATs).

**When needed:**
- Corporate networks with strict firewalls
- Symmetric NATs
- Public WiFi with port restrictions

**Cost:** TURN servers relay all traffic (bandwidth intensive)

---

## Performance

### Bandwidth Requirements

| Quality | Video | Audio | Total |
|---------|-------|-------|-------|
| **Low** | 300 Kbps | 50 Kbps | ~350 Kbps |
| **Medium** | 600 Kbps | 50 Kbps | ~650 Kbps |
| **High** | 1200 Kbps | 50 Kbps | ~1.25 Mbps |
| **HD** | 2500 Kbps | 50 Kbps | ~2.5 Mbps |

### Group Calls

**Mesh topology** (Synapse default):
- Each peer connects to every other peer
- Max recommended: 4-6 participants
- Bandwidth: n×(n-1)/2 connections

**Example:** 4 participants = 6 connections

---

## Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| **Chrome** | ✅ Full | Best performance |
| **Firefox** | ✅ Full | Excellent support |
| **Safari** | ✅ Full | iOS 14.3+ |
| **Edge** | ✅ Full | Chromium-based |
| **Mobile** | ✅ Full | iOS/Android |

---

## Security

### Encryption

All WebRTC media is encrypted by default:
- **DTLS-SRTP** for media streams
- **End-to-end** between peers
- No server decryption

### Permissions

Browser requires explicit user permission:
- Camera access
- Microphone access
- Screen sharing

---

## Best Practices

### Performance

- **Limit group size** (4-6 for mesh topology)
- **Adjust quality** based on bandwidth
- **Use TURN** only when needed (expensive)

### UX

- **Show connection state** (connecting, connected, reconnecting)
- **Display bandwidth indicator** (poor/good/excellent)
- **Mute by default** in large groups

### Error Handling

- **Permission denied** → Show instructions
- **Connection failed** → Retry with TURN
- **Network issues** → Show quality warning

---

## Next Steps

- **[Start Video Call Guide](../guides/start-video-call.md)** - Step-by-step tutorial
- **[Video Calls API](../api-reference/rest/calls.md)** - API reference
- **[WebSocket Events](../api-reference/websocket/README.md)** - Call events

---

## Related

- **[Real-time Communication](./realtime.md)**
- **[Rooms](./rooms.md)**
- **[Notifications](./notifications.md)**

