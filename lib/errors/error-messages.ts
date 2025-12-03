// ================================
// Error Messages
// ================================
// Centralized error messages for consistency across the application

export const ERROR_MESSAGES = {
  // Authentication & Authorization
  NOT_AUTHENTICATED: 'You must be logged in',
  ACCESS_DENIED: 'Access denied',
  NOT_PARTICIPANT: 'You are not a participant in this room',
  NOT_MEMBER: 'You are not a member of this room',
  ADMIN_REQUIRED: 'Admin access required',
  ROOM_ADMIN_REQUIRED: 'Only room admins can perform this action',
  
  // Not Found
  MESSAGE_NOT_FOUND: 'Message not found',
  ROOM_NOT_FOUND: 'Room not found',
  USER_NOT_FOUND: 'User not found',
  REPLY_MESSAGE_NOT_FOUND: 'Reply message not found',
  
  // Validation
  ROOM_ID_REQUIRED: 'Room ID is required',
  USER_ID_REQUIRED: 'User ID is required',
  INVALID_MESSAGE_DATA: 'Invalid message data',
  INVALID_EMOJI: 'Invalid emoji',
  MESSAGE_CONTENT_TOO_LONG: 'Message content exceeds maximum length',
  PAYLOAD_TOO_LARGE: 'Payload too large',
  SEARCH_QUERY_TOO_SHORT: 'Search query must be at least 2 characters',
  GROUP_NAME_REQUIRED: 'Group name is required (min 2 characters)',
  PARTICIPANTS_REQUIRED: 'Select at least one participant',
  INVALID_PARTICIPANT_IDS: 'Invalid participant IDs',
  
  // Business Logic
  CANNOT_REMOVE_OWNER: 'Cannot remove room owner',
  OWNER_CANNOT_LEAVE: 'Room owner cannot leave. Transfer ownership first.',
  CAN_ONLY_EDIT_OWN: 'You can only edit your own messages',
  CAN_ONLY_DELETE_OWN: 'You can only delete your own messages',
  REPLY_SAME_ROOM: 'Reply message must be in the same room',
  CAN_ONLY_ADD_TO_GROUP: 'Can only add members to group chats',
  
  // Configuration
  CONFIG_KEY_NOT_FOUND: 'Config key not found',
  
  // Push Notifications
  VAPID_KEYS_NOT_FOUND: 'VAPID keys not found. Push notifications will not work.',
  INVALID_SUBSCRIPTION: 'Invalid subscription data',
  
} as const;

