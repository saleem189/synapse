// ================================
// Room Members Panel Component
// ================================
// Shows members and allows room admins to manage them

"use client";

import { useState } from "react";
import { Users, Crown, Shield, UserMinus, UserPlus, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { cn, getInitials } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Participant {
  id: string;
  name: string;
  avatar?: string | null;
  status: string;
  role: string; // "admin" or "member" in RoomParticipant
  isOwner?: boolean;
}

interface RoomMembersPanelProps {
  roomId: string;
  participants: Participant[];
  currentUserId: string;
  isRoomAdmin: boolean; // Whether current user is room admin
  isGroup: boolean;
  onUpdate: () => void;
}

export function RoomMembersPanel({
  roomId,
  participants,
  currentUserId,
  isRoomAdmin,
  isGroup,
  onUpdate,
}: RoomMembersPanelProps) {
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [adminAction, setAdminAction] = useState<{ userId: string; isCurrentlyAdmin: boolean } | null>(null);

  const handleRemoveMemberClick = (userId: string, userName: string) => {
    setMemberToRemove({ id: userId, name: userName });
    setRemoveMemberDialogOpen(true);
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      await apiClient.delete(`/rooms/${roomId}/members?userId=${memberToRemove.id}`);
      onUpdate();
      setRemoveMemberDialogOpen(false);
      setMemberToRemove(null);
    } catch (error) {
      logger.error("Error removing member", error instanceof Error ? error : new Error(String(error)), {
        component: 'RoomMembersPanel',
        roomId,
        memberId: memberToRemove?.id,
      });
      toast.error("An error occurred. Please try again.");
    }
  };

  const handleToggleAdminClick = (userId: string, isCurrentlyAdmin: boolean) => {
    setAdminAction({ userId, isCurrentlyAdmin });
    setAdminDialogOpen(true);
  };

  const handleToggleAdmin = async () => {
    if (!adminAction) return;

    try {
      await apiClient.post(`/rooms/${roomId}/admin`, {
        userId: adminAction.userId,
        isAdmin: !adminAction.isCurrentlyAdmin,
      });
      onUpdate();
      setAdminDialogOpen(false);
      setAdminAction(null);
    } catch (error) {
      logger.error("Error updating admin", error instanceof Error ? error : new Error(String(error)), {
        component: 'RoomMembersPanel',
        roomId,
        userId: adminAction?.userId,
        isAdmin: !adminAction?.isCurrentlyAdmin,
      });
      toast.error("An error occurred. Please try again.");
    }
  };

  // Separate admins and members
  const admins = participants.filter((p) => p.role === "admin" || p.isOwner);
  const members = participants.filter((p) => p.role !== "admin" && !p.isOwner);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5" />
          Members ({participants.length})
        </h3>
        {isRoomAdmin && isGroup && (
          <Button
            onClick={() => setShowAddMember(true)}
            variant="default"
            size="sm"
            className="flex items-center gap-1"
          >
            <UserPlus className="w-4 h-4" />
            Add
          </Button>
        )}
      </div>

      {/* Admins Section */}
      {admins.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            Admins ({admins.length})
          </p>
          <div className="space-y-2">
            {admins.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors group"
              >
                <HoverCard openDelay={200} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <button type="button" className="flex items-center gap-3 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg w-full text-left">
                      <div className="relative">
                        <UserAvatar
                          name={participant.name}
                          src={participant.avatar}
                          size="md"
                        />
                        {participant.isOwner && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-background">
                            <Crown className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground flex items-center gap-1">
                          {participant.name}
                          {participant.isOwner && (
                            <span className="text-xs text-muted-foreground">(Owner)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {participant.status === "online" ? "Online" : "Offline"}
                        </p>
                      </div>
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80" side="right" align="start">
                    <div className="flex justify-between space-x-4">
                      <UserAvatar
                        name={participant.name}
                        src={participant.avatar}
                        size="lg"
                      />
                      <div className="space-y-1 flex-1">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          {participant.name}
                          {participant.isOwner && (
                            <Crown className="w-4 h-4 text-yellow-500" />
                          )}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {participant.email || "Synapse User"}
                        </p>
                        <div className="flex items-center gap-2 pt-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            participant.status === "online"
                              ? "bg-green-100/20 text-green-600"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {participant.status === "online" ? "Online" : "Offline"}
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                            Admin
                          </span>
                          {participant.isOwner && (
                            <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-600">
                              Owner
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
                {isRoomAdmin && participant.id !== currentUserId && !participant.isOwner && (
                  <Button
                    onClick={() => handleToggleAdminClick(participant.id, true)}
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10"
                  >
                    Remove Admin
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members Section */}
      {members.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            Members ({members.length})
          </p>
          <div className="space-y-2">
            {members.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors group"
              >
                <HoverCard key={`hover-member-${participant.id}`} openDelay={200} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <button type="button" className="flex items-center gap-3 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg w-full text-left">
                      <UserAvatar
                        name={participant.name}
                        src={participant.avatar}
                        size="md"
                      />
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          {participant.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {participant.status === "online" ? "Online" : "Offline"}
                        </p>
                      </div>
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80" side="right" align="start">
                    <div className="flex justify-between space-x-4">
                      <UserAvatar
                        name={participant.name}
                        src={participant.avatar}
                        size="lg"
                      />
                      <div className="space-y-1 flex-1">
                        <h4 className="text-sm font-semibold">{participant.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {participant.email || "Synapse User"}
                        </p>
                        <div className="flex items-center pt-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            participant.status === "online"
                              ? "bg-green-100/20 text-green-600"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {participant.status === "online" ? "Online" : "Offline"}
                          </span>
                          {participant.role === "admin" && (
                            <span className="ml-2 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                              Admin
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
                {isRoomAdmin && (
                  <TooltipProvider>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      {isGroup && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={() => handleToggleAdminClick(participant.id, false)}
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:bg-primary/10"
                            >
                              <Shield className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Make admin</TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={() => handleRemoveMemberClick(participant.id, participant.name)}
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Remove member</TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Member Modal would go here */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background rounded-2xl p-6 max-w-md w-full">
            <p className="text-center text-muted-foreground">
              Add member feature - Coming soon!
            </p>
            <Button
              onClick={() => setShowAddMember(false)}
              variant="default"
              className="w-full mt-4"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog open={removeMemberDialogOpen} onOpenChange={setRemoveMemberDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberToRemove?.name} from this {isGroup ? "group" : "chat"}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toggle Admin Confirmation Dialog */}
      <AlertDialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {adminAction?.isCurrentlyAdmin ? "Remove Admin" : "Make Admin"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {adminAction?.isCurrentlyAdmin ? "remove admin from" : "make admin"} this user?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleAdmin}
            >
              {adminAction?.isCurrentlyAdmin ? "Remove Admin" : "Make Admin"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

