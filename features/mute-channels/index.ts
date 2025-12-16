// ================================
// Mute Channels Feature - Main Export
// ================================
// Public API for mute channels

// Types
export type { MuteDuration, MuteChannelPayload, MuteChannelResponse } from './types';
export { getMuteExpiry, isChannelMuted } from './types';

// Hooks
export { useMuteChannel } from './hooks/use-mute-channel';

