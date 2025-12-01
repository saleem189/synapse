// ================================
// Message Repository
// ================================
// Data access layer for messages

import { PrismaClient, Message, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';

export type MessageWithRelations = Prisma.MessageGetPayload<{
  include: {
    sender: { select: { id: true; name: true; avatar: true } };
    replyTo: {
      include: {
        sender: { select: { id: true; name: true; avatar: true } };
      };
    };
    reactions: {
      include: {
        user: { select: { id: true; name: true; avatar: true } };
      };
    };
    readReceipts: true;
  };
}>;

export class MessageRepository extends BaseRepository<
  Message,
  Prisma.MessageCreateInput,
  Prisma.MessageUpdateInput
> {
  public prisma: PrismaClient; // Expose for service layer access
  
  constructor(prisma: PrismaClient) {
    super(prisma, 'message');
    this.prisma = prisma;
  }

  /**
   * Find messages by room ID with pagination
   */
  async findByRoomId(
    roomId: string,
    options?: {
      limit?: number;
      cursor?: string;
      userId?: string; // For filtering read receipts
    }
  ): Promise<MessageWithRelations[]> {
    const { limit = 50, cursor, userId } = options || {};

    const messages = await this.prisma.message.findMany({
      where: {
        roomId,
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // Fetch one extra to check if there are more
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
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

    return messages as MessageWithRelations[];
  }

  /**
   * Find message by ID with all relations
   */
  async findByIdWithRelations(id: string, userId?: string): Promise<MessageWithRelations | null> {
    const message = await this.prisma.message.findUnique({
      where: { id },
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

    return message as MessageWithRelations | null;
  }

  /**
   * Search messages in a room using full-text search
   */
  async search(roomId: string, query: string, limit: number = 20): Promise<MessageWithRelations[]> {
    return this.prisma.message.findMany({
      where: {
        roomId,
        isDeleted: false,
        content: {
          contains: query,
          mode: 'insensitive',
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
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
        readReceipts: true,
      },
    }) as Promise<MessageWithRelations[]>;
  }

  /**
   * Mark message as read for a user
   * Handles race conditions where multiple requests try to mark the same message as read
   */
  async markAsRead(messageId: string, userId: string): Promise<void> {
    try {
      await this.prisma.messageRead.upsert({
        where: {
          messageId_userId: {
            messageId,
            userId,
          },
        },
        create: {
          messageId,
          userId,
        },
        update: {
          // Update readAt timestamp if record already exists
          readAt: new Date(),
        },
      });
    } catch (error: any) {
      // Handle race condition: if record already exists (P2002), that's fine
      // The message is already marked as read
      if (error?.code === 'P2002') {
        // Record already exists, which means message is already marked as read
        // This is not an error - just return successfully
        return;
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Add reaction to a message
   */
  async addReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    await this.prisma.messageReaction.upsert({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
      create: {
        messageId,
        userId,
        emoji,
      },
      update: {},
    });
  }

  /**
   * Remove reaction from a message
   */
  async removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    await this.prisma.messageReaction.deleteMany({
      where: {
        messageId,
        userId,
        emoji,
      },
    });
  }

  /**
   * Soft delete a message
   */
  async softDelete(id: string): Promise<Message> {
    return this.prisma.message.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}

