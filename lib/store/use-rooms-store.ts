// ================================
// Rooms Store
// ================================
// Global state management for chat rooms using Zustand

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ChatRoom, RoomResponse, LastMessage } from '@/lib/types';

// Type for rooms in the store (compatible with ChatRoomItem from components)
export type RoomStoreItem = RoomResponse;

interface RoomsStore {
  rooms: RoomStoreItem[];
  setRooms: (rooms: RoomStoreItem[]) => void;
  addRoom: (room: RoomStoreItem) => void;
  updateRoom: (roomId: string, updates: Partial<RoomStoreItem>) => void;
  removeRoom: (roomId: string) => void;
  updateRoomLastMessage: (roomId: string, lastMessage: LastMessage) => void;
  incrementUnreadCount: (roomId: string) => void;
  clearUnreadCount: (roomId: string) => void;
  getRoomById: (roomId: string) => RoomStoreItem | undefined;
}

/**
 * Global rooms store
 * Manages list of chat rooms with real-time updates
 * Includes DevTools support for debugging
 */
export const useRoomsStore = create<RoomsStore>()(
  devtools(
    (set, get) => ({
  rooms: [],
  
  setRooms: (rooms) => set({ rooms }, false, 'setRooms'),
  
  addRoom: (room) =>
    set(
      (state) => {
        // Check if room already exists
        if (state.rooms.some((r) => r.id === room.id)) {
          return state;
        }
        return { rooms: [room, ...state.rooms] };
      },
      false,
      `addRoom/${room.id}`
    ),
  
  updateRoom: (roomId, updates) =>
    set(
      (state) => ({
        rooms: state.rooms.map((room) =>
          room.id === roomId ? { ...room, ...updates } : room
        ),
      }),
      false,
      `updateRoom/${roomId}`
    ),
  
  removeRoom: (roomId) =>
    set(
      (state) => ({
        rooms: state.rooms.filter((room) => room.id !== roomId),
      }),
      false,
      `removeRoom/${roomId}`
    ),
  
  updateRoomLastMessage: (roomId, lastMessage) =>
    set(
      (state) => {
        const roomIndex = state.rooms.findIndex((r) => r.id === roomId);
        if (roomIndex === -1) return state;
        
        // Update room and move to top
        const updatedRoom = { ...state.rooms[roomIndex], lastMessage };
        const otherRooms = state.rooms.filter((r) => r.id !== roomId);
        return { rooms: [updatedRoom, ...otherRooms] };
      },
      false,
      `updateRoomLastMessage/${roomId}`
    ),
  
  incrementUnreadCount: (roomId) =>
    set(
      (state) => ({
        rooms: state.rooms.map((room) =>
          room.id === roomId
            ? { ...room, unreadCount: (room.unreadCount || 0) + 1 }
            : room
        ),
      }),
      false,
      `incrementUnreadCount/${roomId}`
    ),
  
  clearUnreadCount: (roomId) =>
    set(
      (state) => ({
        rooms: state.rooms.map((room) =>
          room.id === roomId ? { ...room, unreadCount: 0 } : room
        ),
      }),
      false,
      `clearUnreadCount/${roomId}`
    ),
  
  getRoomById: (roomId) => {
    return get().rooms.find((room) => room.id === roomId);
  },
    }),
    { name: 'RoomsStore' } // DevTools name
  )
);

