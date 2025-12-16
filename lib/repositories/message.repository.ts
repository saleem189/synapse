// ================================
// Message Repository
// ================================
// Data access layer for messages

import { PrismaClient, Message, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';
import { USER_SELECT, MESSAGE_INCLUDE_FULL } from '@/lib/types/common-selects';
import { MESSAGE } from '@/lib/constants';
import { CacheService } from '@/lib/cache/cache.service';

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
    _count: {
      select: { replies: true }; // Count replies to this message
    };
  };
}>;

export class MessageRepository extends BaseRepository<
  Message,
  Prisma.MessageCreateInput,
  Prisma.MessageUpdateInput
> {
  public prisma: PrismaClient; // Expose for service layer access
  private cache: CacheService;
  
  // Cache TTLs (in seconds)
  private readonly CACHE_TTL_MESSAGE = 60; // 1 minute (real-time data)
  private readonly CACHE_TTL_MESSAGE_LIST = 60; // 1 minute
  private readonly CACHE_TTL_REACTIONS = 300; // 5 minutes

  constructor(prisma: PrismaClient, cache: CacheService) {
    super(prisma, 'message');
    this.prisma = prisma;
    this.cache = cache;
  }

  /**
   * Find messages by room ID with pagination
   * Cached for performance (short TTL due to real-time nature)
   */
  async findByRoomId(
    roomId: string,
    options?: {
      limit?: number;
      cursor?: string;
      userId?: string; // For filtering read receipts
    }
  ): Promise<MessageWithRelations[]> {
    const { limit = MESSAGE.PAGINATION_LIMIT, cursor, userId } = options || {};
    
    // Cache key includes all parameters
    const cacheKey = `messages:room:${roomId}:${limit}:${cursor || 'none'}:${userId || 'all'}`;
    
    return await this.cache.getOrSet(
      cacheKey,
      async () => {
        return await this.fetchMessagesByRoomId(roomId, limit, cursor, userId);
      },
      this.CACHE_TTL_MESSAGE_LIST
    );
  }

  /**
   * Internal method to fetch messages (without cache)
   */
  private async fetchMessagesByRoomId(
    roomId: string,
    limit: number,
    cursor?: string,
    userId?: string
  ): Promise<MessageWithRelations[]> {
    const messages = await this.prisma.message.findMany({
      where: {
        roomId,
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // Fetch one extra to check if there are more messages
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
        _count: {
          select: {
            replies: true, // Count replies to this message
          },
        },
      },
    });

    return messages as MessageWithRelations[];
  }

  /**
   * Override update to invalidate cache
   */
  async update(id: string, data: Prisma.MessageUpdateInput): Promise<Message> {
    const result = await super.update(id, data);
    
    // Invalidate cache
    await Promise.all([
      this.cache.invalidate(`message:${id}*`),
      this.cache.invalidate(`messages:room:*`), // Invalidate all room message lists
    ]);
    
    return result;
  }

  /**
   * Override create to invalidate cache
   */
  async create(data: Prisma.MessageCreateInput): Promise<Message> {
    const result = await super.create(data);
    
    // Invalidate room message lists
    if (data.room?.connect?.id) {
      await this.cache.invalidate(`messages:room:${data.room.connect.id}*`);
    }
    
    return result;
  }

  /**
   * Find message by ID with all relations
   * Cached for performance
   */
  async findByIdWithRelations(id: string, userId?: string): Promise<MessageWithRelations | null> {
    const cacheKey = `message:${id}:${userId || 'all'}`;
    
    return await this.cache.getOrSet(
      cacheKey,
      async () => {
        const message = await this.prisma.message.findUnique({
          where: { id },
          include: {
            ...MESSAGE_INCLUDE_FULL,
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
      },
      this.CACHE_TTL_MESSAGE
    );
  }

  /**
   * Search messages in a room using PostgreSQL full-text search with GIN index
   * Uses trigram similarity for fast, fuzzy text matching
   * Leverages idx_message_content_search GIN index for optimal performance
   */
  async search(roomId: string, query: string, limit: number = 20): Promise<MessageWithRelations[]> {
    // Use raw SQL with trigram similarity for optimal performance
    // This leverages the GIN index created in the migration
    // Similarity threshold: 0.1 (adjustable - lower = more results, higher = more precise)
    const similarityThreshold = 0.1;
    
    const results = await this.prisma.$queryRaw<Array<{
      id: string;
      content: string;
      type: string;
      fileUrl: string | null;
      fileName: string | null;
      fileSize: number | null;
      fileType: string | null;
      senderId: string;
      roomId: string;
      isEdited: boolean;
      isDeleted: boolean;
      replyToId: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>>`
      SELECT m.*
      FROM messages m
      WHERE m."roomId" = ${roomId}
        AND m."isDeleted" = false
        AND similarity(m.content, ${query}) > ${similarityThreshold}
      ORDER BY similarity(m.content, ${query}) DESC, m."createdAt" DESC
      LIMIT ${limit}
    `;

    // If no results with similarity, fall back to case-insensitive contains
    // This ensures we still get results even if similarity doesn't match
    if (results.length === 0) {
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
          ...MESSAGE_INCLUDE_FULL,
          readReceipts: true,
        },
      }) as Promise<MessageWithRelations[]>;
    }

    // Fetch full relations for the matched messages
    const messageIds = results.map(r => r.id);
    return this.prisma.message.findMany({
      where: {
        id: { in: messageIds },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        ...MESSAGE_INCLUDE_FULL,
        readReceipts: true,
      },
    }) as Promise<MessageWithRelations[]>;
  }

  /**
   * Mark message as read for a user
   * Handles race conditions where multiple requests try to mark the same message as read
   * Uses transaction with retry logic to prevent race conditions
   */
  async markAsRead(messageId: string, userId: string): Promise<void> {
    const maxRetries = 3;
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // Check if record exists first
          const existing = await tx.messageRead.findUnique({
            where: {
              messageId_userId: { messageId, userId }
            }
          });
          
          if (existing) {
            // Update existing record
            await tx.messageRead.update({
              where: { id: existing.id },
              data: { readAt: new Date() }
            });
          } else {
            // Create new record
            await tx.messageRead.create({
              data: { messageId, userId }
            });
          }
        });
        
        return; // Success
      } catch (error: unknown) {
        // Retry on unique constraint violation (race condition)
        const prismaError = error as { code?: string };
        if (prismaError?.code === 'P2002' && retries < maxRetries - 1) {
          retries++;
          // Exponential backoff: 10ms, 20ms, 30ms
          await new Promise(resolve => setTimeout(resolve, 10 * retries));
          continue;
        }
        // Re-throw other errors or if max retries reached
        throw error;
      }
    }
  }

  /**
   * Add reaction to a message
   * Invalidates cache on update
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
    
    // Invalidate cache
    await Promise.all([
      this.cache.delete(`reactions:${messageId}`),
      this.cache.invalidate(`message:${messageId}*`),
    ]);
  }

  /**
   * Remove reaction from a message
   * Invalidates cache on update
   */
  async removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    await this.prisma.messageReaction.deleteMany({
      where: {
        messageId,
        userId,
        emoji,
      },
    });
    
    // Invalidate cache
    await Promise.all([
      this.cache.delete(`reactions:${messageId}`),
      this.cache.invalidate(`message:${messageId}*`),
    ]);
  }

  /**
   * Soft delete a message
   * Invalidates cache on update
   */
  async softDelete(id: string): Promise<Message> {
    const result = await this.prisma.message.update({
      where: { id },
      data: { isDeleted: true },
    });
    
    // Invalidate cache
    await Promise.all([
      this.cache.invalidate(`message:${id}*`),
      this.cache.invalidate(`messages:room:*`), // Invalidate all room message lists
    ]);
    
    return result;
  }

  /**
   * Find a reaction by message, user, and emoji
   */
  async findReaction(messageId: string, userId: string, emoji: string) {
    return this.prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji: emoji.trim(),
        },
      },
      include: {
        user: {
          select: USER_SELECT,
        },
      },
    });
  }

  /**
   * Get all read receipts for a message
   */
  async getReadReceipts(messageId: string) {
    return this.prisma.messageRead.findMany({
      where: { messageId },
      include: {
        user: {
          select: USER_SELECT,
        },
      },
      orderBy: { readAt: 'asc' },
    });
  }

  /**
   * Get all reactions for a message
   * Cached for performance
   */
  async getReactions(messageId: string) {
    const cacheKey = `reactions:${messageId}`;
    
    return await this.cache.getOrSet(
      cacheKey,
      async () => {
        return await this.prisma.messageReaction.findMany({
          where: { messageId },
          include: {
            user: {
              select: USER_SELECT,
            },
          },
          orderBy: { createdAt: 'asc' },
        });
      },
      this.CACHE_TTL_REACTIONS
    );
  }

  /**
   * Check if message exists and user is participant (atomic authorization check)
   * Used to prevent TOCTOU (Time-of-check to time-of-use) vulnerabilities
   */
  async findMessageWithParticipantCheck(messageId: string, userId: string): Promise<{ id: string } | null> {
    return this.prisma.message.findFirst({
      where: {
        id: messageId,
        room: {
          participants: {
            some: { userId }
          }
        }
      },
      select: { id: true }
    });
  }
}

