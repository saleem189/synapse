// ================================
// Message Service
// ================================
// Business logic layer for messages

import { MessageRepository, MessageWithRelations } from '@/lib/repositories/message.repository';
import { RoomRepository } from '@/lib/repositories/room.repository';
import { ValidationError, NotFoundError, ForbiddenError } from '@/lib/errors';
import { messageSchema } from '@/lib/validations';
import { PushService } from '@/lib/services/push.service';
import { QueueService } from '@/lib/queue/queue-service';

export class MessageService {
  constructor(
    private messageRepo: MessageRepository,
    private roomRepo: RoomRepository,
    private queueService: QueueService, // Injected via DI
    private pushService?: PushService // Optional - injected via DI (fallback only)
  ) { }

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
    // 1. Validate input
    const validationResult = messageSchema.safeParse({
      content,
      roomId,
      fileUrl: options?.fileUrl,
      fileName: options?.fileName,
      fileSize: options?.fileSize,
      fileType: options?.fileType,
      type: options?.type || 'text',
      replyToId: options?.replyToId,
    });

    if (!validationResult.success) {
      throw new ValidationError('Invalid message data', validationResult.error.errors);
    }

    // 2. Check if user is participant
    const isParticipant = await this.roomRepo.isParticipant(roomId, userId);
    if (!isParticipant) {
      throw new ForbiddenError('User is not a participant in this room');
    }

    // 3. Validate reply message if replying
    if (options?.replyToId) {
      const replyTo = await this.messageRepo.findById(options.replyToId);
      if (!replyTo) {
        throw new NotFoundError('Reply message not found');
      }
      if (replyTo.roomId !== roomId) {
        throw new ValidationError('Reply message must be in the same room');
      }
    }

    // 4. Determine message type
    const messageType = options?.type ||
      (options?.fileType?.startsWith('image/') ? 'image' :
        options?.fileType?.startsWith('video/') ? 'video' :
          options?.fileType?.startsWith('audio/') ? 'audio' :
            options?.fileUrl ? 'file' : 'text');

    // 5. Create message
    const message = await this.messageRepo.create({
      content: content || '',
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
    });

    // 6. Update room timestamp
    await this.roomRepo.update(roomId, { updatedAt: new Date() });

    // 7. Fetch full message with relations
    const fullMessage = await this.messageRepo.findByIdWithRelations(message.id, userId);
    if (!fullMessage) {
      throw new NotFoundError('Failed to retrieve created message');
    }

    // 8. Send push notification to other participants
    // We don't await this to avoid blocking the response
    this.sendPushNotifications(roomId, userId, content, messageType, options?.fileName).catch(console.error);

    return fullMessage;
  }

  /**
   * Send push notifications to offline/inactive participants
   */
  private async sendPushNotifications(
    roomId: string,
    senderId: string,
    content: string,
    type: string,
    fileName?: string
  ) {
    try {
      // Get room participants
      const room = await this.roomRepo.findByIdWithRelations(roomId);
      if (!room) return;

      // Safety check: ensure participants array exists
      if (!room.participants || !Array.isArray(room.participants)) {
        console.warn('Room participants not available for push notifications');
        return;
      }

      const sender = room.participants.find(p => p.userId === senderId)?.user;
      if (!sender) return;

      // Filter participants who are not the sender
      const recipients = room.participants.filter(p => p.userId !== senderId);

      // Prepare notification payload
      const title = room.isGroup ? `${sender.name} in ${room.name}` : sender.name;
      const body = type === 'text'
        ? content
        : type === 'image'
          ? '📷 Sent an image'
          : type === 'file'
            ? `📎 Sent a file: ${fileName || 'Attachment'}`
            : `Sent a ${type}`;

      const url = `/chat?roomId=${roomId}`;
      const icon = sender.avatar || '/icon-192x192.png'; // Fallback icon

      // Send to each recipient via queue (non-blocking)
      // This prevents blocking the message send operation
      if (!this.queueService) {
        // Fallback if queue service not injected (shouldn't happen in production)
        console.warn('QueueService not injected, falling back to direct push');
        const fallbackPushService = this.pushService || (await import('@/lib/services/push.service')).pushService;
        await Promise.all(recipients.map(async (recipient) => {
          await fallbackPushService.sendNotification(recipient.userId, {
            title,
            body,
            url,
            icon,
          });
        }));
        return;
      }
      
      await Promise.all(recipients.map(async (recipient) => {
        // Add to queue instead of sending directly
        // Worker process will handle sending
        await this.queueService!.addPushNotification(recipient.userId, {
          title,
          body,
          url,
          icon,
        }).catch((error) => {
          // Log but don't fail message send if queue fails
          console.error('Failed to queue push notification:', error);
        });
      }));
    } catch (error) {
      console.error('Failed to send push notifications:', error);
    }
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
    const isParticipant = await this.roomRepo.isParticipant(roomId, userId);
    if (!isParticipant) {
      throw new ForbiddenError('Access denied');
    }

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
      // Group reactions by emoji
      const reactionsByEmoji = message.reactions.reduce((acc, reaction) => {
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
        replyToId: message.replyToId,
        replyTo: message.replyTo ? {
          id: message.replyTo.id,
          content: message.replyTo.content,
          senderName: message.replyTo.sender.name,
          senderAvatar: message.replyTo.sender.avatar,
        } : null,
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
    const isParticipant = await this.roomRepo.isParticipant(roomId, userId);
    if (!isParticipant) {
      throw new ForbiddenError('Access denied');
    }

    // 2. Validate query
    if (!query || query.trim().length < 2) {
      throw new ValidationError('Search query must be at least 2 characters');
    }

    // 3. Search messages
    return this.messageRepo.search(roomId, query, limit);
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string, userId: string): Promise<void> {
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw new NotFoundError('Message not found');
    }

    // Check if user is participant
    const isParticipant = await this.roomRepo.isParticipant(message.roomId, userId);
    if (!isParticipant) {
      throw new ForbiddenError('Access denied');
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
  ): Promise<{ action: 'added' | 'removed'; reaction: any }> {
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw new NotFoundError('Message not found');
    }

    // Check if user is participant
    const isParticipant = await this.roomRepo.isParticipant(message.roomId, userId);
    if (!isParticipant) {
      throw new ForbiddenError('Access denied');
    }

    // Validate emoji
    if (!emoji || emoji.trim().length === 0 || emoji.length > 10) {
      throw new ValidationError('Invalid emoji');
    }

    // Check if reaction already exists
    const existingReaction = await this.messageRepo.prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji: emoji.trim(),
        },
      },
    });

    if (existingReaction) {
      // Remove reaction
      await this.messageRepo.removeReaction(messageId, userId, emoji.trim());
      return { action: 'removed', reaction: null };
    } else {
      // Add reaction
      await this.messageRepo.addReaction(messageId, userId, emoji.trim());
      const reaction = await this.messageRepo.prisma.messageReaction.findUnique({
        where: {
          messageId_userId_emoji: {
            messageId,
            userId,
            emoji: emoji.trim(),
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      });
      return { action: 'added', reaction };
    }
  }

  /**
   * Get read receipts for a message
   */
  async getReadReceipts(messageId: string, userId: string): Promise<Array<{ id: string; userId: string; readAt: Date; user: { id: string; name: string; avatar: string | null } }>> {
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw new NotFoundError('Message not found');
    }

    // Check if user is participant
    const isParticipant = await this.roomRepo.isParticipant(message.roomId, userId);
    if (!isParticipant) {
      throw new ForbiddenError('Access denied');
    }

    const readReceipts = await this.messageRepo.prisma.messageRead.findMany({
      where: { messageId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { readAt: 'asc' },
    });

    return readReceipts;
  }

  /**
   * Get reactions for a message
   */
  async getReactions(messageId: string, userId: string): Promise<Record<string, Array<{ id: string; name: string; avatar: string | null }>>> {
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw new NotFoundError('Message not found');
    }

    // Check if user is participant
    const isParticipant = await this.roomRepo.isParticipant(message.roomId, userId);
    if (!isParticipant) {
      throw new ForbiddenError('Access denied');
    }

    const reactions = await this.messageRepo.prisma.messageReaction.findMany({
      where: { messageId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group reactions by emoji
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
   * Edit a message
   */
  async editMessage(
    messageId: string,
    userId: string,
    content: string
  ): Promise<MessageWithRelations> {
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw new NotFoundError('Message not found');
    }

    // Check ownership
    if (message.senderId !== userId) {
      throw new ForbiddenError('You can only edit your own messages');
    }

    // Validate content
    if (!content || content.trim().length === 0) {
      throw new ValidationError('Message content cannot be empty');
    }

    if (content.length > 2000) {
      throw new ValidationError('Message must be less than 2000 characters');
    }

    // Update message
    await this.messageRepo.update(messageId, {
      content: content.trim(),
      isEdited: true,
    });

    const updatedMessage = await this.messageRepo.findByIdWithRelations(messageId);
    if (!updatedMessage) {
      throw new NotFoundError('Failed to retrieve updated message');
    }

    return updatedMessage;
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw new NotFoundError('Message not found');
    }

    // Check ownership
    if (message.senderId !== userId) {
      throw new ForbiddenError('You can only delete your own messages');
    }

    await this.messageRepo.softDelete(messageId);
  }
}

