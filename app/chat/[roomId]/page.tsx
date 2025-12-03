// ================================
// Chat Room Page (Dynamic Route)
// ================================
// Individual chat room with messages and input

import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ChatRoom } from "@/components/chat/chat-room";

interface ChatRoomPageProps {
  params: {
    roomId: string;
  };
}

// Fetch room data and messages
async function getRoomData(roomId: string, userId: string) {
  // Find the room with participants and messages
  const room = await prisma.chatRoom.findFirst({
    where: {
      id: roomId,
      participants: {
        some: {
          userId: userId,
        },
      },
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              status: true,
              lastSeen: true,
            },
          },
        },
      },
      owner: {
        select: {
          id: true,
        },
      },
      messages: {
        orderBy: {
          createdAt: "asc",
        },
        take: 100, // Load last 100 messages
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          reactions: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
            },
          },
          readReceipts: {
            where: {
              userId: userId,
            },
          },
          replyTo: {
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return room;
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

  // Fetch room data
  const room = await getRoomData(params.roomId, session.user.id);

  // If room not found or user is not a participant
  if (!room) {
    notFound();
  }

  // Transform messages for the client component
  const messages = room.messages.map((message) => {
    // Group reactions by emoji
    const reactionsByEmoji = message.reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = [];
      }
      acc[reaction.emoji].push({
        id: reaction.user.id,
        name: reaction.user.name,
        avatar: reaction.user.avatar,
      });
      return acc;
    }, {} as Record<string, Array<{ id: string; name: string; avatar: string | null }>>);

    return {
      id: message.id,
      content: message.content,
      type: message.type,
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
      createdAt: message.createdAt.toISOString(),
      senderId: message.senderId,
      senderName: message.sender.name,
      senderAvatar: message.sender.avatar,
      roomId: message.roomId,
    };
  });

  // Get other participants for DM display name
  const otherParticipants = room.participants.filter(
    (p) => p.user.id !== session.user.id
  );

  // Room display name (for DMs, show other user's name)
  const displayName = room.isGroup
    ? room.name
    : otherParticipants[0]?.user.name || room.name;

  return (
    <ChatRoom
      roomId={room.id}
      roomName={displayName}
      isGroup={room.isGroup}
      participants={room.participants.map((p) => ({
        id: p.user.id,
        name: p.user.name,
        avatar: p.user.avatar,
        status: p.user.status,
        lastSeen: p.user.lastSeen?.toISOString(),
        role: p.role, // "admin" or "member" in RoomParticipant
        isOwner: room.owner.id === p.user.id,
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

