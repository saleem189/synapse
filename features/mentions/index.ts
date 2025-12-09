// ================================
// Mentions Feature - Main Export
// ================================
// Public API for @mentions functionality

// Types
export type { MentionableUser, Mention, MentionSuggestion } from './types';

// Constants
export { MENTION_TRIGGER, MENTION_REGEX, MENTION_DISPLAY_REGEX } from './types';

// Utilities
export {
    parseMentions,
    mentionsToDisplayText,
    extractMentionedUserIds,
    insertMention,
    getMentionContext,
} from './types';

// Components
export { MentionSuggestions } from './mention-suggestions';

// Hooks
export { useMentions } from './use-mentions';
