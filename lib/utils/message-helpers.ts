// ================================
// Message Helper Functions
// ================================
// Utility functions for message creation and transformation

import type { Message, MessageType } from '@/lib/types/message.types';
import type { MessagePayload } from '@/lib/socket';

interface ReplyTo {
  id: string;
  content: string;
  senderName: string;
  senderAvatar?: string | null;
}

interface User {
  id: string;
  name: string;
}

/**
 * Create a Message object from a MessagePayload
 */
export function createMessageFromPayload(
  payload: MessagePayload,
  recipientOnline: boolean = false
): Message {
  const replyTo = payload.replyTo ? {
    id: payload.replyTo.id,
    content: payload.replyTo.content || "Media",
    senderName: payload.replyTo.senderName,
    senderAvatar: payload.replyTo.senderAvatar || null,
  } : null;

  // Normalize message type to uppercase enum value
  const normalizeMessageType = (type?: string): MessageType => {
    if (!type) return 'TEXT';
    const upper = type.toUpperCase();
    if (['TEXT', 'IMAGE', 'VIDEO', 'FILE', 'AUDIO'].includes(upper)) {
      return upper as MessageType;
    }
    return 'TEXT'; // Default fallback
  };

  return {
    id: payload.id || crypto.randomUUID(),
    content: payload.content,
    type: normalizeMessageType(payload.type),
    fileUrl: payload.fileUrl || null,
    fileName: payload.fileName || null,
    fileSize: payload.fileSize || null,
    fileType: payload.fileType || null,
    isEdited: payload.isEdited || false,
    isDeleted: payload.isDeleted || false,
    replyToId: payload.replyToId || null,
    replyTo,
    reactions: payload.reactions || {},
    isRead: false,
    isDelivered: recipientOnline || payload.isDelivered || false,
    status: "sent" as const,
    createdAt: payload.createdAt || new Date().toISOString(),
    senderId: payload.senderId,
    senderName: payload.senderName,
    senderAvatar: null,
    roomId: payload.roomId,
  };
}

/**
 * Create an optimistic message for sending
 */
export function createOptimisticMessage(
  content: string,
  roomId: string,
  senderId: string,
  senderName: string,
  fileData?: {
    url: string;
    fileName: string;
    fileSize: number;
    fileType: string;
  },
  replyTo?: ReplyTo | null,
  recipientOnline: boolean = false
): Message {
  // Determine message type and normalize to uppercase enum value
  const messageType: MessageType = fileData
    ? fileData.fileType.startsWith("image/")
      ? "IMAGE"
      : fileData.fileType.startsWith("video/")
      ? "VIDEO"
      : fileData.fileType.startsWith("audio/")
      ? "AUDIO"
      : "FILE"
    : "TEXT";

  return {
    id: `temp_${Date.now()}`,
    content: content || "",
    type: messageType,
    fileUrl: fileData?.url || null,
    fileName: fileData?.fileName || null,
    fileSize: fileData?.fileSize || null,
    fileType: fileData?.fileType || null,
    isEdited: false,
    isDeleted: false,
    replyToId: replyTo?.id || null,
    replyTo: replyTo ? {
      id: replyTo.id,
      content: replyTo.content,
      senderName: replyTo.senderName,
      senderAvatar: replyTo.senderAvatar || null,
    } : null,
    reactions: {},
    isRead: false,
    isDelivered: recipientOnline,
    status: "sending",
    createdAt: new Date().toISOString(),
    senderId,
    senderName,
    senderAvatar: null,
    roomId,
  };
}

