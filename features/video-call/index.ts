// ================================
// Feature Module - Video Call
// ================================
// Public API for the video call feature
// Only export what other features need to access

// Types
export type {
    VideoCallParticipant,
    VideoCallRoom,
    VideoCallConfig,
    VideoCallEvent,
    VideoCallEventType,
} from './types';

// Constants
export { VIDEO_CALL_DEFAULTS } from './types';

// Utilities
export {
    isCallHost,
    canJoinCall,
    getActiveScreenSharer,
} from './types';

// Components
export { VideoCallProvider, useVideoCallContext } from './components/video-call-provider';
export { VideoCallModal } from './components/video-call-modal';
export { IncomingCallDialog } from './components/incoming-call-dialog';
export { ResizableVideoCallWindow } from './components/resizable-video-call-window';
export { ParticipantVideo } from './components/participant-video';
export { ParticipantGrid } from './components/participant-grid';
export { CallControls } from './components/call-controls';

// Hooks
export { useVideoCall } from './hooks/use-video-call';
export { useMediaStream } from './hooks/use-media-stream';
export { usePeerConnection } from './hooks/use-peer-connection';
