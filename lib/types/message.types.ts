// ================================
// Message Types
// ================================
// Shared TypeScript types for messages

/**
 * Message status for optimistic UI updates
 */
export type MessageStatus = 'sending' | 'sent' | 'failed';

/**
 * Message type (matches Prisma MessageType enum)
 */
export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'AUDIO';

/**
 * Reply to message structure
 */
export interface ReplyToMessage {
  id: string;
  content: string;
  senderName: string;
  senderAvatar?: string | null;
}

/**
 * Message reaction structure
 */
export interface MessageReactionUser {
  id: string;
  name: string;
  avatar: string | null;
}

/**
 * Grouped reactions by emoji
 */
export type MessageReactions = Record<string, MessageReactionUser[]>;

/**
 * Complete message interface (used in components)
 */
export interface Message {
  id: string;
  content: string;
  type: MessageType;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileType?: string | null;
  isEdited?: boolean;
  isDeleted?: boolean;
  replyToId?: string | null;
  status?: MessageStatus;
  replyTo?: ReplyToMessage | null;
  reactions?: MessageReactions;
  isRead?: boolean;
  isDelivered?: boolean;
  createdAt: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  roomId: string;
}

/**
 * Message payload for socket communication
 */
export interface MessagePayload {
  id?: string;
  content: string;
  senderId: string;
  senderName: string;
  roomId: string;
  type?: MessageType;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  replyToId?: string | null;
  replyTo?: ReplyToMessage | null;
  reactions?: MessageReactions;
  isRead?: boolean;
  createdAt?: string;
}

/**
 * Paginated messages response
 */
export interface PaginatedMessages {
  messages: Message[];
  hasMore: boolean;
  nextCursor?: string;
}

