// ================================
// Focus Mode Room Filtering
// ================================
// Utility functions for filtering rooms in focus mode

/**
 * Room interface for filtering
 */
interface Room {
  id: string;
  isGroup: boolean;
  isFavorite?: boolean;
  unreadCount?: number;
}

/**
 * Filter rooms for focus mode
 * Shows only:
 * - Favorited channels
 * - Channels with unread messages
 * - Direct messages (1-on-1)
 */
export function filterRoomsForFocusMode<T extends Room>(rooms: T[]): T[] {
  return rooms.filter((room) => {
    // Always show favorited rooms
    if (room.isFavorite) return true;
    
    // Always show rooms with unread messages
    if (room.unreadCount && room.unreadCount > 0) return true;
    
    // Always show DMs (non-group rooms)
    if (!room.isGroup) return true;
    
    // Hide everything else
    return false;
  });
}

/**
 * Get count of hidden rooms in focus mode
 */
export function getHiddenRoomsCount<T extends Room>(
  allRooms: T[],
  focusedRooms: T[]
): number {
  return allRooms.length - focusedRooms.length;
}

