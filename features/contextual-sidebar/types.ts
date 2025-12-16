// ================================
// Contextual Sidebar Types
// ================================
// Types for the contextual sidebar panel

/**
 * Sidebar panel type
 */
export type SidebarPanelType = 'thread' | 'search' | 'profile' | 'activity' | null;

/**
 * Thread panel data
 */
export interface ThreadPanelData {
  messageId: string; // The original message being discussed
  roomId: string;
}

/**
 * Search panel data
 */
export interface SearchPanelData {
  query: string;
  roomId?: string;
}

/**
 * Profile panel data
 */
export interface ProfilePanelData {
  userId: string;
}

/**
 * Activity panel data
 */
export interface ActivityPanelData {
  // Future: filters, date range, etc.
}

/**
 * Panel data union type
 */
export type SidebarPanelData = 
  | ThreadPanelData 
  | SearchPanelData 
  | ProfilePanelData 
  | ActivityPanelData
  | null;

/**
 * Contextual sidebar store
 */
export interface ContextualSidebarStore {
  isOpen: boolean;
  panelType: SidebarPanelType;
  panelData: SidebarPanelData;
  
  openPanel: (type: SidebarPanelType, data: SidebarPanelData) => void;
  closePanel: () => void;
  togglePanel: () => void;
  
  // Convenience methods for specific panels
  openThread: (messageId: string, roomId: string) => void;
  openSearch: (query: string, roomId?: string) => void;
  openProfile: (userId: string) => void;
  openActivity: () => void;
}

