// ================================
// Participant Video Component
// ================================
// Individual participant video view

"use client";

import { useRef, useEffect, useState } from "react";
import { Mic, MicOff, Video, VideoOff, User } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";
import type { VideoCallParticipant } from "../types";

interface ParticipantVideoProps {
  participant: VideoCallParticipant;
  stream: MediaStream | null;
  isLocal?: boolean;
  isActiveSpeaker?: boolean;
  className?: string;
}

export function ParticipantVideo({
  participant,
  stream,
  isLocal = false,
  isActiveSpeaker = false,
  className,
}: ParticipantVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoVisible, setIsVideoVisible] = useState(false);

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((error) => {
        // AbortError is harmless - it occurs when the video source changes quickly
        // This is common during WebRTC stream updates
        if (error.name !== 'AbortError') {
          console.error('Error playing video:', error);
        }
      });

      // Check if video track is enabled
      const videoTrack = stream.getVideoTracks()[0];
      setIsVideoVisible(videoTrack?.enabled ?? false);
    } else if (videoRef.current) {
      videoRef.current.srcObject = null;
      setIsVideoVisible(false);
    }
  }, [stream]);

  // Update video visibility when track is enabled/disabled
  useEffect(() => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const handleTrackChange = () => {
          setIsVideoVisible(videoTrack.enabled);
        };
        videoTrack.addEventListener('ended', handleTrackChange);
        videoTrack.addEventListener('mute', handleTrackChange);
        videoTrack.addEventListener('unmute', handleTrackChange);
        return () => {
          videoTrack.removeEventListener('ended', handleTrackChange);
          videoTrack.removeEventListener('mute', handleTrackChange);
          videoTrack.removeEventListener('unmute', handleTrackChange);
        };
      }
    }
  }, [stream]);

  return (
    <div
      className={cn(
        "relative w-full h-full rounded-lg overflow-hidden bg-surface-900",
        isActiveSpeaker && "ring-2 ring-primary-500 ring-offset-2",
        className
      )}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // Always mute local video to prevent feedback
        className={cn(
          "w-full h-full object-cover",
          !isVideoVisible && "hidden"
        )}
      />

      {/* Avatar/Placeholder when video is off */}
      {(!isVideoVisible || !stream) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary-400 to-blue-500">
          <Avatar className="w-20 h-20 border-4 border-white/20">
            <AvatarImage src={participant.avatar || undefined} alt={participant.name} />
            <AvatarFallback className="bg-white/20 text-white text-2xl font-bold">
              {getInitials(participant.name)}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Participant Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-medium truncate">
            {participant.name}
            {isLocal && " (You)"}
          </span>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="absolute top-2 right-2 flex items-center gap-2">
        {/* Mute Indicator */}
        {participant.isMuted ? (
          <div className="w-8 h-8 rounded-full bg-red-500/80 flex items-center justify-center">
            <MicOff className="w-4 h-4 text-white" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-green-500/80 flex items-center justify-center">
            <Mic className="w-4 h-4 text-white" />
          </div>
        )}

        {/* Video Off Indicator */}
        {!participant.isVideoOn && (
          <div className="w-8 h-8 rounded-full bg-surface-800/80 flex items-center justify-center">
            <VideoOff className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* Screen Share Indicator */}
      {participant.isScreenSharing && (
        <div className="absolute top-2 left-2 px-2 py-1 rounded bg-primary-500/80 text-white text-xs font-medium">
          Sharing Screen
        </div>
      )}
    </div>
  );
}

