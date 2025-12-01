// ================================
// User Store
// ================================
// Global state management for current user using Zustand

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { User } from '@/lib/types';

interface UserStore {
  user: User | null;
  setUser: (user: User) => void;
  clearUser: () => void;
  updateUser: (updates: Partial<User>) => void;
}

/**
 * Global user store
 * Persists user data to localStorage
 * Includes DevTools support for debugging
 */
export const useUserStore = create<UserStore>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        setUser: (user) => set({ user }, false, 'setUser'),
        clearUser: () => set({ user: null }, false, 'clearUser'),
        updateUser: (updates) =>
          set(
            (state) => ({
              user: state.user ? { ...state.user, ...updates } : null,
            }),
            false,
            'updateUser'
          ),
      }),
      {
        name: 'user-storage', // localStorage key
        partialize: (state) => ({ user: state.user }), // Only persist user
      }
    ),
    { name: 'UserStore' } // DevTools name
  )
);

