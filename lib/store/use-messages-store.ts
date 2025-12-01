// ================================
// Messages Store
// ================================
// Global state management for messages using Zustand

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Message } from '@/lib/types';
import { logger } from '@/lib/logger';

interface MessagesStore {
  // Messages organized by roomId
  messagesByRoom: Record<string, Message[]>;
  
  // Actions
  setMessages: (roomId: string, messages: Message[]) => void;
  addMessage: (roomId: string, message: Message) => void;
  updateMessage: (roomId: string, messageId: string, updates: Partial<Message>) => void;
  removeMessage: (roomId: string, messageId: string) => void;
  clearMessages: (roomId: string) => void;
  getMessages: (roomId: string) => Message[];
  prependMessages: (roomId: string, messages: Message[]) => void; // For pagination
}

/**
 * Global messages store
 * Manages messages organized by room ID
 * Includes DevTools support for debugging
 */
export const useMessagesStore = create<MessagesStore>()(
  devtools(
    (set, get) => ({
  messagesByRoom: {},
  
  setMessages: (roomId, messages) =>
    set(
      (state) => ({
        messagesByRoom: {
          ...state.messagesByRoom,
          [roomId]: messages,
        },
      }),
      false,
      `setMessages/${roomId}`
    ),
  
  addMessage: (roomId, message) =>
    set(
      (state) => {
        const existingMessages = state.messagesByRoom[roomId] || [];
        // Check if message already exists by ID (avoid duplicates)
        if (existingMessages.some((m) => m.id === message.id)) {
          logger.warn("Message already exists in store, skipping:", message.id);
          return state;
        }
        
        logger.log("Adding message to store:", { roomId, messageId: message.id, content: message.content });
        return {
          messagesByRoom: {
            ...state.messagesByRoom,
            [roomId]: [...existingMessages, message],
          },
        };
      },
      false,
      `addMessage/${roomId}/${message.id}`
    ),
  
  updateMessage: (roomId, messageId, updates) =>
    set(
      (state) => {
        const messages = state.messagesByRoom[roomId] || [];
        return {
          messagesByRoom: {
            ...state.messagesByRoom,
            [roomId]: messages.map((msg) =>
              msg.id === messageId ? { ...msg, ...updates } : msg
            ),
          },
        };
      },
      false,
      `updateMessage/${roomId}/${messageId}`
    ),
  
  removeMessage: (roomId, messageId) =>
    set(
      (state) => {
        const messages = state.messagesByRoom[roomId] || [];
        return {
          messagesByRoom: {
            ...state.messagesByRoom,
            [roomId]: messages.filter((msg) => msg.id !== messageId),
          },
        };
      },
      false,
      `removeMessage/${roomId}/${messageId}`
    ),
  
  clearMessages: (roomId) =>
    set(
      (state) => {
        const { [roomId]: _, ...rest } = state.messagesByRoom;
        return { messagesByRoom: rest };
      },
      false,
      `clearMessages/${roomId}`
    ),
  
  getMessages: (roomId) => {
    return get().messagesByRoom[roomId] || [];
  },
  
  prependMessages: (roomId, messages) =>
    set(
      (state) => {
        const existingMessages = state.messagesByRoom[roomId] || [];
        // Filter out duplicates
        const newMessages = messages.filter(
          (msg) => !existingMessages.some((m) => m.id === msg.id)
        );
        return {
          messagesByRoom: {
            ...state.messagesByRoom,
            [roomId]: [...newMessages, ...existingMessages],
          },
        };
      },
      false,
      `prependMessages/${roomId}`
    ),
    }),
    { name: 'MessagesStore' } // DevTools name
  )
);

