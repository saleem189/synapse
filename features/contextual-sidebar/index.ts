// ================================
// Contextual Sidebar Feature - Main Export
// ================================
// Public API for contextual sidebar

// Types
export type { 
  SidebarPanelType, 
  SidebarPanelData, 
  ThreadPanelData, 
  SearchPanelData, 
  ProfilePanelData, 
  ActivityPanelData,
  ContextualSidebarStore 
} from './types';

// Hooks
export { useContextualSidebar } from './hooks/use-contextual-sidebar';

// Components (will be added)
export { ContextualSidebar } from './components/contextual-sidebar';
export { ThreadPanel } from './components/thread-panel';

