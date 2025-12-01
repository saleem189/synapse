// ================================
// Application Constants
// ================================
// Centralized constants to avoid magic numbers and strings

/**
 * Socket.IO Event Names
 */
export const SOCKET_EVENTS = {
  // Client to Server
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  SEND_MESSAGE: 'send-message',
  MESSAGE_UPDATED: 'message-updated',
  MESSAGE_DELETED: 'message-deleted',
  MESSAGE_READ: 'message-read',
  MESSAGE_DELIVERED: 'message-delivered',
  TYPING: 'typing',
  STOP_TYPING: 'stop-typing',
  USER_CONNECT: 'user-connect',
  GET_ONLINE_USERS: 'get-online-users',
  
  // Server to Client
  RECEIVE_MESSAGE: 'receive-message',
  USER_JOINED: 'user-joined',
  USER_LEFT: 'user-left',
  USER_TYPING: 'user-typing',
  USER_STOP_TYPING: 'user-stop-typing',
  USER_ONLINE: 'user-online',
  USER_OFFLINE: 'user-offline',
  ONLINE_USERS: 'online-users',
  MESSAGE_READ_UPDATE: 'message-read-update',
  MESSAGE_DELIVERED_UPDATE: 'message-delivered-update',
  MESSAGE_UPDATED_EVENT: 'message-updated',
  MESSAGE_DELETED_EVENT: 'message-deleted',
  REACTION_UPDATED: 'reaction-updated',
  ERROR: 'error',
} as const;

/**
 * Timeout Constants (in milliseconds)
 */
export const TIMEOUTS = {
  // Typing indicator timeout
  TYPING: 5000, // 5 seconds
  
  // Socket connection timeout
  SOCKET_CONNECTION: 20000, // 20 seconds
  
  // Message matching window (for optimistic updates)
  MESSAGE_MATCH: 5000, // 5 seconds
  
  // Scroll delay
  SCROLL_DELAY: 100, // 100ms
  
  // Auto-clear typing indicator
  TYPING_AUTO_CLEAR: 5000, // 5 seconds
  
  // Debounce delay for read receipts
  READ_RECEIPT_DEBOUNCE: 1000, // 1 second
  
  // Online users request debounce
  ONLINE_USERS_DEBOUNCE: 1000, // 1 second
} as const;

/**
 * Rate Limiting Constants
 */
export const RATE_LIMITS = {
  MESSAGES_PER_MINUTE: 20,
  API_REQUESTS_PER_MINUTE: 100,
  AUTH_ATTEMPTS_PER_MINUTE: 5,
  UPLOADS_PER_MINUTE: 10,
} as const;

/**
 * Message Constants
 */
export const MESSAGE = {
  MAX_CONTENT_LENGTH: 5000, // characters
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB in bytes
  PAGINATION_LIMIT: 50, // messages per page
  INITIAL_LOAD_LIMIT: 100, // initial messages to load
} as const;

/**
 * File Upload Constants
 */
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/ogg'],
  ALLOWED_AUDIO_TYPES: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
} as const;

/**
 * Room Constants
 */
export const ROOM = {
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_PARTICIPANTS: 100, // for group chats
} as const;

/**
 * User Constants
 */
export const USER = {
  MAX_NAME_LENGTH: 50,
  MIN_PASSWORD_LENGTH: 8,
} as const;

/**
 * API Response Status Codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMIT_EXCEEDED: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Message Status Types
 */
export const MESSAGE_STATUS = {
  SENDING: 'sending',
  SENT: 'sent',
  FAILED: 'failed',
} as const;

/**
 * Message Types
 */
export const MESSAGE_TYPE = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  FILE: 'file',
  AUDIO: 'audio',
} as const;

/**
 * User Roles
 */
export const USER_ROLE = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

/**
 * Room Participant Roles
 */
export const PARTICIPANT_ROLE = {
  MEMBER: 'member',
  ADMIN: 'admin',
} as const;

/**
 * User Status
 */
export const USER_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  AWAY: 'away',
  BUSY: 'busy',
} as const;

