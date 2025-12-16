// ================================
// Contextual Sidebar Hook
// ================================
// Hook for managing contextual sidebar state

'use client';

import { create } from 'zustand';
import type { ContextualSidebarStore, SidebarPanelType, SidebarPanelData } from '../types';

/**
 * Contextual sidebar store
 * Does NOT persist (session-only)
 */
export const useContextualSidebar = create<ContextualSidebarStore>((set) => ({
  isOpen: false,
  panelType: null,
  panelData: null,
  
  openPanel: (type: SidebarPanelType, data: SidebarPanelData) => {
    set({ isOpen: true, panelType: type, panelData: data });
  },
  
  closePanel: () => {
    set({ isOpen: false, panelType: null, panelData: null });
  },
  
  togglePanel: () => {
    set((state) => ({ isOpen: !state.isOpen }));
  },
  
  // Convenience methods
  openThread: (messageId: string, roomId: string) => {
    set({ 
      isOpen: true, 
      panelType: 'thread', 
      panelData: { messageId, roomId } 
    });
  },
  
  openSearch: (query: string, roomId?: string) => {
    set({ 
      isOpen: true, 
      panelType: 'search', 
      panelData: { query, roomId } 
    });
  },
  
  openProfile: (userId: string) => {
    set({ 
      isOpen: true, 
      panelType: 'profile', 
      panelData: { userId } 
    });
  },
  
  openActivity: () => {
    set({ 
      isOpen: true, 
      panelType: 'activity', 
      panelData: {} 
    });
  },
}));

