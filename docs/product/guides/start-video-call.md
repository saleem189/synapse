# Start a Video Call

Learn how to initiate and manage video/audio calls in Synapse.

---

## What You'll Learn

- Create a call session
- Request camera/microphone permissions
- Connect via WebRTC
- Handle call events
- Manage audio/video controls

**Time:** ~15 minutes

---

## Prerequisites

- Synapse running locally ([Quickstart](../getting-started/quickstart.md))
- Authenticated user ([Authentication](../getting-started/authentication.md))
- Existing chat room with members

---

## How Video Calls Work

Synapse uses **WebRTC** for peer-to-peer video/audio:

```
1. User A initiates call
   ↓
2. Server creates call session
   ↓
3. Server notifies User B via Socket.io
   ↓
4. User B accepts call
   ↓
5. WebRTC establishes P2P connection
   ↓
6. Media flows directly between users (not through server)
```

**Key Technologies:**
- **WebRTC** - Peer-to-peer media streaming
- **Socket.io** - Signaling (call initiation, acceptance, ICE candidates)
- **simple-peer** - WebRTC wrapper library

---

## Step 1: Create a Call Session

Start a new call in a room.

**Request:**

```bash
curl -X POST http://localhost:3000/api/call-sessions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "room_abc123",
    "type": "video"
  }'
```

**Parameters:**

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `roomId` | string | - | Room ID where call takes place |
| `type` | string | `video`, `audio` | Call type |

**Response:**

```json
{
  "id": "call_xyz789",
  "roomId": "room_abc123",
  "type": "video",
  "status": "ACTIVE",
  "participants": [
    {
      "userId": "user_123",
      "joinedAt": "2025-12-12T19:00:00.000Z"
    }
  ],
  "startedAt": "2025-12-12T19:00:00.000Z"
}
```

**Save the call ID** - you'll need it for WebRTC signaling.

---

## Step 2: Notify Participants

Use Socket.io to invite other users to the call.

**Emit call-initiate event:**

```javascript
socket.emit('call-initiate', {
  callId: 'call_xyz789',
  roomId: 'room_abc123',
  participants: ['user_456'], // User IDs to invite
  type: 'video'
});
```

**Participants receive:**

```javascript
socket.on('call-incoming', (data) => {
  console.log('Incoming call:', data);
  // {
  //   callId: 'call_xyz789',
  //   roomId: 'room_abc123',
  //   from: 'user_123',
  //   fromName: 'Jane Smith',
  //   type: 'video'
  // }
  
  // Show incoming call UI
  showIncomingCallDialog(data);
});
```

---

## Step 3: Request Media Permissions

Request camera and microphone access from the browser.

**JavaScript:**

```javascript
async function getMediaStream(type) {
  try {
    const constraints = {
      video: type === 'video' ? {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      } : false,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    };
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Display local video
    const localVideo = document.getElementById('local-video');
    localVideo.srcObject = stream;
    
    return stream;
  } catch (error) {
    console.error('Failed to get media:', error);
    
    if (error.name === 'NotAllowedError') {
      alert('Camera/microphone permission denied');
    } else if (error.name === 'NotFoundError') {
      alert('No camera/microphone found');
    }
    
    throw error;
  }
}
```

---

## Step 4: Accept the Call

When receiving a call, accept and join.

**Emit call-accept event:**

```javascript
// User B accepts the call
socket.emit('call-accept', {
  callId: 'call_xyz789'
});

// Get local media
const localStream = await getMediaStream('video');
```

**Caller receives notification:**

```javascript
socket.on('call-accepted', (data) => {
  console.log('Call accepted by:', data.byName);
  // {
  //   callId: 'call_xyz789',
  //   by: 'user_456',
  //   byName: 'John Doe'
  // }
  
  // Start WebRTC connection
  initializeWebRTC(data.by);
});
```

---

## Step 5: Establish WebRTC Connection

Use WebRTC to connect directly between peers.

**Using simple-peer:**

```javascript
import Peer from 'simple-peer';

// Create peer connection
const peer = new Peer({
  initiator: true, // true for caller, false for callee
  trickle: false,  // Send all ICE candidates at once
  stream: localStream, // Your camera/mic stream
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  }
});

// Send WebRTC signal to other peer via Socket.io
peer.on('signal', (signal) => {
  socket.emit('webrtc-signal', {
    callId: 'call_xyz789',
    to: 'user_456',
    signal: signal
  });
});

// Receive remote stream
peer.on('stream', (remoteStream) => {
  const remoteVideo = document.getElementById('remote-video');
  remoteVideo.srcObject = remoteStream;
});

// Handle errors
peer.on('error', (error) => {
  console.error('WebRTC error:', error);
});

// Listen for signals from other peer
socket.on('webrtc-signal', ({ from, signal }) => {
  if (from === 'user_456') {
    peer.signal(signal);
  }
});
```

---

## Step 6: Control Audio/Video

Manage audio and video during the call.

**Mute/Unmute Audio:**

```javascript
function toggleMute() {
  const audioTrack = localStream.getAudioTracks()[0];
  if (audioTrack) {
    audioTrack.enabled = !audioTrack.enabled;
    
    // Notify other participants
    socket.emit(audioTrack.enabled ? 'call-unmute' : 'call-mute', {
      callId: 'call_xyz789'
    });
  }
}
```

**Turn Video On/Off:**

```javascript
function toggleVideo() {
  const videoTrack = localStream.getVideoTracks()[0];
  if (videoTrack) {
    videoTrack.enabled = !videoTrack.enabled;
    
    // Notify other participants
    socket.emit(videoTrack.enabled ? 'call-video-on' : 'call-video-off', {
      callId: 'call_xyz789'
    });
  }
}
```

**Switch Camera (Mobile):**

```javascript
async function switchCamera() {
  const videoTrack = localStream.getVideoTracks()[0];
  const currentFacingMode = videoTrack.getSettings().facingMode;
  
  // Stop current stream
  localStream.getTracks().forEach(track => track.stop());
  
  // Get new stream with opposite camera
  const newStream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: currentFacingMode === 'user' ? 'environment' : 'user'
    },
    audio: true
  });
  
  // Replace track in peer connection
  const sender = peer._pc.getSenders().find(s => s.track?.kind === 'video');
  if (sender) {
    sender.replaceTrack(newStream.getVideoTracks()[0]);
  }
  
  localStream = newStream;
}
```

---

## Step 7: End the Call

Terminate the call and cleanup resources.

**Request:**

```bash
curl -X PATCH http://localhost:3000/api/call-sessions/call_xyz789 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ENDED"
  }'
```

**JavaScript cleanup:**

```javascript
function endCall() {
  // Emit end event
  socket.emit('call-end', { callId: 'call_xyz789' });
  
  // Stop all tracks
  localStream.getTracks().forEach(track => track.stop());
  
  // Destroy peer connection
  if (peer) {
    peer.destroy();
  }
  
  // Clear video elements
  document.getElementById('local-video').srcObject = null;
  document.getElementById('remote-video').srcObject = null;
}

// Listen for call ended
socket.on('call-ended', (data) => {
  console.log('Call ended by:', data.endedBy);
  endCall();
});
```

---

## Complete Example

**Full video call implementation:**

```javascript
import Peer from 'simple-peer';
import { io } from 'socket.io-client';

class VideoCall {
  constructor(callId, roomId, isInitiator) {
    this.callId = callId;
    this.roomId = roomId;
    this.isInitiator = isInitiator;
    this.localStream = null;
    this.peer = null;
    this.socket = io('http://localhost:3001', {
      auth: { token: YOUR_ACCESS_TOKEN }
    });
    
    this.setupSocketListeners();
  }
  
  async start() {
    // Get local media
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    
    // Display local video
    document.getElementById('local-video').srcObject = this.localStream;
    
    // Create peer connection
    this.peer = new Peer({
      initiator: this.isInitiator,
      trickle: false,
      stream: this.localStream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      }
    });
    
    // Handle signals
    this.peer.on('signal', (signal) => {
      this.socket.emit('webrtc-signal', {
        callId: this.callId,
        to: this.otherUserId,
        signal
      });
    });
    
    // Handle remote stream
    this.peer.on('stream', (remoteStream) => {
      document.getElementById('remote-video').srcObject = remoteStream;
    });
    
    // Handle errors
    this.peer.on('error', (error) => {
      console.error('Peer error:', error);
      this.end();
    });
  }
  
  setupSocketListeners() {
    this.socket.on('webrtc-signal', ({ from, signal }) => {
      if (this.peer) {
        this.peer.signal(signal);
      }
    });
    
    this.socket.on('call-ended', () => {
      this.end();
    });
  }
  
  toggleMute() {
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      this.socket.emit(audioTrack.enabled ? 'call-unmute' : 'call-mute', {
        callId: this.callId
      });
    }
  }
  
  toggleVideo() {
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      this.socket.emit(videoTrack.enabled ? 'call-video-on' : 'call-video-off', {
        callId: this.callId
      });
    }
  }
  
  end() {
    // Stop tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    
    // Destroy peer
    if (this.peer) {
      this.peer.destroy();
    }
    
    // Emit end event
    this.socket.emit('call-end', { callId: this.callId });
    
    // Clear videos
    document.getElementById('local-video').srcObject = null;
    document.getElementById('remote-video').srcObject = null;
  }
}

// Usage
const call = new VideoCall('call_xyz789', 'room_abc123', true);
await call.start();
```

---

## Next Steps

- **[Real-time Events](./realtime-events.md)** - Complete Socket.io guide
- **[Video Calls Concept](../concepts/video-calls.md)** - How video calls work
- **[WebSocket API Reference](../api-reference/websocket/README.md)** - Socket.io events

---

## Troubleshooting

### Permission Denied

**Problem:** Browser blocks camera/microphone access

**Solutions:**
1. Check browser permissions (chrome://settings/content)
2. Use HTTPS (required in production)
3. Click "Allow" when prompted
4. Check if another app is using camera

### No Video/Audio

**Problem:** Can't see or hear remote participant

**Solutions:**
1. Check both peers granted permissions
2. Verify ICE candidates exchanged
3. Check firewall/NAT settings
4. Try TURN server for restrictive networks

### Connection Failed

**Problem:** WebRTC connection fails to establish

**Solutions:**
1. Verify STUN server is reachable
2. Check for firewall blocking UDP
3. Use TURN server as fallback
4. Ensure signaling (Socket.io) is working

---

## Related

- **[Video Calls Concept](../concepts/video-calls.md)**
- **[WebSocket Events](../api-reference/websocket/README.md)**
- **[Real-time Guide](./realtime-events.md)**

