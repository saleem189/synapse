// ================================
// Mute Channel Hook
// ================================
// Hook for muting/unmuting channels

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import type { MuteChannelResponse, MuteDuration } from '../types';

interface MuteChannelParams {
  roomId: string;
  isMuted: boolean;
  duration?: MuteDuration;
}

/**
 * Hook to mute/unmute a channel
 */
export function useMuteChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roomId, isMuted, duration = 'permanent' }: MuteChannelParams) => {
      const response = await apiClient.post<MuteChannelResponse>(
        `/rooms/${roomId}/mute`,
        { isMuted, duration }
      );
      return response;
    },
    onSuccess: (data) => {
      // Invalidate rooms query to refetch with updated mute status
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['room', data.roomId] });
      
      if (data.isMuted) {
        if (data.mutedUntil) {
          const until = new Date(data.mutedUntil).toLocaleString();
          toast.success(`Muted until ${until}`);
        } else {
          toast.success('Channel muted');
        }
      } else {
        toast.success('Channel unmuted');
      }
    },
    onError: (error) => {
      toast.error('Failed to update mute status');
      console.error('Mute channel error:', error);
    },
  });
}

