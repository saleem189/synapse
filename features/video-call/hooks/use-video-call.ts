// ================================
// Video Call Hook (Main)
// ================================
// Main hook that orchestrates video/audio calls

"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SignalData } from 'simple-peer';
import { useSocket } from '@/hooks/use-socket';
import { useMediaStream } from './use-media-stream';
import { getWebRTCService } from '@/lib/services/webrtc.service';
import { toast } from 'sonner';
import type { VideoCallParticipant } from '../types';

export type CallType = 'video' | 'audio';
export type CallStatus = 'idle' | 'initiating' | 'ringing' | 'active' | 'ending';

export interface IncomingCall {
  callId: string;
  from: string;
  fromName: string;
  fromAvatar?: string | null;
  roomId: string;
  callType: CallType;
}

export interface ActiveCall {
  callId: string;
  roomId: string;
  callType: CallType;
  participants: Map<string, VideoCallParticipant>;
  remoteStreams: Map<string, MediaStream>;
  isMuted: boolean;
  hasVideo: boolean;
  isScreenSharing: boolean;
}

export interface UseVideoCallOptions {
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string | null;
  onCallEnded?: () => void;
}

export interface UseVideoCallReturn {
  // Call state
  callStatus: CallStatus;
  activeCall: ActiveCall | null;
  incomingCall: IncomingCall | null;
  
  // Actions
  initiateCall: (roomId: string, callType: CallType, targetUserId?: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  joinCall: (callId: string, roomId: string) => Promise<void>;
  leaveCall: () => void;
  
  // Media controls
  toggleMute: () => void;
  toggleVideo: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
  
  // Media streams
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  
  // Status
  isMuted: boolean;
  hasVideo: boolean;
  isScreenSharing: boolean;
}

/**
 * Main hook for managing video/audio calls
 */
export function useVideoCall(options: UseVideoCallOptions): UseVideoCallReturn {
  const { currentUserId, currentUserName, currentUserAvatar, onCallEnded } = options;
  const router = useRouter();
  
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  
  const webrtcService = getWebRTCService();
  const callIdRef = useRef<string | null>(null);
  const participantsRef = useRef<Map<string, VideoCallParticipant>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  
  // Use the existing useSocket hook which handles authentication properly
  const { socket, isConnected } = useSocket({ autoConnect: true });
  
  // Media stream management
  const mediaStream = useMediaStream({
    video: true,
    audio: true,
    onError: (error) => {
      toast.error(`Media error: ${error.message}`);
    },
  });
  
  // Update active call state
  const updateActiveCall = useCallback(() => {
    if (activeCall && callIdRef.current) {
      setActiveCall({
        ...activeCall,
        participants: new Map(participantsRef.current),
        remoteStreams: new Map(remoteStreamsRef.current),
      });
    }
  }, [activeCall]);
  
  // End active call
  const endCall = useCallback(() => {
    if (socket && isConnected && callIdRef.current && activeCall) {
      socket.emit('call-end', {
        callId: callIdRef.current,
        roomId: activeCall.roomId,
      });
    }
    
    // Cleanup
    webrtcService.destroyAllPeers();
    mediaStream.stopStream();
    mediaStream.stopScreenShare();
    
    setActiveCall(null);
    setIncomingCall(null);
    setCallStatus('idle');
    callIdRef.current = null;
    participantsRef.current.clear();
    remoteStreamsRef.current.clear();
    
    onCallEnded?.();
  }, [activeCall, webrtcService, mediaStream, onCallEnded, socket, isConnected]);
  
  // Create peer connection for a participant
  const createPeerForParticipant = useCallback(
    (participantId: string, isInitiator: boolean, stream: MediaStream) => {
      const peer = webrtcService.createPeer(
        participantId,
        {
          initiator: isInitiator,
          stream,
          trickle: false,
        },
        {
          onSignal: (signal) => {
            if (socket && isConnected && callIdRef.current) {
              socket.emit('webrtc-signal', {
                to: participantId,
                signal,
                callId: callIdRef.current,
              });
            }
          },
          onStream: (remoteStream) => {
            remoteStreamsRef.current.set(participantId, remoteStream);
            updateActiveCall();
          },
          onError: (error) => {
            toast.error(`Connection error with ${participantId}: ${error.message}`);
          },
          onClose: () => {
            remoteStreamsRef.current.delete(participantId);
            updateActiveCall();
          },
          onConnect: () => {
            toast.success(`Connected to ${participantId}`);
          },
        }
      );
    },
    [webrtcService, updateActiveCall, socket, isConnected]
  );
  
  // Set up socket event listeners
  useEffect(() => {
    if (!socket || !isConnected || !currentUserId) return;
    
    // Incoming call handler
    const handleIncomingCall = (data: IncomingCall) => {
      setIncomingCall(data);
      setCallStatus('ringing');
      callIdRef.current = data.callId;
      
      // Play ringtone or show notification
      toast.info(`Incoming ${data.callType} call from ${data.fromName}`, {
        duration: 10000,
      });
    };
    
    // Call accepted handler
    const handleCallAccepted = (data: { callId: string; roomId: string; participantId: string }) => {
      if (callIdRef.current === data.callId) {
        setCallStatus('active');
        setIncomingCall(null);
      }
    };
    
    // Call rejected handler
    const handleCallRejected = (data: { callId: string; roomId: string; participantId: string }) => {
      if (callIdRef.current === data.callId) {
        setCallStatus('idle');
        setIncomingCall(null);
        callIdRef.current = null;
        toast.info('Call was rejected');
      }
    };
    
    // Call ended handler
    const handleCallEnded = (data: { callId: string; roomId: string; endedBy: string }) => {
      if (callIdRef.current === data.callId) {
        endCall();
        toast.info('Call ended');
      }
    };
    
    // WebRTC signal handler
    const handleWebRTCSignal = (data: { from: string; signal: SignalData; callId: string }) => {
      if (callIdRef.current === data.callId && activeCall) {
        const peer = webrtcService.getPeer(data.from);
        if (peer) {
          webrtcService.signalPeer(data.from, data.signal);
        }
      }
    };
    
    // Participant joined handler
    const handleCallJoined = (data: { callId: string; roomId: string; participantId: string; participantName: string }) => {
      if (callIdRef.current === data.callId && activeCall) {
        // Add participant to call
        const participant: VideoCallParticipant = {
          id: data.participantId,
          userId: data.participantId,
          name: data.participantName,
          isMuted: false,
          isVideoOn: true,
          isScreenSharing: false,
          joinedAt: new Date(),
        };
        participantsRef.current.set(data.participantId, participant);
        
        // Create peer connection for new participant
        if (mediaStream.stream) {
          createPeerForParticipant(data.participantId, true, mediaStream.stream);
        }
      }
    };
    
    // Participant left handler
    const handleCallLeft = (data: { callId: string; roomId: string; participantId: string }) => {
      if (callIdRef.current === data.callId && activeCall) {
        participantsRef.current.delete(data.participantId);
        remoteStreamsRef.current.delete(data.participantId);
        webrtcService.destroyPeer(data.participantId);
        updateActiveCall();
      }
    };
    
    // Mute/unmute handler
    const handleParticipantMuted = (data: { callId: string; participantId: string; isMuted: boolean }) => {
      if (callIdRef.current === data.callId && activeCall) {
        const participant = participantsRef.current.get(data.participantId);
        if (participant) {
          participant.isMuted = data.isMuted;
          updateActiveCall();
        }
      }
    };
    
    // Video toggle handler
    const handleVideoToggled = (data: { callId: string; participantId: string; hasVideo: boolean }) => {
      if (callIdRef.current === data.callId && activeCall) {
        const participant = participantsRef.current.get(data.participantId);
        if (participant) {
          participant.isVideoOn = data.hasVideo;
          updateActiveCall();
        }
      }
    };
    
    // Register event listeners
    socket.on('incoming-call', handleIncomingCall);
    socket.on('call-accepted', handleCallAccepted);
    socket.on('call-rejected', handleCallRejected);
    socket.on('call-ended', handleCallEnded);
    socket.on('webrtc-signal', handleWebRTCSignal);
    socket.on('call-joined', handleCallJoined);
    socket.on('call-left', handleCallLeft);
    socket.on('call-participant-muted', handleParticipantMuted);
    socket.on('call-participant-video-toggled', handleVideoToggled);
    
    return () => {
      if (socket) {
        socket.off('incoming-call', handleIncomingCall);
        socket.off('call-accepted', handleCallAccepted);
        socket.off('call-rejected', handleCallRejected);
        socket.off('call-ended', handleCallEnded);
        socket.off('webrtc-signal', handleWebRTCSignal);
        socket.off('call-joined', handleCallJoined);
        socket.off('call-left', handleCallLeft);
        socket.off('call-participant-muted', handleParticipantMuted);
        socket.off('call-participant-video-toggled', handleVideoToggled);
      }
    };
  }, [currentUserId, activeCall, mediaStream.stream, webrtcService, socket, isConnected, updateActiveCall, createPeerForParticipant, endCall]);
  
  /**
   * Initiate a call
   */
  const initiateCall = useCallback(
    async (roomId: string, callType: CallType, targetUserId?: string) => {
      try {
        setCallStatus('initiating');
        
        // Get media stream
        const stream = await mediaStream.startStream({
          video: callType === 'video',
          audio: true,
        });
        
        if (!stream) {
          throw new Error('Failed to access media devices');
        }
        
        // Emit call initiate event
        if (socket && isConnected) {
          socket.emit('call-initiate', {
            roomId,
            targetUserId,
            callType,
          });
        }
        
        // Wait for call ID from server (will be set via incoming-call or call-accepted)
        // For now, generate a temporary ID
        const tempCallId = `call-${Date.now()}`;
        callIdRef.current = tempCallId;
        
        // Create active call
        const newCall: ActiveCall = {
          callId: tempCallId,
          roomId,
          callType,
          participants: new Map(),
          remoteStreams: new Map(),
          isMuted: false,
          hasVideo: callType === 'video',
          isScreenSharing: false,
        };
        
        // Add current user as participant
        const currentParticipant: VideoCallParticipant = {
          id: currentUserId,
          userId: currentUserId,
          name: currentUserName,
          avatar: currentUserAvatar,
          isMuted: false,
          isVideoOn: callType === 'video',
          isScreenSharing: false,
          joinedAt: new Date(),
        };
        participantsRef.current.set(currentUserId, currentParticipant);
        newCall.participants.set(currentUserId, currentParticipant);
        
        setActiveCall(newCall);
        setCallStatus('ringing');
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to initiate call');
        toast.error(err.message);
        setCallStatus('idle');
        mediaStream.stopStream();
      }
    },
    [currentUserId, currentUserName, currentUserAvatar, mediaStream, socket, isConnected]
  );
  
  /**
   * Accept incoming call
   */
  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    
    try {
      setCallStatus('active');
      
      // Get media stream
      const stream = await mediaStream.startStream({
        video: incomingCall.callType === 'video',
        audio: true,
      });
      
      if (!stream) {
        throw new Error('Failed to access media devices');
      }
      
      // Emit accept event
      if (socket && isConnected) {
        socket.emit('call-accept', {
          callId: incomingCall.callId,
          roomId: incomingCall.roomId,
        });
      }
      
      // Create active call
      const newCall: ActiveCall = {
        callId: incomingCall.callId,
        roomId: incomingCall.roomId,
        callType: incomingCall.callType,
        participants: new Map(),
        remoteStreams: new Map(),
        isMuted: false,
        hasVideo: incomingCall.callType === 'video',
        isScreenSharing: false,
      };
      
      // Add current user
      const currentParticipant: VideoCallParticipant = {
        id: currentUserId,
        userId: currentUserId,
        name: currentUserName,
        avatar: currentUserAvatar,
        isMuted: false,
        isVideoOn: incomingCall.callType === 'video',
        isScreenSharing: false,
        joinedAt: new Date(),
      };
      participantsRef.current.set(currentUserId, currentParticipant);
      newCall.participants.set(currentUserId, currentParticipant);
      
      // Add caller as participant
      const callerParticipant: VideoCallParticipant = {
        id: incomingCall.from,
        userId: incomingCall.from,
        name: incomingCall.fromName,
        avatar: incomingCall.fromAvatar,
        isMuted: false,
        isVideoOn: incomingCall.callType === 'video',
        isScreenSharing: false,
        joinedAt: new Date(),
      };
      participantsRef.current.set(incomingCall.from, callerParticipant);
      newCall.participants.set(incomingCall.from, callerParticipant);
      
      // Create peer connection for caller
      createPeerForParticipant(incomingCall.from, false, stream);
      
      setActiveCall(newCall);
      setIncomingCall(null);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to accept call');
      toast.error(err.message);
      rejectCall();
    }
  }, [incomingCall, currentUserId, currentUserName, currentUserAvatar, mediaStream, createPeerForParticipant, socket, isConnected]);
  
  /**
   * Reject incoming call
   */
  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    
    if (socket && isConnected) {
      socket.emit('call-reject', {
        callId: incomingCall.callId,
        roomId: incomingCall.roomId,
      });
    }
    
    setIncomingCall(null);
    setCallStatus('idle');
    callIdRef.current = null;
  }, [incomingCall, socket, isConnected]);
  
  /**
   * Join an existing call
   */
  const joinCall = useCallback(
    async (callId: string, roomId: string) => {
      // Similar to acceptCall but for joining group calls
      // Implementation depends on server-side logic
      toast.info('Join call functionality coming soon');
    },
    []
  );
  
  /**
   * Leave active call
   */
  const leaveCall = useCallback(() => {
    if (socket && isConnected && callIdRef.current && activeCall) {
      socket.emit('call-leave', {
        callId: callIdRef.current,
        roomId: activeCall.roomId,
      });
    }
    
    endCall();
  }, [activeCall, endCall, socket, isConnected]);
  
  /**
   * Toggle mute
   */
  const toggleMute = useCallback(async () => {
    await mediaStream.toggleAudio();
    
    if (activeCall && socket && isConnected && callIdRef.current) {
      const isMuted = !mediaStream.isAudioEnabled;
      setActiveCall({ ...activeCall, isMuted });
      
      socket.emit('call-mute', {
        callId: callIdRef.current,
        roomId: activeCall.roomId,
        isMuted,
      });
    }
  }, [mediaStream, activeCall, socket, isConnected]);
  
  /**
   * Toggle video
   */
  const toggleVideo = useCallback(async () => {
    await mediaStream.toggleVideo();
    
    if (activeCall && socket && isConnected && callIdRef.current) {
      const hasVideo = mediaStream.isVideoEnabled;
      setActiveCall({ ...activeCall, hasVideo });
      
      socket.emit('call-video-toggle', {
        callId: callIdRef.current,
        roomId: activeCall.roomId,
        hasVideo,
      });
    }
  }, [mediaStream, activeCall, socket, isConnected]);
  
  /**
   * Start screen sharing
   */
  const startScreenShare = useCallback(async () => {
    if (!activeCall) return;
    
    const screenStream = await mediaStream.startScreenShare();
    if (screenStream && mediaStream.stream) {
      // Replace video track with screen share
      // Implementation depends on peer connection management
      setActiveCall({ ...activeCall, isScreenSharing: true });
      
      if (socket && isConnected && callIdRef.current) {
        socket.emit('call-screen-share', {
          callId: callIdRef.current,
          roomId: activeCall.roomId,
          isSharing: true,
        });
      }
    }
  }, [activeCall, mediaStream]);
  
  /**
   * Stop screen sharing
   */
  const stopScreenShare = useCallback(() => {
    if (!activeCall) return;
    
    mediaStream.stopScreenShare();
    setActiveCall({ ...activeCall, isScreenSharing: false });
    
    if (socket && isConnected && callIdRef.current) {
      socket.emit('call-screen-share', {
        callId: callIdRef.current,
        roomId: activeCall.roomId,
        isSharing: false,
      });
    }
  }, [activeCall, mediaStream]);
  
  return {
    callStatus,
    activeCall,
    incomingCall,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    joinCall,
    leaveCall,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    localStream: mediaStream.stream,
    remoteStreams: remoteStreamsRef.current,
    isMuted: !mediaStream.isAudioEnabled,
    hasVideo: mediaStream.isVideoEnabled,
    isScreenSharing: mediaStream.isScreenSharing,
  };
}

