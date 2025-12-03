// ================================
// Message Read Service
// ================================
// Handles read receipts for messages

import { MessageRepository } from '@/lib/repositories/message.repository';
import { RoomRepository } from '@/lib/repositories/room.repository';
import { NotFoundError, ForbiddenError } from '@/lib/errors';
import { ERROR_MESSAGES } from '@/lib/errors/error-messages';

export class MessageReadService {
  constructor(
    private messageRepo: MessageRepository,
    private roomRepo: RoomRepository
  ) {}

  /**
   * Mark a message as read
   */
  async markAsRead(messageId: string, userId: string): Promise<void> {
    const message = await this.messageRepo.findMessageWithParticipantCheck(messageId, userId);

    if (!message) {
      throw new NotFoundError(ERROR_MESSAGES.MESSAGE_NOT_FOUND);
    }

    await this.messageRepo.markAsRead(messageId, userId);
  }

  /**
   * Get read receipts for a message
   */
  async getReadReceipts(
    messageId: string,
    userId: string
  ): Promise<
    Array<{ id: string; userId: string; readAt: Date; user: { id: string; name: string; avatar: string | null } }>
  > {
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw new NotFoundError(ERROR_MESSAGES.MESSAGE_NOT_FOUND);
    }

    // Check if user is participant
    await this.requireParticipant(message.roomId, userId);

    const readReceipts = await this.messageRepo.getReadReceipts(messageId);

    return readReceipts;
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
}

