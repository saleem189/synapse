// ================================
// Toggle Favorite Hook
// ================================
// Hook for starring/unstarring channels

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import type { ToggleFavoriteResponse } from '../types';

interface ToggleFavoriteParams {
  roomId: string;
  isFavorite: boolean;
}

/**
 * Hook to toggle favorite status of a room
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, isFavorite }: ToggleFavoriteParams) => {
      const response = await apiClient.post<ToggleFavoriteResponse>(
        `/rooms/${roomId}/favorite`,
        { isFavorite }
      );
      return response;
    },
    onSuccess: (data) => {
      // Invalidate rooms query to refetch with updated favorite status
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['room', data.roomId] });
      
      toast.success(
        data.isFavorite ? 'Added to favorites' : 'Removed from favorites'
      );
    },
    onError: (error) => {
      toast.error('Failed to update favorite status');
      console.error('Toggle favorite error:', error);
    },
  });
}

