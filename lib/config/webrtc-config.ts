// ================================
// WebRTC Configuration
// ================================
// STUN/TURN server configuration for WebRTC peer connections

/**
 * ICE (Interactive Connectivity Establishment) server configuration
 * Used for NAT traversal and establishing peer connections
 */
export interface ICEServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

/**
 * Get STUN/TURN server configuration
 * 
 * For MVP: Uses free Google STUN servers
 * For Production: Add TURN server for better NAT traversal
 */
export function getICEServers(): ICEServer[] {
  const iceServers: ICEServer[] = [
    // Free Google STUN servers (for NAT traversal)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ];

  // Add TURN server for production (if configured)
  // TURN servers are needed when STUN fails (symmetric NAT, firewalls)
  const turnServerUrl = process.env.NEXT_PUBLIC_TURN_SERVER_URL;
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (turnServerUrl && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnServerUrl,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return iceServers;
}

/**
 * Default WebRTC configuration
 */
export const DEFAULT_WEBRTC_CONFIG: RTCConfiguration = {
  iceServers: getICEServers(),
  iceCandidatePoolSize: 10,
};

/**
 * Media constraints for video calls
 */
export const VIDEO_CALL_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
    facingMode: 'user',
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
  },
};

/**
 * Media constraints for audio-only calls
 */
export const AUDIO_CALL_CONSTRAINTS: MediaStreamConstraints = {
  video: false,
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
  },
};

/**
 * Media constraints for screen sharing
 */
export const SCREEN_SHARE_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 },
  } as MediaTrackConstraints,
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
  },
};

/**
 * Check if WebRTC is supported in the current browser
 */
export function isWebRTCSupported(): boolean {
  if (typeof window === 'undefined') return false;
  
  return !!(
    window.RTCPeerConnection &&
    window.navigator.mediaDevices &&
    window.navigator.mediaDevices.getUserMedia
  );
}

/**
 * Check if screen sharing is supported
 */
export function isScreenShareSupported(): boolean {
  if (typeof window === 'undefined') return false;
  
  return !!(
    window.navigator.mediaDevices &&
    window.navigator.mediaDevices.getDisplayMedia
  );
}

