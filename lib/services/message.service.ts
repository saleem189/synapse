// ================================
// Message Service
// ================================
// Business logic layer for messages (core CRUD operations)
// Uses composition with specialized services for notifications, reactions, and read receipts

import { MessageRepository, MessageWithRelations } from '@/lib/repositories/message.repository';
import { RoomRepository } from '@/lib/repositories/room.repository';
import { ValidationError, NotFoundError, ForbiddenError } from '@/lib/errors';
import { messageSchema } from '@/lib/validations';
import { CacheService } from '@/lib/cache/cache.service';
import { MessageNotificationService } from '@/lib/services/message-notification.service';
import { MessageReactionService } from '@/lib/services/message-reaction.service';
import { MessageReadService } from '@/lib/services/message-read.service';
import type { ILogger } from '@/lib/logger/logger.interface';
import { MESSAGE, VALIDATION } from '@/lib/constants';
import { ERROR_MESSAGES } from '@/lib/errors/error-messages';
import { sanitizeMessageContent } from '@/lib/utils/sanitize-server';

export class MessageService {
  constructor(
    private messageRepo: MessageRepository,
    private roomRepo: RoomRepository,
    private logger: ILogger, // ✅ Injected via DI
    private cacheService?: CacheService, // Optional - for manual cache invalidation
    private notificationService?: MessageNotificationService, // Optional - for push notifications
    private reactionService?: MessageReactionService, // Optional - for reactions
    private readService?: MessageReadService // Optional - for read receipts
  ) { }

  /**
   * Validate message input (length, payload size, schema)
   * Returns sanitized content and validated data
   */
  private async validateMessageInput(
    content: string,
    roomId: string,
    options?: {
      replyToId?: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      fileType?: string;
      type?: 'text' | 'image' | 'video' | 'file' | 'audio';
    }
  ): Promise<{ sanitizedContent: string; validatedData: { content: string; roomId: string; replyToId?: string | null; fileUrl?: string; fileName?: string; fileSize?: number; fileType?: string; type?: 'text' | 'image' | 'video' | 'file' | 'audio' } }> {
    // 1. Validate input length before parsing (DoS protection)
    if (content && content.length > MESSAGE.MAX_CONTENT_LENGTH) {
      throw new ValidationError(`${ERROR_MESSAGES.MESSAGE_CONTENT_TOO_LONG} (${MESSAGE.MAX_CONTENT_LENGTH} characters)`);
    }

    const payloadSize = JSON.stringify({ content, roomId, ...options }).length;
    if (payloadSize > MESSAGE.MAX_PAYLOAD_SIZE) {
      throw new ValidationError(ERROR_MESSAGES.PAYLOAD_TOO_LARGE);
    }

    // 2. Sanitize content to prevent XSS attacks
    const sanitizedContent = content ? sanitizeMessageContent(content) : '';

    // 3. Validate input schema (use sanitized content)
    const validationResult = messageSchema.safeParse({
      content: sanitizedContent,
      roomId,
      fileUrl: options?.fileUrl,
      fileName: options?.fileName,
      fileSize: options?.fileSize,
      fileType: options?.fileType,
      type: options?.type || 'text',
      replyToId: options?.replyToId,
    });

    if (!validationResult.success) {
      throw new ValidationError(ERROR_MESSAGES.INVALID_MESSAGE_DATA, validationResult.error.issues);
    }

    return {
      sanitizedContent,
      validatedData: validationResult.data,
    };
  }

  /**
   * Validate reply message if replying
   */
  private async validateReplyMessage(replyToId: string, roomId: string): Promise<void> {
    const replyTo = await this.messageRepo.findById(replyToId);
    if (!replyTo) {
      throw new NotFoundError(ERROR_MESSAGES.REPLY_MESSAGE_NOT_FOUND);
    }
    if (replyTo.roomId !== roomId) {
      throw new ValidationError(ERROR_MESSAGES.REPLY_SAME_ROOM);
    }
  }

  /**
   * Send a new message
   */
  async sendMessage(
    userId: string,
    roomId: string,
    content: string,
    options?: {
      replyToId?: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      fileType?: string;
      type?: 'text' | 'image' | 'video' | 'file' | 'audio';
    }
  ): Promise<MessageWithRelations> {
    // 1. Validate input (length, payload, schema) and sanitize
    const { sanitizedContent } = await this.validateMessageInput(content, roomId, options);

    // 2. Check if user is participant
    await this.requireParticipant(roomId, userId);

    // 3. Validate reply message if replying
    if (options?.replyToId) {
      await this.validateReplyMessage(options.replyToId, roomId);
    }

    // 4. Determine message type
    const messageType = this.determineMessageType(options);

    // 6. Create message and update room timestamp atomically
    // CRITICAL FIX: Use transaction to ensure data consistency
    const prisma = this.messageRepo.prisma;
    const { message, fullMessage } = await prisma.$transaction(async (tx) => {
      // Create message
      const createdMessage = await tx.message.create({
        data: {
          content: sanitizedContent || '',
          type: messageType,
          fileUrl: options?.fileUrl || null,
          fileName: options?.fileName || null,
          fileSize: options?.fileSize || null,
          fileType: options?.fileType || null,
          sender: {
            connect: { id: userId },
          },
          room: {
            connect: { id: roomId },
          },
          ...(options?.replyToId && {
            replyTo: {
              connect: { id: options.replyToId },
            },
          }),
        },
      });

      // Update room timestamp
      await tx.chatRoom.update({
        where: { id: roomId },
        data: { updatedAt: new Date() },
      });

      // Fetch full message with relations
      const messageWithRelations = await tx.message.findUnique({
        where: { id: createdMessage.id },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          replyTo: {
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
            },
          },
          reactions: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
            },
          },
          readReceipts: userId
            ? {
                where: {
                  userId,
                },
              }
            : true,
        },
      });

      if (!messageWithRelations) {
        throw new NotFoundError(ERROR_MESSAGES.MESSAGE_NOT_FOUND);
      }

      return {
        message: createdMessage,
        fullMessage: messageWithRelations as MessageWithRelations,
      };
    });

    // Invalidate cache after transaction completes
    if (this.cacheService) {
      await Promise.all([
        this.cacheService.invalidate(`messages:room:${roomId}*`),
        this.cacheService.invalidate(`room:${roomId}*`),
        this.cacheService.invalidate(`rooms:user:*`), // Invalidate all user room lists
      ]);
    }

    // 9. Send push notification to other participants
    // We don't await this to avoid blocking the response
    // Use original content for notification (not sanitized, as it's just for display)
    if (this.notificationService) {
      this.notificationService
        .sendPushNotifications(roomId, userId, content || '', messageType, options?.fileName)
        .catch((error) => {
          this.logger.error('Failed to send push notifications:', error, {
            component: 'MessageService',
            roomId,
            userId,
          });
          // Track error for monitoring/metrics (fire-and-forget operation)
          // TODO: Add metrics service to track push notification failures
          // metricsService?.recordError('push_notification', error);
        });
    }

    return fullMessage;
  }


  /**
   * Get messages for a room with pagination
   */
  async getMessages(
    roomId: string,
    userId: string,
    options?: { limit?: number; cursor?: string }
  ): Promise<{
    messages: Array<{
      id: string;
      content: string;
      type: string;
      fileUrl: string | null;
      fileName: string | null;
      fileSize: number | null;
      fileType: string | null;
      isEdited: boolean;
      isDeleted: boolean;
      isPinned: boolean;
      pinnedAt: string | null;
      pinnedById: string | null;
      replyToId: string | null;
      replyTo: {
        id: string;
        content: string;
        senderName: string;
        senderAvatar: string | null;
      } | null;
      reactions: Record<string, Array<{ id: string; name: string; avatar: string | null }>>;
      isRead: boolean;
      createdAt: string;
      senderId: string;
      senderName: string;
      senderAvatar: string | null;
      roomId: string;
    }>;
    hasMore: boolean;
    nextCursor?: string;
  }> {
    // 1. Check access
    await this.requireParticipant(roomId, userId);

    // 2. Fetch messages
    const messages = await this.messageRepo.findByRoomId(roomId, {
      limit: options?.limit || 50,
      cursor: options?.cursor,
      userId,
    });

    // 3. Check if there are more messages
    const hasMore = messages.length > (options?.limit || 50);
    const messagesToReturn = hasMore ? messages.slice(0, -1) : messages;
    const nextCursor = hasMore ? messagesToReturn[messagesToReturn.length - 1]?.id : undefined;

    // Transform messages to match expected format
    const transformedMessages = messagesToReturn.map((message) => {
      // Group reactions by emoji (extracted to helper method)
      const reactionsByEmoji = this.groupReactionsByEmoji(message.reactions);

      return {
        id: message.id,
        content: message.content,
        type: message.type,
        fileUrl: message.fileUrl,
        fileName: message.fileName,
        fileSize: message.fileSize,
        fileType: message.fileType,
        isEdited: message.isEdited,
        isDeleted: message.isDeleted,
        isPinned: message.isPinned || false,
        pinnedAt: message.pinnedAt?.toISOString() || null,
        pinnedById: message.pinnedById || null,
        replyToId: message.replyToId,
        replyTo: message.replyTo ? {
          id: message.replyTo.id,
          content: message.replyTo.content,
          senderName: message.replyTo.sender.name,
          senderAvatar: message.replyTo.sender.avatar,
        } : null,
        replyCount: message._count?.replies || 0, // Added reply count
        reactions: reactionsByEmoji,
        isRead: message.readReceipts.length > 0,
        createdAt: message.createdAt.toISOString(),
        senderId: message.senderId,
        senderName: message.sender.name,
        senderAvatar: message.sender.avatar,
        roomId: message.roomId,
      };
    });

    return {
      messages: transformedMessages.reverse(), // Reverse to show oldest first
      hasMore,
      nextCursor,
    };
  }

  /**
   * Search messages in a room
   */
  async searchMessages(
    roomId: string,
    userId: string,
    query: string,
    limit: number = 20
  ): Promise<MessageWithRelations[]> {
    // 1. Check access
    await this.requireParticipant(roomId, userId);

    // 2. Validate query
    if (!query || query.trim().length < VALIDATION.MIN_SEARCH_LENGTH) {
      throw new ValidationError(`${ERROR_MESSAGES.SEARCH_QUERY_TOO_SHORT} (${VALIDATION.MIN_SEARCH_LENGTH} characters)`);
    }

    // 3. Search messages
    return this.messageRepo.search(roomId, query, limit);
  }

  /**
   * Mark message as read
   * Optimized: Verifies message exists and user is participant in single query
   */
  async markAsRead(messageId: string, userId: string): Promise<void> {
    // Verify message exists and user is participant in one query (atomic check)
    // This prevents TOCTOU (Time-of-check to time-of-use) vulnerabilities
    const message = await this.messageRepo.findMessageWithParticipantCheck(messageId, userId);

    if (!message) {
      throw new NotFoundError(`${ERROR_MESSAGES.MESSAGE_NOT_FOUND} or ${ERROR_MESSAGES.ACCESS_DENIED}`);
    }

    await this.messageRepo.markAsRead(messageId, userId);
  }

  /**
   * Toggle reaction on a message (add if not exists, remove if exists)
   */
  async toggleReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<{ action: 'added' | 'removed'; reaction: { id: string; messageId: string; userId: string; emoji: string; createdAt: Date } | null }> {
    if (this.reactionService) {
      return this.reactionService.toggleReaction(messageId, userId, emoji);
    }
    // Fallback to direct repository call if service not injected
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw new NotFoundError(ERROR_MESSAGES.MESSAGE_NOT_FOUND);
    }
    await this.requireParticipant(message.roomId, userId);
    if (!emoji || emoji.trim().length === 0 || emoji.length > 10) {
      throw new ValidationError(ERROR_MESSAGES.INVALID_EMOJI);
    }
    const existingReaction = await this.messageRepo.findReaction(messageId, userId, emoji);
    if (existingReaction) {
      await this.messageRepo.removeReaction(messageId, userId, emoji.trim());
      return { action: 'removed', reaction: null };
    } else {
      await this.messageRepo.addReaction(messageId, userId, emoji.trim());
      const reaction = await this.messageRepo.findReaction(messageId, userId, emoji);
      return { action: 'added', reaction };
    }
  }

  /**
   * Determine message type based on options
   * Extracted to improve readability and maintainability
   * Returns uppercase enum values to match Prisma MessageType enum
   */
  private determineMessageType(
    options?: {
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      fileType?: string;
      type?: string; // Accepts both lowercase and uppercase
    }
  ): 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'AUDIO' {
    // If type is explicitly provided, normalize to uppercase
    if (options?.type) {
      const normalized = options.type.toUpperCase();
      if (['TEXT', 'IMAGE', 'VIDEO', 'FILE', 'AUDIO'].includes(normalized)) {
        return normalized as 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'AUDIO';
      }
    }

    // If no file type, check if there's a file URL
    if (!options?.fileType) {
      return options?.fileUrl ? 'FILE' : 'TEXT';
    }

    // Determine type based on file MIME type
    const fileType = options.fileType.toLowerCase();

    if (fileType.startsWith('image/')) return 'IMAGE';
    if (fileType.startsWith('video/')) return 'VIDEO';
    if (fileType.startsWith('audio/')) return 'AUDIO';

    return 'FILE';
  }

  /**
   * Require user to be a participant in the room
   * Extracted to reduce code duplication and improve maintainability
   */
  private async requireParticipant(roomId: string, userId: string): Promise<void> {
    const isParticipant = await this.roomRepo.isParticipant(roomId, userId);
    if (!isParticipant) {
      throw new ForbiddenError(ERROR_MESSAGES.ACCESS_DENIED);
    }
  }

  /**
   * Group reactions by emoji
   * Extracted to reduce complexity in getMessages
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

  /**
   * Get read receipts for a message
   */
  async getReadReceipts(messageId: string, userId: string): Promise<Array<{ id: string; userId: string; readAt: Date; user: { id: string; name: string; avatar: string | null } }>> {
    if (this.readService) {
      return this.readService.getReadReceipts(messageId, userId);
    }
    // Fallback to direct repository call if service not injected
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw new NotFoundError(ERROR_MESSAGES.MESSAGE_NOT_FOUND);
    }
    await this.requireParticipant(message.roomId, userId);
    return await this.messageRepo.getReadReceipts(messageId);
  }

  /**
   * Get reactions for a message
   */
  async getReactions(messageId: string, userId: string): Promise<Record<string, Array<{ id: string; name: string; avatar: string | null }>>> {
    if (this.reactionService) {
      return this.reactionService.getReactions(messageId, userId);
    }
    // Fallback to direct repository call if service not injected
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw new NotFoundError(ERROR_MESSAGES.MESSAGE_NOT_FOUND);
    }
    await this.requireParticipant(message.roomId, userId);
    const reactions = await this.messageRepo.getReactions(messageId);
    return this.groupReactionsByEmoji(reactions);
  }

  /**
   * Edit a message
   */
  async editMessage(
    messageId: string,
    userId: string,
    content: string
  ): Promise<MessageWithRelations> {
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw new NotFoundError(ERROR_MESSAGES.MESSAGE_NOT_FOUND);
    }

    // Check ownership
    if (message.senderId !== userId) {
      throw new ForbiddenError(ERROR_MESSAGES.CAN_ONLY_EDIT_OWN);
    }

    // Validate content
    if (!content || content.trim().length === 0) {
      throw new ValidationError('Message content cannot be empty');
    }

    if (content.length > MESSAGE.MAX_CONTENT_LENGTH) {
      throw new ValidationError(`Message must be less than ${MESSAGE.MAX_CONTENT_LENGTH} characters`);
    }

    // Update message
    await this.messageRepo.update(messageId, {
      content: content.trim(),
      isEdited: true,
    });

    const updatedMessage = await this.messageRepo.findByIdWithRelations(messageId);
    if (!updatedMessage) {
      throw new NotFoundError(ERROR_MESSAGES.MESSAGE_NOT_FOUND);
    }

    return updatedMessage;
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw new NotFoundError(ERROR_MESSAGES.MESSAGE_NOT_FOUND);
    }

    // Check ownership
    if (message.senderId !== userId) {
      throw new ForbiddenError(ERROR_MESSAGES.CAN_ONLY_DELETE_OWN);
    }

    await this.messageRepo.softDelete(messageId);
  }
}

