// ================================
// Room Repository
// ================================
// Data access layer for chat rooms

import { PrismaClient, ChatRoom, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';
import { USER_SELECT, USER_SELECT_WITH_EMAIL, ROOM_OWNER_SELECT, ROOM_PARTICIPANT_INCLUDE } from '@/lib/types/common-selects';
import { VALIDATION } from '@/lib/constants';
import { CacheService } from '@/lib/cache/cache.service';

export type RoomWithRelations = Prisma.ChatRoomGetPayload<{
  include: {
    owner: { select: { id: true; name: true; avatar: true } };
    participants: {
      include: {
        user: { select: { id: true; name: true; avatar: true; email: true; status: true } };
      };
    };
    messages: {
      take: 1;
      orderBy: { createdAt: 'desc' };
      include: {
        sender: { select: { id: true; name: true; avatar: true } };
      };
    };
  };
}>;

export class RoomRepository extends BaseRepository<
  ChatRoom,
  Prisma.ChatRoomCreateInput,
  Prisma.ChatRoomUpdateInput
> {
  private cache: CacheService;
  
  // Cache TTLs (in seconds)
  private readonly CACHE_TTL_ROOM = 300; // 5 minutes
  private readonly CACHE_TTL_ROOM_LIST = 120; // 2 minutes
  private readonly CACHE_TTL_PARTICIPANT = 300; // 5 minutes

  constructor(prisma: PrismaClient, cache: CacheService) {
    super(prisma, 'chatRoom');
    this.cache = cache;
  }

  /**
   * Check if user is a participant in a room
   * Cached for performance
   */
  async isParticipant(roomId: string, userId: string): Promise<boolean> {
    const cacheKey = `participant:${roomId}:${userId}`;
    
    const cached = await this.cache.get<boolean>(cacheKey);
    if (cached !== null) {
      return cached;
    }
    
    const participant = await this.prisma.roomParticipant.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
    });
    
    const isParticipant = !!participant;
    await this.cache.set(cacheKey, isParticipant, this.CACHE_TTL_PARTICIPANT);
    
    return isParticipant;
  }

  /**
   * Get room with all relations
   * Cached for performance
   */
  async findByIdWithRelations(roomId: string): Promise<RoomWithRelations | null> {
    const cacheKey = `room:${roomId}:full`;
    
    return await this.cache.getOrSet(
      cacheKey,
      async () => {
        const room = await this.prisma.chatRoom.findUnique({
          where: { id: roomId },
          include: {
            owner: {
              select: ROOM_OWNER_SELECT,
            },
            participants: {
              include: ROOM_PARTICIPANT_INCLUDE,
            },
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              include: {
                sender: {
                  select: USER_SELECT,
                },
              },
            },
          },
        });
        return room as RoomWithRelations | null;
      },
      this.CACHE_TTL_ROOM
    );
  }

  /**
   * Get all rooms for a user
   * Optimized: Fetches rooms directly and last messages separately to reduce query complexity
   * Cached for performance
   */
  async findByUserId(userId: string, options?: { limit?: number; skip?: number }): Promise<RoomWithRelations[]> {
    const { limit = VALIDATION.DEFAULT_PAGINATION, skip = 0 } = options || {};
    
    // Cache key includes pagination params
    const cacheKey = `rooms:user:${userId}:${limit}:${skip}`;
    
    return await this.cache.getOrSet(
      cacheKey,
      async () => {
        return await this.fetchRoomsForUser(userId, limit, skip);
      },
      this.CACHE_TTL_ROOM_LIST
    );
  }

  /**
   * Internal method to fetch rooms (without cache)
   */
  private async fetchRoomsForUser(userId: string, limit: number, skip: number): Promise<RoomWithRelations[]> {
    // Use direct room query with participant filter (more efficient)
    const rooms = await this.prisma.chatRoom.findMany({
      where: {
        participants: {
          some: { userId }
        }
      },
      include: {
        owner: {
          select: ROOM_OWNER_SELECT,
        },
        participants: {
          take: 10, // Limit participants per room to reduce data transfer (constant for UI display)
          include: ROOM_PARTICIPANT_INCLUDE,
        },
        _count: {
          select: {
            participants: true,
            messages: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip,
    });

    // Fetch last messages separately in batch (more efficient than nested includes)
    // Get the latest message for each room by fetching all messages and grouping
    const roomIds = rooms.map(r => r.id);
    
    if (roomIds.length === 0) {
      return [] as RoomWithRelations[];
    }

    // Fetch all messages for these rooms, ordered by creation date
    const allMessages = await this.prisma.message.findMany({
      where: {
        roomId: { in: roomIds },
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    // Group messages by roomId and take the first (latest) message for each room
    const messageMap = new Map<string, typeof allMessages[0]>();
    for (const message of allMessages) {
      if (!messageMap.has(message.roomId)) {
        messageMap.set(message.roomId, message);
      }
    }

    return rooms.map(room => ({
      ...room,
      messages: messageMap.get(room.id) ? [messageMap.get(room.id)!] : []
    })) as RoomWithRelations[];
  }

  /**
   * Add participant to room
   * Invalidates cache on update
   */
  async addParticipant(roomId: string, userId: string, role: string = 'member'): Promise<void> {
    await this.prisma.roomParticipant.upsert({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
      create: {
        userId,
        roomId,
        role,
      },
      update: {
        role,
      },
    });
    
    // Invalidate cache
    await Promise.all([
      this.cache.delete(`participant:${roomId}:${userId}`),
      this.cache.invalidate(`room:${roomId}*`),
      this.cache.invalidate(`rooms:user:${userId}*`),
    ]);
  }

  /**
   * Remove participant from room
   * Invalidates cache on update
   */
  async removeParticipant(roomId: string, userId: string): Promise<void> {
    await this.prisma.roomParticipant.deleteMany({
      where: {
        userId,
        roomId,
      },
    });
    
    // Invalidate cache
    await Promise.all([
      this.cache.delete(`participant:${roomId}:${userId}`),
      this.cache.invalidate(`room:${roomId}*`),
      this.cache.invalidate(`rooms:user:${userId}*`),
    ]);
  }

  /**
   * Get participant role
   */
  async getParticipantRole(roomId: string, userId: string): Promise<string | null> {
    const participant = await this.prisma.roomParticipant.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
    });
    return participant?.role || null;
  }

  /**
   * Find participants by room ID and user IDs
   * Used for batch checking existing participants
   */
  async findParticipantsByRoomAndUsers(roomId: string, userIds: string[]) {
    return this.prisma.roomParticipant.findMany({
      where: {
        roomId,
        userId: { in: userIds }
      },
      select: {
        userId: true
      }
    });
  }

  /**
   * Override update to invalidate cache
   */
  async update(id: string, data: Prisma.ChatRoomUpdateInput): Promise<ChatRoom> {
    const result = await super.update(id, data);
    
    // Invalidate cache
    await Promise.all([
      this.cache.invalidate(`room:${id}*`),
      this.cache.invalidate(`rooms:user:*`), // Invalidate all user room lists
    ]);
    
    return result;
  }

  /**
   * Override create to invalidate cache
   */
  async create(data: Prisma.ChatRoomCreateInput): Promise<ChatRoom> {
    const result = await super.create(data);
    
    // Invalidate user room lists (new room might be added to user's list)
    await this.cache.invalidate(`rooms:user:*`);
    
    return result;
  }
}

