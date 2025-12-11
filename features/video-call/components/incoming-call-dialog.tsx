// ================================
// Incoming Call Dialog Component
// ================================
// Dialog shown when receiving an incoming call

"use client";

import { Phone, Video, X, PhoneCall } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn, getInitials } from "@/lib/utils";
import { useVideoCallContext } from "./video-call-provider";

export function IncomingCallDialog() {
  const { incomingCall, acceptCall, rejectCall } = useVideoCallContext();

  if (!incomingCall) return null;

  return (
    <Dialog open={!!incomingCall} onOpenChange={(open) => !open && rejectCall()}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="sr-only">
          Incoming {incomingCall.callType === 'video' ? 'video' : 'audio'} call from {incomingCall.fromName}
        </DialogTitle>
        <DialogDescription className="sr-only">
          You have an incoming {incomingCall.callType === 'video' ? 'video' : 'audio'} call from {incomingCall.fromName}. You can accept or decline the call.
        </DialogDescription>
        <div className="flex flex-col items-center gap-6 p-6">
          {/* Caller Avatar */}
          <div className="relative">
            <Avatar className="w-24 h-24 ring-4 ring-primary-200 dark:ring-primary-800 animate-pulse">
              <AvatarImage src={incomingCall.fromAvatar || undefined} alt={incomingCall.fromName} />
              <AvatarFallback className="bg-gradient-to-br from-primary-400 to-blue-500 text-white text-2xl font-bold">
                {getInitials(incomingCall.fromName)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center animate-bounce">
              {incomingCall.callType === 'video' ? (
                <Video className="w-4 h-4 text-white" />
              ) : (
                <Phone className="w-4 h-4 text-white" />
              )}
            </div>
          </div>

          {/* Caller Info */}
          <div className="text-center">
            <h3 className="text-xl font-semibold text-surface-900 dark:text-white mb-1">
              {incomingCall.fromName}
            </h3>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Incoming {incomingCall.callType === 'video' ? 'video' : 'audio'} call
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4 w-full">
            {/* Reject Button */}
            <Button
              variant="destructive"
              size="lg"
              className="flex-1 h-14 rounded-full"
              onClick={rejectCall}
            >
              <X className="w-5 h-5 mr-2" />
              Decline
            </Button>

            {/* Accept Button */}
            <Button
              variant="default"
              size="lg"
              className={cn(
                "flex-1 h-14 rounded-full",
                incomingCall.callType === 'video'
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-primary-500 hover:bg-primary-600"
              )}
              onClick={acceptCall}
            >
              <PhoneCall className="w-5 h-5 mr-2" />
              Accept
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

