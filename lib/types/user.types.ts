// ================================
// User Types
// ================================
// Shared TypeScript types for users

/**
 * User role (matches Prisma UserRole enum)
 */
export type UserRole = 'USER' | 'ADMIN';

/**
 * User status (matches Prisma UserStatus enum)
 */
export type UserStatus = 'ONLINE' | 'OFFLINE' | 'AWAY';

/**
 * User structure (public, without sensitive data)
 */
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: UserRole;
  status: UserStatus;
  lastSeen: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/**
 * User for display in UI (minimal fields)
 */
export interface UserDisplay {
  id: string;
  name: string;
  avatar?: string | null;
  status?: UserStatus;
  email?: string;
}

/**
 * User registration data
 */
export interface RegisterUserData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * User login data
 */
export interface LoginUserData {
  email: string;
  password: string;
}

/**
 * User profile update data
 */
export interface UpdateUserProfileData {
  name?: string;
  avatar?: string;
}

