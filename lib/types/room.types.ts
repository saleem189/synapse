// ================================
// Room Types
// ================================
// Shared TypeScript types for chat rooms

/**
 * Room participant role
 */
export type ParticipantRole = 'admin' | 'member';

/**
 * Import UserStatus from user.types to avoid duplication
 * Note: UserStatus is 'ONLINE' | 'OFFLINE' | 'AWAY' (uppercase, matches Prisma enum)
 */
import type { UserStatus } from './user.types';

/**
 * Room participant structure
 */
export interface Participant {
  id: string;
  name: string;
  avatar?: string | null;
  email?: string;
  status?: UserStatus;
  role?: ParticipantRole;
}

/**
 * Last message in a room
 */
export interface LastMessage {
  content: string;
  createdAt: string;
  senderName: string;
}

/**
 * Chat room structure (used in components)
 */
export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  isGroup: boolean;
  avatar?: string | null;
  lastMessage?: LastMessage;
  participants: Participant[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Create room request
 */
export interface CreateRoomRequest {
  name?: string;
  description?: string;
  isGroup: boolean;
  participantIds: string[];
}

/**
 * Room with metadata (for API responses)
 */
export interface RoomResponse extends ChatRoom {
  ownerId?: string;
  unreadCount?: number;
  isFavorite?: boolean;
  isMuted?: boolean;
  mutedUntil?: string | null;
}

