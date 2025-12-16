// ================================
// Mute Channels Types
// ================================
// Types for muting/unmuting channels

/**
 * Mute duration options
 */
export type MuteDuration = 'permanent' | '1h' | '8h' | '24h' | '1w';

/**
 * API payload for muting a channel
 */
export interface MuteChannelPayload {
  roomId: string;
  isMuted: boolean;
  duration?: MuteDuration;
}

/**
 * API response for mute/unmute
 */
export interface MuteChannelResponse {
  success: boolean;
  roomId: string;
  isMuted: boolean;
  mutedAt: string | null;
  mutedUntil: string | null;
}

/**
 * Helper to calculate mute expiry
 */
export function getMuteExpiry(duration: MuteDuration): Date | null {
  if (duration === 'permanent') return null;
  
  const now = new Date();
  switch (duration) {
    case '1h':
      return new Date(now.getTime() + 60 * 60 * 1000);
    case '8h':
      return new Date(now.getTime() + 8 * 60 * 60 * 1000);
    case '24h':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case '1w':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

/**
 * Check if a channel is currently muted (accounting for expiry)
 */
export function isChannelMuted(isMuted: boolean, mutedUntil: string | null): boolean {
  if (!isMuted) return false;
  if (!mutedUntil) return true; // Permanently muted
  
  // Check if mute has expired
  return new Date(mutedUntil) > new Date();
}

