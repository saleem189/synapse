// ================================
// Media Stream Hook
// ================================
// Hook for managing camera and microphone access

"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { VIDEO_CALL_CONSTRAINTS, AUDIO_CALL_CONSTRAINTS, SCREEN_SHARE_CONSTRAINTS } from '@/lib/config/webrtc-config';
import { usePermissions } from '@/lib/permissions/hooks/use-permissions';

export interface UseMediaStreamOptions {
  video?: boolean;
  audio?: boolean;
  onError?: (error: Error) => void;
}

export interface UseMediaStreamReturn {
  stream: MediaStream | null;
  isLoading: boolean;
  error: Error | null;
  startStream: (options?: { video?: boolean; audio?: boolean }) => Promise<MediaStream | null>;
  stopStream: () => void;
  toggleVideo: () => Promise<void>;
  toggleAudio: () => Promise<void>;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  startScreenShare: () => Promise<MediaStream | null>;
  stopScreenShare: () => void;
  isScreenSharing: boolean;
}

/**
 * Hook for managing media streams (camera, microphone, screen share)
 */
export function useMediaStream(options: UseMediaStreamOptions = {}): UseMediaStreamReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(options.video ?? true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(options.audio ?? true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const screenShareStreamRef = useRef<MediaStream | null>(null);

  // Use existing permissions hook
  const {
    isGranted: hasCameraPermission,
    request: requestCameraPermission,
  } = usePermissions('camera', {
    onError: options.onError,
  });

  const {
    isGranted: hasMicrophonePermission,
    request: requestMicrophonePermission,
  } = usePermissions('microphone', {
    onError: options.onError,
  });

  /**
   * Start media stream
   */
  const startStream = useCallback(
    async (streamOptions?: { video?: boolean; audio?: boolean }): Promise<MediaStream | null> => {
      setIsLoading(true);
      setError(null);

      try {
        let video = streamOptions?.video ?? options.video ?? true;
        let audio = streamOptions?.audio ?? options.audio ?? true;

        // Ensure at least one of video or audio is requested (getUserMedia requirement)
        if (!video && !audio) {
          // If both are false, default to audio (required for voice/video calls)
          audio = true;
        }

        // Request permissions
        if (video && !hasCameraPermission) {
          await requestCameraPermission();
        }
        if (audio && !hasMicrophonePermission) {
          await requestMicrophonePermission();
        }

        // Stop existing stream
        if (streamRef.current) {
          stopStream();
        }

        // Get media stream - ensure constraints are properly set
        // getUserMedia requires at least one of audio or video to be true
        const constraints: MediaStreamConstraints = {
          video: video ? (VIDEO_CALL_CONSTRAINTS.video as MediaTrackConstraints) : false,
          audio: audio ? (AUDIO_CALL_CONSTRAINTS.audio as MediaTrackConstraints) : false,
        };

        // Final safety check - ensure at least one is true
        if (constraints.video === false && constraints.audio === false) {
          constraints.audio = AUDIO_CALL_CONSTRAINTS.audio as MediaTrackConstraints;
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

        streamRef.current = mediaStream;
        setStream(mediaStream);
        setIsVideoEnabled(video);
        setIsAudioEnabled(audio);

        return mediaStream;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to access media devices');
        setError(error);
        options.onError?.(error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [options, hasCameraPermission, hasMicrophonePermission, requestCameraPermission, requestMicrophonePermission]
  );

  /**
   * Stop media stream
   */
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
      setStream(null);
    }
    setIsVideoEnabled(false);
    setIsAudioEnabled(false);
  }, []);

  /**
   * Toggle video on/off
   */
  const toggleVideo = useCallback(async () => {
    if (!streamRef.current) {
      // Start stream if not started - ensure at least audio is enabled (required for calls)
      const newVideoState = !isVideoEnabled;
      await startStream({ video: newVideoState, audio: true }); // Always enable audio for calls
      return;
    }

    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
    } else if (!isVideoEnabled) {
      // Add video track if it doesn't exist
      // getUserMedia requires at least one of audio or video, so include audio: false explicitly
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: VIDEO_CALL_CONSTRAINTS.video,
        audio: false, // Explicitly set to false when only requesting video
      });
      videoStream.getVideoTracks().forEach((track) => {
        streamRef.current!.addTrack(track);
      });
      setIsVideoEnabled(true);
    }
  }, [isVideoEnabled, isAudioEnabled, startStream]);

  /**
   * Toggle audio on/off
   */
  const toggleAudio = useCallback(async () => {
    if (!streamRef.current) {
      // Start stream if not started
      // If disabling audio, ensure video is enabled (at least one must be true for getUserMedia)
      const newAudioState = !isAudioEnabled;
      const newVideoState = !newAudioState ? isVideoEnabled : (isVideoEnabled || true);
      await startStream({ video: newVideoState, audio: newAudioState || true });
      return;
    }

    const audioTrack = streamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
    } else if (!isAudioEnabled) {
      // Add audio track if it doesn't exist
      // getUserMedia requires at least one of audio or video, so include video: false explicitly
      const audioStream = await navigator.mediaDevices.getUserMedia({
        video: false, // Explicitly set to false when only requesting audio
        audio: AUDIO_CALL_CONSTRAINTS.audio,
      });
      audioStream.getAudioTracks().forEach((track) => {
        streamRef.current!.addTrack(track);
      });
      setIsAudioEnabled(true);
    }
  }, [isVideoEnabled, isAudioEnabled, startStream]);

  /**
   * Start screen sharing
   */
  const startScreenShare = useCallback(async (): Promise<MediaStream | null> => {
    try {
      // Stop existing screen share
      if (screenShareStreamRef.current) {
        stopScreenShare();
      }

      const screenStream = await navigator.mediaDevices.getDisplayMedia(SCREEN_SHARE_CONSTRAINTS);

      // Handle screen share stop (user clicks stop sharing)
      screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        stopScreenShare();
      });

      screenShareStreamRef.current = screenStream;
      setIsScreenSharing(true);

      return screenStream;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start screen share');
      setError(error);
      options.onError?.(error);
      return null;
    }
  }, [options]);

  /**
   * Stop screen sharing
   */
  const stopScreenShare = useCallback(() => {
    if (screenShareStreamRef.current) {
      screenShareStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      screenShareStreamRef.current = null;
      setIsScreenSharing(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
      stopScreenShare();
    };
  }, [stopStream, stopScreenShare]);

  return {
    stream,
    isLoading,
    error,
    startStream,
    stopStream,
    toggleVideo,
    toggleAudio,
    isVideoEnabled,
    isAudioEnabled,
    startScreenShare,
    stopScreenShare,
    isScreenSharing,
  };
}

