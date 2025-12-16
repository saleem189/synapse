// ================================
// Focus Mode Types
// ================================
// Types for focus mode functionality

/**
 * Focus mode state
 */
export interface FocusModeStore {
  isEnabled: boolean;
  enableFocusMode: () => void;
  disableFocusMode: () => void;
  toggleFocusMode: () => void;
}

