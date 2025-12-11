// ================================
// Participant Grid Component
// ================================
// Grid layout for multiple participants

"use client";

import { useMemo } from "react";
import { ParticipantVideo } from "./participant-video";
import { cn } from "@/lib/utils";
import type { VideoCallParticipant } from "../types";

interface ParticipantGridProps {
  participants: VideoCallParticipant[];
  remoteStreams: Map<string, MediaStream>;
  localStream: MediaStream | null;
  currentUserId: string;
  className?: string;
}

export function ParticipantGrid({
  participants,
  remoteStreams,
  localStream,
  currentUserId,
  className,
}: ParticipantGridProps) {
  // Separate local and remote participants
  const { localParticipant, remoteParticipants } = useMemo(() => {
    const local = participants.find((p) => p.userId === currentUserId);
    const remote = participants.filter((p) => p.userId !== currentUserId);
    return { localParticipant: local, remoteParticipants: remote };
  }, [participants, currentUserId]);

  // Calculate grid layout based on participant count
  const gridClass = useMemo(() => {
    const totalParticipants = participants.length;
    if (totalParticipants === 1) {
      return "grid-cols-1";
    } else if (totalParticipants === 2) {
      return "grid-cols-1 md:grid-cols-2";
    } else if (totalParticipants <= 4) {
      return "grid-cols-2";
    } else {
      return "grid-cols-2 md:grid-cols-3";
    }
  }, [participants.length]);

  return (
    <div className={cn("grid gap-2 h-full", gridClass, className)}>
      {/* Local Participant (You) */}
      {localParticipant && (
        <ParticipantVideo
          participant={localParticipant}
          stream={localStream}
          isLocal={true}
          className="min-h-[200px]"
        />
      )}

      {/* Remote Participants */}
      {remoteParticipants.map((participant) => (
        <ParticipantVideo
          key={participant.id}
          participant={participant}
          stream={remoteStreams.get(participant.userId) || null}
          isLocal={false}
          className="min-h-[200px]"
        />
      ))}
    </div>
  );
}

