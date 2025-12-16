// ================================
// Channel Favorites Types
// ================================
// Types for favorite/starred channels

/**
 * Favorite channel action
 */
export type FavoriteAction = 'star' | 'unstar';

/**
 * API payload for toggling favorite
 */
export interface ToggleFavoritePayload {
  roomId: string;
  isFavorite: boolean;
}

/**
 * API response for toggle favorite
 */
export interface ToggleFavoriteResponse {
  success: boolean;
  roomId: string;
  isFavorite: boolean;
  favoritedAt: string | null;
}

