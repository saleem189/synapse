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
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
      console.error("Error removing member:", error);
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
      console.error("Error updating admin:", error);
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
        <h3 className="text-lg font-semibold text-surface-900 dark:text-white flex items-center gap-2">
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
          <p className="text-xs font-semibold text-surface-500 mb-2 uppercase tracking-wide">
            Admins ({admins.length})
          </p>
          <div className="space-y-2">
            {admins.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-10 h-10 bg-gradient-to-br from-primary-400 to-blue-500">
                      <AvatarImage src={participant.avatar || undefined} alt={participant.name} />
                      <AvatarFallback className="bg-gradient-to-br from-primary-400 to-blue-500 text-white text-sm font-semibold">
                        {getInitials(participant.name)}
                      </AvatarFallback>
                    </Avatar>
                    {participant.isOwner && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-white dark:border-surface-900">
                        <Crown className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-surface-900 dark:text-white flex items-center gap-1">
                      {participant.name}
                      {participant.isOwner && (
                        <span className="text-xs text-surface-500">(Owner)</span>
                      )}
                    </p>
                    <p className="text-xs text-surface-500">
                      {participant.status === "online" ? "Online" : "Offline"}
                    </p>
                  </div>
                </div>
                {isRoomAdmin && participant.id !== currentUserId && !participant.isOwner && (
                  <button
                    onClick={() => handleToggleAdminClick(participant.id, true)}
                    className="opacity-0 group-hover:opacity-100 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                  >
                    Remove Admin
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members Section */}
      {members.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-surface-500 mb-2 uppercase tracking-wide">
            Members ({members.length})
          </p>
          <div className="space-y-2">
            {members.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 bg-gradient-to-br from-primary-400 to-blue-500">
                    <AvatarImage src={participant.avatar || undefined} alt={participant.name} />
                    <AvatarFallback className="bg-gradient-to-br from-primary-400 to-blue-500 text-white text-sm font-semibold">
                      {getInitials(participant.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm text-surface-900 dark:text-white">
                      {participant.name}
                    </p>
                    <p className="text-xs text-surface-500">
                      {participant.status === "online" ? "Online" : "Offline"}
                    </p>
                  </div>
                </div>
                {isRoomAdmin && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    {isGroup && (
                      <button
                        onClick={() => handleToggleAdminClick(participant.id, false)}
                        className="px-3 py-1.5 text-xs text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                        title="Make admin"
                      >
                        <Shield className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveMemberClick(participant.id, participant.name)}
                      className="px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Remove member"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Member Modal would go here */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 max-w-md w-full">
            <p className="text-center text-surface-500">
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

