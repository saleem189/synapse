// ================================
// Voice Message Player Component
// ================================

"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Mic, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface VoiceMessageProps {
  audioUrl: string;
  duration?: number; // Duration in seconds
  isSent: boolean;
  fileName?: string;
}

export function VoiceMessage({
  audioUrl,
  duration: initialDuration,
  isSent,
  fileName,
}: VoiceMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("loadstart", handleLoadStart);
    audio.addEventListener("canplay", handleCanPlay);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.pause();
      audio.src = "";
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg min-w-[200px] max-w-[300px]",
        isSent
          ? "bg-white/10 border border-white/20 backdrop-blur-sm"
          : "bg-muted border border-border"
      )}
    >
      {/* Play/Pause Button */}
      <Button
        onClick={togglePlay}
        disabled={isLoading}
        size="icon"
        variant={isSent ? "ghost" : "outline"}
        className={cn(
          "w-10 h-10 rounded-full flex-shrink-0 transition-all duration-200",
          "hover:scale-110 active:scale-95",
          isSent && "bg-white/20 hover:bg-white/30 text-white border-white/30"
        )}
        title={isPlaying ? "Pause" : "Play"}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5 ml-0.5" />
        )}
      </Button>

      {/* Waveform/Progress Bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Mic className={cn(
            "w-4 h-4 flex-shrink-0",
            isSent ? "text-white/90" : "text-muted-foreground"
          )} />
          <div className={cn(
            "flex-1 h-2 rounded-full overflow-hidden",
            isSent ? "bg-white/20" : "bg-muted"
          )}>
            <div
              className={cn(
                "h-full transition-all duration-100 rounded-full",
                isSent ? "bg-white/80" : "bg-primary"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className={cn(
            "font-medium",
            isSent ? "text-white/90" : "text-muted-foreground"
          )}>
            {formatTime(currentTime)}
          </span>
          <span className={cn(
            isSent ? "text-white/70" : "text-muted-foreground"
          )}>
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}

