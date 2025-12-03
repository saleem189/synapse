// ================================
// Common Select Patterns
// ================================
// Centralized select objects to avoid duplication and ensure consistency

/**
 * Basic user select (id, name, avatar)
 */
export const USER_SELECT = {
  id: true,
  name: true,
  avatar: true,
} as const;

/**
 * Extended user select (includes email and status)
 */
export const USER_SELECT_WITH_EMAIL = {
  ...USER_SELECT,
  email: true,
  status: true,
} as const;

/**
 * Message include pattern with sender
 */
export const MESSAGE_INCLUDE_SENDER = {
  sender: {
    select: USER_SELECT,
  },
} as const;

/**
 * Message include pattern with all relations
 */
export const MESSAGE_INCLUDE_FULL = {
  sender: {
    select: USER_SELECT,
  },
  replyTo: {
    include: {
      sender: {
        select: USER_SELECT,
      },
    },
  },
  reactions: {
    include: {
      user: {
        select: USER_SELECT,
      },
    },
  },
  readReceipts: true,
} as const;

/**
 * Room owner select
 */
export const ROOM_OWNER_SELECT = {
  id: true,
  name: true,
  avatar: true,
} as const;

/**
 * Room participant include pattern
 */
export const ROOM_PARTICIPANT_INCLUDE = {
  user: {
    select: USER_SELECT_WITH_EMAIL,
  },
} as const;

