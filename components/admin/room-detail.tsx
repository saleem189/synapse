// ================================
// Room Detail Component
// ================================

"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Hash, Users, MessageSquare, Trash2, Calendar } from "lucide-react";
import { getInitials, formatMessageTime } from "@/lib/utils";
import { useOnlineUsers } from "@/hooks/use-online-users";
import { useSocket } from "@/hooks/use-socket";
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
import Link from "next/link";
import type { MessagePayload } from "@/lib/socket";

interface Room {
  id: string;
  name: string;
  description: string | null;
  isGroup: boolean;
  createdAt: Date;
  updatedAt: Date;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  participants: {
    user: {
      id: string;
      name: string;
      email: string;
      status: string;
    };
  }[];
  messages: {
    id: string;
    content: string;
    createdAt: Date;
    sender: {
      id: string;
      name: string;
      email: string;
    };
  }[];
  _count: {
    messages: number;
  };
}

interface RoomDetailProps {
  room: Room;
}

export function RoomDetail({ room: initialRoom }: RoomDetailProps) {
  const [room, setRoom] = useState(initialRoom);
  const [liveMessages, setLiveMessages] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Use centralized online users hook
  const { onlineUserIds } = useOnlineUsers();
  
  // Filter online participants for this room
  const roomUserIds = room.participants.map((p) => p.user.id);
  const onlineParticipants = new Set(
    Array.from(onlineUserIds).filter((id) => roomUserIds.includes(id))
  );

  // Use centralized socket hook
  const { socket } = useSocket({ emitUserConnect: true });

  // Real-time updates for messages only
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (message: MessagePayload) => {
      if (message.roomId === room.id) {
        setLiveMessages((prev) => prev + 1);
        setRoom((prev) => ({
          ...prev,
          _count: {
            messages: prev._count.messages + 1,
          },
        }));
      }
    };

    socket.on("receive-message", handleReceiveMessage);

    return () => {
      socket.off("receive-message", handleReceiveMessage);
    };
  }, [socket, room.id]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/rooms"
          className="w-10 h-10 rounded-lg hover:bg-accent flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Room Details
          </h1>
          <p className="text-muted-foreground">
            View and manage room information
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Room Info Card */}
          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="flex items-start gap-4 mb-6">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold ${
                  room.isGroup
                    ? "bg-gradient-to-br from-accent-400 to-pink-500"
                    : "bg-gradient-to-br from-primary-400 to-blue-500"
                }`}
              >
                {room.isGroup ? <Hash className="w-8 h-8" /> : getInitials(room.name)}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground mb-1">
                  {room.name}
                </h2>
                {room.description && (
                  <p className="text-muted-foreground">
                    {room.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    {room._count.messages + liveMessages} messages
                    {liveMessages > 0 && (
                      <span className="text-green-500">(+{liveMessages})</span>
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {room.participants.length} members
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Owner</p>
                <p className="font-medium text-foreground">
                  {room.owner.name}
                </p>
                <p className="text-sm text-muted-foreground">{room.owner.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Created</p>
                <p className="font-medium text-foreground">
                  {formatMessageTime(room.createdAt instanceof Date ? room.createdAt.toISOString() : room.createdAt)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {new Date(room.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Recent Messages */}
          <div className="bg-card rounded-2xl p-6 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Recent Messages ({room.messages.length})
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {room.messages.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No messages yet</p>
              ) : (
                room.messages.map((message) => (
                  <div
                    key={message.id}
                    className="p-3 rounded-lg bg-muted"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-xs font-semibold">
                        {getInitials(message.sender.name)}
                      </div>
                      <span className="font-medium text-sm text-foreground">
                        {message.sender.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatMessageTime(message.createdAt instanceof Date ? message.createdAt.toISOString() : message.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">
                      {message.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Participants */}
          <div className="bg-card rounded-2xl p-6 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Participants ({room.participants.length})
            </h3>
            <div className="space-y-3">
              {room.participants.map((participant) => {
                const isOnline = onlineParticipants.has(participant.user.id);
                return (
                  <div
                    key={participant.user.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent"
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-sm font-semibold">
                        {getInitials(participant.user.name)}
                      </div>
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {participant.user.name}
                        {participant.user.id === room.owner.id && (
                          <span className="text-xs text-muted-foreground ml-1">(Owner)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {participant.user.email}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        isOnline
                          ? "bg-green-100/20 text-green-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-card rounded-2xl p-6 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Actions
            </h3>
            <button
              onClick={() => setDeleteDialogOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Room
            </button>
          </div>
        </div>
      </div>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Room</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this room? All messages will be lost. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                // Handle delete
                setDeleteDialogOpen(false);
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

