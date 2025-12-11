// ================================
// Video Call Modal Component
// ================================
// Main video call interface with resizable, draggable window
// Inspired by Zoom, Google Meet, Microsoft Teams UI/UX

"use client";

import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { ParticipantGrid } from "./participant-grid";
import { CallControls } from "./call-controls";
import { useVideoCallContext } from "./video-call-provider";
import { ResizableVideoCallWindow } from "./resizable-video-call-window";

export function VideoCallModal() {
  const {
    activeCall,
    callStatus,
    localStream,
    remoteStreams,
    isMuted,
    hasVideo,
    isScreenSharing,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    endCall,
    currentUserId,
  } = useVideoCallContext();

  if (!activeCall || callStatus === 'idle') return null;

  // Get participants array from Map
  const participants = Array.from(activeCall.participants.values());
  
  // Create window title
  const windowTitle = `${activeCall.callType === 'video' ? 'Video' : 'Audio'} Call - ${participants.length} participant${participants.length !== 1 ? 's' : ''}`;

  return (
    <ResizableVideoCallWindow
      title={windowTitle}
      onClose={endCall}
      defaultWidth={900}
      defaultHeight={700}
      minWidth={500}
      minHeight={400}
      className="text-white"
    >
      {/* Video Grid */}
      <div className="flex-1 overflow-hidden p-4 bg-surface-900">
        {participants.length > 0 ? (
          <ParticipantGrid
            participants={participants}
            remoteStreams={remoteStreams}
            localStream={localStream}
            currentUserId={currentUserId}
            className="h-full"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Users className="w-5 h-5 text-surface-400" />
              </div>
              <p className="text-surface-400">Waiting for participants...</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <CallControls
        isMuted={isMuted}
        hasVideo={hasVideo}
        isScreenSharing={isScreenSharing}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={isScreenSharing ? stopScreenShare : startScreenShare}
        onEndCall={endCall}
        className="border-t border-surface-700 bg-surface-800/50 backdrop-blur-sm"
      />
    </ResizableVideoCallWindow>
  );
}

