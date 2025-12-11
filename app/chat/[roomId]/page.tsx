// ================================
// Chat Room Page (Dynamic Route)
// ================================
// Individual chat room with messages and input

import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ChatRoom } from "@/components/chat/chat-room";
import { toISOString } from "@/lib/utils/date-helpers";
import type { IRoomService } from "@/lib/di/service-interfaces";
import type { MessageType } from "@/lib/types/message.types";

interface ChatRoomPageProps {
  params: Promise<{
    roomId: string;
  }>;
}

// Fetch room data and messages using service layer
async function getRoomData(roomId: string, userId: string) {
  const { getService } = await import('@/lib/di');
  const roomService = await getService<IRoomService>('roomService');
  return await roomService.getRoomWithMessages(roomId, userId, 100);
}

export default async function ChatRoomPage({ params }: ChatRoomPageProps) {
  // Get current user session
  const session = await getServerSession(authOptions);

  if (!session) {
    notFound();
  }

  // Redirect admins to admin dashboard
  if (session.user.role === "ADMIN") {
    redirect("/admin");
  }

  // Await params (Next.js 16 requirement)
  const { roomId } = await params;

  // Fetch room data
  const room = await getRoomData(roomId, session.user.id);

  // If room not found or user is not a participant
  if (!room) {
    notFound();
  }


  // Transform messages for the client component
  const messages = room.messages.map((message: {
    id: string;
    content: string;
    type: string;
    fileUrl: string | null;
    fileName: string | null;
    fileSize: number | null;
    fileType: string | null;
    isEdited: boolean;
    isDeleted: boolean;
    replyToId: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
    senderId: string;
    roomId: string;
    sender: { id: string; name: string; avatar: string | null };
    reactions: Array<{ emoji: string; user: { id: string; name: string; avatar: string | null } }>;
    readReceipts: Array<{ id: string; userId: string; readAt: Date | string }>;
    replyTo: { id: string; content: string; sender: { id: string; name: string; avatar: string | null } } | null;
  }) => {
    // Group reactions by emoji
    const reactionsByEmoji = message.reactions.reduce((acc: Record<string, Array<{ id: string; name: string; avatar: string | null }>>, reaction: { emoji: string; user: { id: string; name: string; avatar: string | null } }) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = [];
      }
      acc[reaction.emoji].push({
        id: reaction.user.id,
        name: reaction.user.name,
        avatar: reaction.user.avatar,
      });
      return acc;
    }, {});

    return {
      id: message.id,
      content: message.content,
      type: message.type as MessageType,
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      fileSize: message.fileSize,
      fileType: message.fileType,
      isEdited: message.isEdited,
      isDeleted: message.isDeleted,
      replyToId: message.replyToId,
      replyTo: message.replyTo ? {
        id: message.replyTo.id,
        content: message.replyTo.content,
        senderName: message.replyTo.sender.name,
        senderAvatar: message.replyTo.sender.avatar,
      } : null,
      reactions: reactionsByEmoji,
      isRead: message.readReceipts.length > 0,
      createdAt: toISOString(message.createdAt)!, // Always returns string with default fallback
      senderId: message.senderId,
      senderName: message.sender.name,
      senderAvatar: message.sender.avatar,
      roomId: message.roomId,
    };
  });

  // Get other participants for DM display name
  const otherParticipants = room.participants.filter(
    (p: { user: { id: string } }) => p.user.id !== session.user.id
  );

  // Room display name (for DMs, show other user's name)
  const displayName = room.isGroup
    ? room.name
    : otherParticipants[0]?.user.name || room.name;

  // Safety check for owner
  if (!room.owner || !room.owner.id) {
    notFound();
  }

  return (
    <ChatRoom
      roomId={room.id}
      roomName={displayName}
      isGroup={room.isGroup}
      participants={room.participants.map((p: {
        user: { id: string; name: string; avatar: string | null; status: string; lastSeen?: Date | string };
        role: string;
      }) => ({
        id: p.user.id,
        name: p.user.name,
        avatar: p.user.avatar,
        status: p.user.status,
        lastSeen: toISOString(p.user.lastSeen),
        role: p.role, // "admin" or "member" in RoomParticipant
        isOwner: room.owner?.id === p.user.id,
      }))}
      roomOwnerId={room.owner.id}
      roomData={{
        id: room.id,
        name: room.name,
        description: room.description,
        avatar: room.avatar,
        isGroup: room.isGroup,
      }}
      initialMessages={messages}
    />
  );
}

