// ================================
// UI Store
// ================================
// Global state management for UI state (modals, sidebars, etc.) using Zustand

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UIStore {
  // Modals
  isCreateRoomModalOpen: boolean;
  isSettingsModalOpen: boolean;
  isRoomSettingsModalOpen: boolean;
  isMessageEditModalOpen: boolean;
  editingMessage: { id: string; content: string } | null; // Message being edited
  
  // Sidebars
  isSidebarOpen: boolean; // Mobile sidebar
  isInfoPanelOpen: boolean; // Chat room info panel
  
  // Actions - Modals
  openCreateRoomModal: () => void;
  closeCreateRoomModal: () => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  openRoomSettingsModal: () => void;
  closeRoomSettingsModal: () => void;
  openMessageEditModal: (messageId: string, content: string) => void;
  closeMessageEditModal: () => void;
  
  // Actions - Sidebars
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleInfoPanel: () => void;
  openInfoPanel: () => void;
  closeInfoPanel: () => void;
  
  // Utility
  closeAllModals: () => void;
}

/**
 * Global UI store
 * Manages UI state like modals and sidebars
 * Includes DevTools support for debugging
 */
export const useUIStore = create<UIStore>()(
  devtools(
    (set) => ({
      // Initial state
      isCreateRoomModalOpen: false,
      isSettingsModalOpen: false,
      isRoomSettingsModalOpen: false,
      isMessageEditModalOpen: false,
      editingMessage: null,
      isSidebarOpen: false,
      isInfoPanelOpen: false,
      
      // Modal actions
      openCreateRoomModal: () => set({ isCreateRoomModalOpen: true }, false, 'openCreateRoomModal'),
      closeCreateRoomModal: () => set({ isCreateRoomModalOpen: false }, false, 'closeCreateRoomModal'),
      
      openSettingsModal: () => set({ isSettingsModalOpen: true }, false, 'openSettingsModal'),
      closeSettingsModal: () => set({ isSettingsModalOpen: false }, false, 'closeSettingsModal'),
      
      openRoomSettingsModal: () => set({ isRoomSettingsModalOpen: true }, false, 'openRoomSettingsModal'),
      closeRoomSettingsModal: () => set({ isRoomSettingsModalOpen: false }, false, 'closeRoomSettingsModal'),
      
      openMessageEditModal: (messageId: string, content: string) => 
        set({ 
          isMessageEditModalOpen: true, 
          editingMessage: { id: messageId, content } 
        }, false, 'openMessageEditModal'),
      closeMessageEditModal: () => 
        set({ 
          isMessageEditModalOpen: false, 
          editingMessage: null 
        }, false, 'closeMessageEditModal'),
      
      // Sidebar actions
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen }), false, 'toggleSidebar'),
      openSidebar: () => set({ isSidebarOpen: true }, false, 'openSidebar'),
      closeSidebar: () => set({ isSidebarOpen: false }, false, 'closeSidebar'),
      
      toggleInfoPanel: () => set((state) => ({ isInfoPanelOpen: !state.isInfoPanelOpen }), false, 'toggleInfoPanel'),
      openInfoPanel: () => set({ isInfoPanelOpen: true }, false, 'openInfoPanel'),
      closeInfoPanel: () => set({ isInfoPanelOpen: false }, false, 'closeInfoPanel'),
      
      // Utility
      closeAllModals: () =>
        set(
          {
            isCreateRoomModalOpen: false,
            isSettingsModalOpen: false,
            isRoomSettingsModalOpen: false,
            isMessageEditModalOpen: false,
            editingMessage: null,
          },
          false,
          'closeAllModals'
        ),
    }),
    { name: 'UIStore' } // DevTools name
  )
);

