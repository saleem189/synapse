# Video Call Use Cases - Individual vs Room Calls

**Date:** ${new Date().toISOString().split('T')[0]}

---

## ✅ Yes, It Works for Both!

The video call feature will work seamlessly for:
1. **Individual/Direct Messages (1-on-1)** - `isGroup: false`
2. **Group Rooms** - `isGroup: true`

---

## How It Works

### 1. Individual Calls (Direct Messages)

**Scenario:** User A and User B in a DM room

**Room Structure:**
```typescript
{
  id: "room-123",
  name: "User B", // or "User A" depending on perspective
  isGroup: false,  // ← This is a DM
  participants: [
    { userId: "user-a", name: "Alice" },
    { userId: "user-b", name: "Bob" }
  ]
}
```

**Call Flow:**
1. User A clicks "Video Call" button in the DM room
2. System detects `isGroup: false` → initiates 1-on-1 call
3. Creates **single peer connection** between User A and User B
4. Both users see each other's video/audio
5. Simple P2P connection (most efficient)

**Technical Details:**
- **Peer Connections:** 1 connection (A ↔ B)
- **Bandwidth:** ~500KB/s - 2MB/s per user
- **Complexity:** Lowest (simple-peer perfect for this)
- **Topology:** Direct P2P

---

### 2. Group Room Calls

**Scenario:** 4 users in a group chat room

**Room Structure:**
```typescript
{
  id: "room-456",
  name: "Project Team",
  isGroup: true,  // ← This is a group room
  participants: [
    { userId: "user-a", name: "Alice" },
    { userId: "user-b", name: "Bob" },
    { userId: "user-c", name: "Charlie" },
    { userId: "user-d", name: "Diana" }
  ]
}
```

**Call Flow:**
1. User A clicks "Video Call" button in the group room
2. System detects `isGroup: true` → initiates group call
3. Creates **mesh topology** (each user connects to all others)
4. All users see all other participants' video/audio
5. Multiple peer connections (A↔B, A↔C, A↔D, B↔C, B↔D, C↔D)

**Technical Details:**
- **Peer Connections:** N×(N-1)/2 connections (for N participants)
  - 2 users: 1 connection
  - 3 users: 3 connections
  - 4 users: 6 connections
  - 5 users: 10 connections
- **Bandwidth:** ~500KB/s - 2MB/s per participant × number of connections
- **Complexity:** Medium (mesh topology)
- **Topology:** Mesh P2P (each to each)

**Limitations with simple-peer:**
- Best for **2-4 participants** (6-10 peer connections)
- Beyond 4 participants, bandwidth becomes an issue
- For larger groups (5+), consider mediasoup (SFU architecture)

---

## Implementation Logic

### Call Initiation Logic

```typescript
// In chat-room-header.tsx or video call hook
function startVideoCall(roomId: string, isGroup: boolean, participants: Participant[]) {
  if (!isGroup && participants.length === 2) {
    // 1-on-1 call (DM)
    initiateOneOnOneCall(roomId, participants);
  } else if (isGroup && participants.length <= 4) {
    // Small group call (2-4 participants)
    initiateGroupCall(roomId, participants);
  } else {
    // Large group - show warning or use mediasoup
    toast.warning("Group calls are limited to 4 participants. Consider splitting into smaller groups.");
  }
}
```

### One-on-One Call Function

```typescript
async function initiateOneOnOneCall(roomId: string, participants: Participant[]) {
  // Get the other participant (not current user)
  const otherParticipant = participants.find(p => p.id !== currentUserId);
  
  if (!otherParticipant) return;
  
  // Create peer connection (initiator: true)
  const peer = new Peer({ initiator: true, trickle: false });
  
  // Get local media stream
  const localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });
  
  // Add stream to peer
  peer.addStream(localStream);
  
  // Signal via Socket.io
  peer.on('signal', (data) => {
    socket.emit('call-initiate', {
      roomId,
      targetUserId: otherParticipant.id,
      callType: 'video',
      signal: data
    });
  });
  
  // Handle remote stream
  peer.on('stream', (remoteStream) => {
    // Display remote video
    remoteVideoRef.current.srcObject = remoteStream;
  });
}
```

### Group Call Function (Mesh Topology)

```typescript
async function initiateGroupCall(roomId: string, participants: Participant[]) {
  const otherParticipants = participants.filter(p => p.id !== currentUserId);
  
  // Get local media stream
  const localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });
  
  // Create peer connection for each other participant
  const peers = new Map<string, Peer>();
  
  otherParticipants.forEach(participant => {
    const peer = new Peer({ 
      initiator: true, 
      trickle: false 
    });
    
    peer.addStream(localStream);
    
    peer.on('signal', (data) => {
      socket.emit('webrtc-signal', {
        roomId,
        to: participant.id,
        signal: data
      });
    });
    
    peer.on('stream', (remoteStream) => {
      // Display participant's video
      displayParticipantVideo(participant.id, remoteStream);
    });
    
    peers.set(participant.id, peer);
  });
  
  // Listen for incoming signals from other participants
  socket.on('webrtc-signal', ({ from, signal }) => {
    const peer = peers.get(from);
    if (peer) {
      peer.signal(signal);
    }
  });
}
```

---

## Visual Comparison

### Individual Call (1-on-1)
```
┌─────────┐         ┌─────────┐
│ User A  │◄───────►│ User B  │
│         │  P2P    │         │
│ Video   │         │ Video   │
└─────────┘         └─────────┘
    1 Connection
```

### Group Call (4 participants)
```
        ┌─────────┐
        │ User A  │
        └────┬────┘
             │
    ┌────────┼────────┐
    │        │        │
┌───▼───┐ ┌──▼───┐ ┌──▼───┐
│User B │ │User C│ │User D│
└───────┘ └──────┘ └──────┘

6 Connections Total (Mesh Topology)
- A↔B, A↔C, A↔D
- B↔C, B↔D
- C↔D
```

---

## Database Schema

The call is always associated with a `roomId`, regardless of whether it's a DM or group:

```prisma
model CallSession {
  id        String   @id @default(cuid())
  roomId    String   // ← Works for both DM and group rooms
  room      ChatRoom @relation(fields: [roomId], references: [id])
  
  callType  CallType @default(VIDEO)
  status    CallStatus @default(ACTIVE)
  
  participants CallParticipant[] // Can be 2 (DM) or more (group)
}
```

**Key Point:** The same `CallSession` model works for both scenarios. The difference is:
- **DM rooms:** Always 2 participants
- **Group rooms:** 2+ participants (we'll limit to 4 for MVP)

---

## UI/UX Differences

### Individual Call UI
- **Layout:** Side-by-side or picture-in-picture
- **Controls:** Simple (mute, video, end)
- **Participants:** Always 2 (current user + 1 other)

### Group Call UI
- **Layout:** Grid (2×2 for 4 participants)
- **Controls:** Same (mute, video, end, screen share)
- **Participants:** 2-4 participants
- **Active Speaker:** Highlight who's speaking
- **Participant List:** Show all participants

---

## Limitations & Considerations

### With simple-peer (MVP)

**✅ Works Great:**
- 1-on-1 calls (perfect)
- Small group calls (2-4 participants)

**⚠️ Limitations:**
- Large groups (5+): Bandwidth issues
- Each participant sends stream to all others
- Bandwidth grows exponentially: N×(N-1)/2 connections

**Example Bandwidth:**
- 2 users: 1 connection × 2MB/s = 2MB/s total
- 4 users: 6 connections × 2MB/s = 12MB/s total
- 8 users: 28 connections × 2MB/s = 56MB/s total (too much!)

### Future Scaling

For groups larger than 4, you'd need:
- **mediasoup** (SFU architecture)
- Or **Twilio Video** (managed service)
- Or split into smaller groups

---

## Summary

| Feature | Individual (DM) | Group Room |
|---------|-----------------|------------|
| **Works?** | ✅ Yes | ✅ Yes |
| **Max Participants** | 2 | 4 (with simple-peer) |
| **Peer Connections** | 1 | N×(N-1)/2 |
| **Bandwidth** | Low | Medium |
| **Complexity** | Simple | Medium |
| **Best For** | Perfect | Small teams |

---

## Answer to Your Question

**Yes, you're absolutely right!** 

The video call feature will work for:
1. ✅ **Individual/Direct Messages** (`isGroup: false`) - 1-on-1 calls
2. ✅ **Group Rooms** (`isGroup: true`) - Group calls (2-4 participants)

The implementation automatically detects the room type and handles it appropriately:
- **DM rooms** → Simple 1-on-1 P2P connection
- **Group rooms** → Mesh topology (each to each)

Both use the same codebase, just different connection topologies!

---

**Ready to implement!** 🚀

