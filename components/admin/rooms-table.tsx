// ================================
// Rooms Table Component
// ================================

"use client";

import { useState, useEffect } from "react";
import { Hash, Users, MessageSquare, Trash2, Eye, Search } from "lucide-react";
import { useSocket } from "@/hooks/use-socket";
import { apiClient } from "@/lib/api-client";
import { cn, getInitials, formatMessageTime } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    };
  }[];
  _count: {
    messages: number;
    participants: number;
  };
}

interface RoomsTableProps {
  initialRooms: Room[];
}

export function RoomsTable({ initialRooms }: RoomsTableProps) {
  const [rooms, setRooms] = useState(initialRooms);
  const [search, setSearch] = useState("");
  const [liveMessageCounts, setLiveMessageCounts] = useState<Record<string, number>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);

  // Use centralized socket hook
  const { socket } = useSocket({ emitUserConnect: true });

  // Real-time message count updates
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (message: MessagePayload) => {
      setLiveMessageCounts((prev) => ({
        ...prev,
        [message.roomId]: (prev[message.roomId] || 0) + 1,
      }));
    };

    socket.on("receive-message", handleReceiveMessage);

    return () => {
      socket.off("receive-message", handleReceiveMessage);
    };
  }, [socket]);

  // Update rooms with live counts
  const roomsWithLiveCounts = rooms.map((room) => ({
    ...room,
    liveMessageCount: liveMessageCounts[room.id] || 0,
    totalMessages: room._count.messages + (liveMessageCounts[room.id] || 0),
  }));

  const filteredRooms = roomsWithLiveCounts.filter(
    (room) =>
      room.name.toLowerCase().includes(search.toLowerCase()) ||
      room.owner.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDeleteClick = (roomId: string) => {
    setRoomToDelete(roomId);
    setDeleteDialogOpen(true);
  };

  const deleteRoom = async () => {
    if (!roomToDelete) return;

    try {
      await apiClient.delete(`/admin/rooms?roomId=${roomToDelete}`);
      setRooms((prev) => prev.filter((r) => r.id !== roomToDelete));
      setDeleteDialogOpen(false);
      setRoomToDelete(null);
    } catch (error) {
      console.error("Failed to delete room:", error);
    }
  };

  return (
    <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 overflow-hidden">
      {/* Search */}
      <div className="p-4 border-b border-surface-200 dark:border-surface-800">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search rooms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-semibold text-surface-500 uppercase">
                Room
              </TableHead>
              <TableHead className="text-xs font-semibold text-surface-500 uppercase">
                Type
              </TableHead>
              <TableHead className="text-xs font-semibold text-surface-500 uppercase">
                Owner
              </TableHead>
              <TableHead className="text-xs font-semibold text-surface-500 uppercase">
                Members
              </TableHead>
              <TableHead className="text-xs font-semibold text-surface-500 uppercase">
                Messages
              </TableHead>
              <TableHead className="text-xs font-semibold text-surface-500 uppercase">
                Created
              </TableHead>
              <TableHead className="text-right text-xs font-semibold text-surface-500 uppercase">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRooms.map((room) => (
              <TableRow
                key={room.id}
                className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
              >
                {/* Room Info */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold",
                        room.isGroup
                          ? "bg-gradient-to-br from-accent-400 to-pink-500"
                          : "bg-gradient-to-br from-primary-400 to-blue-500"
                      )}
                    >
                      {room.isGroup ? <Hash className="w-5 h-5" /> : getInitials(room.name)}
                    </div>
                    <div>
                      <p className="font-medium text-surface-900 dark:text-white">
                        {room.name}
                      </p>
                      {room.description && (
                        <p className="text-xs text-surface-500 truncate max-w-xs">
                          {room.description}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Type */}
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                      room.isGroup
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    )}
                  >
                    {room.isGroup ? <Users className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                    {room.isGroup ? "Group" : "DM"}
                  </span>
                </TableCell>

                {/* Owner */}
                <TableCell>
                  <p className="text-sm text-surface-900 dark:text-white">
                    {room.owner.name}
                  </p>
                  <p className="text-xs text-surface-500">{room.owner.email}</p>
                </TableCell>

                {/* Members */}
                <TableCell className="text-surface-600 dark:text-surface-300">
                  {room._count.participants}
                </TableCell>

                {/* Messages */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-surface-600 dark:text-surface-300">
                      {room.totalMessages}
                    </span>
                    {room.liveMessageCount > 0 && (
                      <span className="text-xs text-green-500 font-medium">
                        +{room.liveMessageCount}
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Created */}
                <TableCell className="text-sm text-surface-500">
                  {formatMessageTime(room.createdAt instanceof Date ? room.createdAt.toISOString() : room.createdAt)}
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/rooms/${room.id}`}
                      className="w-8 h-8 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center justify-center text-surface-500"
                      title="View details"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDeleteClick(room.id)}
                      className="w-8 h-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-red-500"
                      title="Delete room"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredRooms.length === 0 && (
        <div className="p-8 text-center text-surface-500">
          No rooms found
        </div>
      )}

      {/* Delete Confirmation Dialog */}
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
              onClick={deleteRoom}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

