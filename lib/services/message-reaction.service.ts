// ================================
// Message Reaction Service
// ================================
// Handles message reactions (add, remove, get)

import { MessageRepository } from '@/lib/repositories/message.repository';
import { RoomRepository } from '@/lib/repositories/room.repository';
import { ValidationError, NotFoundError, ForbiddenError } from '@/lib/errors';
import { ERROR_MESSAGES } from '@/lib/errors/error-messages';

export class MessageReactionService {
  constructor(
    private messageRepo: MessageRepository,
    private roomRepo: RoomRepository
  ) {}

  /**
   * Toggle reaction on a message (add if not exists, remove if exists)
   */
  async toggleReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<{ action: 'added' | 'removed'; reaction: any }> {
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw new NotFoundError(ERROR_MESSAGES.MESSAGE_NOT_FOUND);
    }

    // Check if user is participant
    await this.requireParticipant(message.roomId, userId);

    // Validate emoji
    if (!emoji || emoji.trim().length === 0 || emoji.length > 10) {
      throw new ValidationError(ERROR_MESSAGES.INVALID_EMOJI);
    }

    // Check if reaction already exists
    const existingReaction = await this.messageRepo.findReaction(messageId, userId, emoji);

    if (existingReaction) {
      // Remove reaction
      await this.messageRepo.removeReaction(messageId, userId, emoji.trim());
      return { action: 'removed', reaction: null };
    } else {
      // Add reaction
      await this.messageRepo.addReaction(messageId, userId, emoji.trim());
      const reaction = await this.messageRepo.findReaction(messageId, userId, emoji);
      return { action: 'added', reaction };
    }
  }

  /**
   * Get reactions for a message
   */
  async getReactions(
    messageId: string,
    userId: string
  ): Promise<Record<string, Array<{ id: string; name: string; avatar: string | null }>>> {
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw new NotFoundError(ERROR_MESSAGES.MESSAGE_NOT_FOUND);
    }

    // Check if user is participant
    await this.requireParticipant(message.roomId, userId);

    // Use repository method instead of direct Prisma access
    const reactions = await this.messageRepo.getReactions(messageId);

    // Group reactions by emoji
    return this.groupReactionsByEmoji(reactions);
  }

  /**
   * Require user to be a participant in the room
   */
  private async requireParticipant(roomId: string, userId: string): Promise<void> {
    const isParticipant = await this.roomRepo.isParticipant(roomId, userId);
    if (!isParticipant) {
      throw new ForbiddenError(ERROR_MESSAGES.ACCESS_DENIED);
    }
  }

  /**
   * Group reactions by emoji
   */
  private groupReactionsByEmoji(
    reactions: Array<{
      emoji: string;
      user: { id: string; name: string; avatar: string | null };
    }>
  ): Record<string, Array<{ id: string; name: string; avatar: string | null }>> {
    return reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = [];
      }
      acc[reaction.emoji].push({
        id: reaction.user.id,
        name: reaction.user.name,
        avatar: reaction.user.avatar,
      });
      return acc;
    }, {} as Record<string, Array<{ id: string; name: string; avatar: string | null }>>);
  }
}

