// ================================
// Room Service
// ================================
// Business logic layer for chat rooms

import { RoomRepository, RoomWithRelations } from '@/lib/repositories/room.repository';
import { UserRepository } from '@/lib/repositories/user.repository';
import { ValidationError, NotFoundError, ForbiddenError } from '@/lib/errors';
import { createRoomSchema } from '@/lib/validations';
import { VALIDATION } from '@/lib/constants';
import { ERROR_MESSAGES } from '@/lib/errors/error-messages';
import { prisma } from '@/lib/prisma';

export class RoomService {
  constructor(
    private roomRepo: RoomRepository,
    private userRepo: UserRepository
  ) {}

  /**
   * Check if user is a room admin (owner or participant with admin role)
   */
  async isRoomAdmin(roomId: string, userId: string): Promise<boolean> {
    const room = await this.roomRepo.findById(roomId);
    if (!room) return false;

    // Room owner is always admin
    if (room.ownerId === userId) return true;

    // Check participant role
    const role = await this.roomRepo.getParticipantRole(roomId, userId);
    return role === 'admin';
  }

  /**
   * Get all rooms for a user
   */
  async getUserRooms(userId: string): Promise<Array<{
    id: string;
    name: string;
    isGroup: boolean;
    lastMessage?: {
      content: string;
      createdAt: string;
      senderName: string;
    };
    participants: Array<{
      id: string;
      name: string;
      avatar: string | null;
      status: string;
    }>;
  }>> {
    const rooms = await this.roomRepo.findByUserId(userId);

    return rooms.map((room) => ({
      id: room.id,
      name: room.name,
      isGroup: room.isGroup,
      lastMessage: room.messages?.[0]?.sender
        ? {
            content: room.messages[0]!.content,
            createdAt: room.messages[0]!.createdAt.toISOString(),
            senderName: room.messages[0]!.sender.name,
          }
        : undefined,
      participants: room.participants.map((p) => ({
        id: p.user.id,
        name: p.user.name,
        avatar: p.user.avatar,
        status: p.user.status || 'offline',
      })),
    }));
  }

  /**
   * Create a direct message (DM) or find existing
   */
  async createOrFindDM(
    userId: string,
    otherUserId: string
  ): Promise<{ room: RoomWithRelations; existing: boolean }> {
    // Validate other user exists
    const otherUser = await this.userRepo.findById(otherUserId);
    if (!otherUser) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Check if DM already exists
    const existingRooms = await this.roomRepo.findByUserId(userId);
    const existingDM = existingRooms.find(
      (room) =>
        !room.isGroup &&
        room.participants.some((p) => p.user.id === otherUserId) &&
        room.participants.some((p) => p.user.id === userId)
    );

    if (existingDM) {
      return { room: existingDM, existing: true };
    }

    // CRITICAL FIX: Use transaction to ensure atomic room creation and participant addition
    const { room, roomWithRelations } = await prisma.$transaction(async (tx) => {
      // Create room
      const createdRoom = await tx.chatRoom.create({
        data: {
          name: otherUser.name || 'Direct Message',
          isGroup: false,
          ownerId: userId,
        },
      });

      // Add participants atomically
      await tx.roomParticipant.createMany({
        data: [
          { roomId: createdRoom.id, userId, role: 'admin' },
          { roomId: createdRoom.id, userId: otherUserId, role: 'member' },
        ],
      });

      // Fetch room with relations
      const roomWithRelations = await tx.chatRoom.findUnique({
        where: { id: createdRoom.id },
        include: {
          owner: {
            select: { id: true, name: true, avatar: true },
          },
          participants: {
            include: {
              user: {
                select: { id: true, name: true, avatar: true, email: true, status: true },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: {
              sender: {
                select: { id: true, name: true, avatar: true },
              },
            },
          },
        },
      });

      if (!roomWithRelations) {
        throw new NotFoundError(ERROR_MESSAGES.ROOM_NOT_FOUND);
      }

      return { room: createdRoom, roomWithRelations };
    });

    return { room: roomWithRelations, existing: false };
  }

  /**
   * Create a group chat
   */
  async createGroup(
    userId: string,
    name: string,
    participantIds: string[],
    description?: string
  ): Promise<RoomWithRelations> {
    // Validate input
    if (!name || name.trim().length < VALIDATION.MIN_ROOM_NAME_LENGTH) {
      throw new ValidationError(ERROR_MESSAGES.GROUP_NAME_REQUIRED);
    }

    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      throw new ValidationError(ERROR_MESSAGES.PARTICIPANTS_REQUIRED);
    }

    // Filter valid participant IDs
    const validParticipantIds = participantIds.filter(
      (id) => id && typeof id === 'string' && id.trim().length > 0
    );

    if (validParticipantIds.length === 0) {
      throw new ValidationError(ERROR_MESSAGES.INVALID_PARTICIPANT_IDS);
    }

    // Validate all participants exist (batch query to avoid N+1)
    const users = await this.userRepo.findMany({
      where: { id: { in: validParticipantIds } }
    });

    if (users.length !== validParticipantIds.length) {
      const foundIds = new Set(users.map(u => u.id));
      const missingIds = validParticipantIds.filter(id => !foundIds.has(id));
      throw new NotFoundError(`${ERROR_MESSAGES.USER_NOT_FOUND}: ${missingIds.join(', ')}`);
    }

    // CRITICAL FIX: Use transaction to ensure atomic room creation and participant addition
    const roomWithRelations = await prisma.$transaction(async (tx) => {
      // Create group room
      const createdRoom = await tx.chatRoom.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          isGroup: true,
          ownerId: userId,
        },
      });

      // Add all participants atomically (owner as admin, others as members)
      const participantData = [
        { roomId: createdRoom.id, userId, role: 'admin' },
        ...validParticipantIds
          .filter(id => id !== userId) // Don't add owner twice
          .map(participantId => ({
            roomId: createdRoom.id,
            userId: participantId,
            role: 'member' as const,
          })),
      ];

      await tx.roomParticipant.createMany({
        data: participantData,
      });

      // Fetch room with relations
      const roomWithRelations = await tx.chatRoom.findUnique({
        where: { id: createdRoom.id },
        include: {
          owner: {
            select: { id: true, name: true, avatar: true },
          },
          participants: {
            include: {
              user: {
                select: { id: true, name: true, avatar: true, email: true, status: true },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: {
              sender: {
                select: { id: true, name: true, avatar: true },
              },
            },
          },
        },
      });

      if (!roomWithRelations) {
        throw new NotFoundError(ERROR_MESSAGES.ROOM_NOT_FOUND);
      }

      return roomWithRelations;
    });

    return roomWithRelations;
  }

  /**
   * Update room settings (admin only)
   */
  async updateRoom(
    roomId: string,
    userId: string,
    updates: {
      name?: string;
      description?: string;
      avatar?: string;
    }
  ): Promise<RoomWithRelations> {
    // Check if user is admin
    const isAdmin = await this.isRoomAdmin(roomId, userId);
    if (!isAdmin) {
      throw new ForbiddenError(ERROR_MESSAGES.ROOM_ADMIN_REQUIRED);
    }

    // Validate name if provided
    if (updates.name !== undefined && updates.name.trim().length < VALIDATION.MIN_ROOM_NAME_LENGTH) {
      throw new ValidationError(`Room name must be at least ${VALIDATION.MIN_ROOM_NAME_LENGTH} characters`);
    }

    // Update room
    await this.roomRepo.update(roomId, {
      ...(updates.name && { name: updates.name.trim() }),
      ...(updates.description !== undefined && {
        description: updates.description?.trim() || null,
      }),
      ...(updates.avatar !== undefined && { avatar: updates.avatar }),
    });

    const updatedRoom = await this.roomRepo.findByIdWithRelations(roomId);
    if (!updatedRoom) {
      throw new NotFoundError(ERROR_MESSAGES.ROOM_NOT_FOUND);
    }

    return updatedRoom;
  }

  /**
   * Add members to room (admin only)
   */
  async addMembers(
    roomId: string,
    userId: string,
    memberIds: string[]
  ): Promise<{ added: string[] }> {
    // Check if user is admin
    const isAdmin = await this.isRoomAdmin(roomId, userId);
    if (!isAdmin) {
      throw new ForbiddenError(ERROR_MESSAGES.ROOM_ADMIN_REQUIRED);
    }

    // Validate input
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      throw new ValidationError(ERROR_MESSAGES.PARTICIPANTS_REQUIRED);
    }

    // Check if room is a group
    const room = await this.roomRepo.findById(roomId);
    if (!room) {
      throw new NotFoundError(ERROR_MESSAGES.ROOM_NOT_FOUND);
    }

    if (!room.isGroup) {
      throw new ValidationError(ERROR_MESSAGES.CAN_ONLY_ADD_TO_GROUP);
    }

    // Batch validate users exist
    const users = await this.userRepo.findMany({
      where: { id: { in: memberIds } }
    });
    const validUserIds = new Set(users.map(u => u.id));

    // Batch check existing participants
    const existingParticipants = await this.roomRepo.findParticipantsByRoomAndUsers(roomId, memberIds);
    const existingParticipantIds = new Set(
      existingParticipants.map(p => p.userId)
    );

    // Filter new participants and add in batch
    const newParticipantIds = memberIds.filter(
      id => validUserIds.has(id) && !existingParticipantIds.has(id)
    );

    if (newParticipantIds.length > 0) {
      await Promise.all(
        newParticipantIds.map(userId =>
          this.roomRepo.addParticipant(roomId, userId, 'member')
        )
      );
    }

    return { added: newParticipantIds };
  }

  /**
   * Remove member from room (admin only)
   */
  async removeMember(
    roomId: string,
    userId: string,
    memberIdToRemove: string
  ): Promise<void> {
    // Check if user is admin
    const isAdmin = await this.isRoomAdmin(roomId, userId);
    if (!isAdmin) {
      throw new ForbiddenError(ERROR_MESSAGES.ROOM_ADMIN_REQUIRED);
    }

    // Check if trying to remove owner
    const room = await this.roomRepo.findById(roomId);
    if (!room) {
      throw new NotFoundError(ERROR_MESSAGES.ROOM_NOT_FOUND);
    }

    if (room.ownerId === memberIdToRemove) {
      throw new ValidationError(ERROR_MESSAGES.CANNOT_REMOVE_OWNER);
    }

    // Check if user is participant
    const isParticipant = await this.roomRepo.isParticipant(roomId, memberIdToRemove);
    if (!isParticipant) {
      throw new NotFoundError(ERROR_MESSAGES.NOT_MEMBER);
    }

    // Remove participant
    await this.roomRepo.removeParticipant(roomId, memberIdToRemove);
  }

  /**
   * Leave room
   */
  async leaveRoom(roomId: string, userId: string): Promise<void> {
    const room = await this.roomRepo.findById(roomId);
    if (!room) {
      throw new NotFoundError(ERROR_MESSAGES.ROOM_NOT_FOUND);
    }

    // Check if user is participant
    const isParticipant = await this.roomRepo.isParticipant(roomId, userId);
    if (!isParticipant) {
      throw new ForbiddenError(ERROR_MESSAGES.NOT_MEMBER);
    }

    // Can't leave if you're the owner
    if (room.ownerId === userId) {
      throw new ValidationError(ERROR_MESSAGES.OWNER_CANNOT_LEAVE);
    }

    // Remove participant
    await this.roomRepo.removeParticipant(roomId, userId);
  }

  /**
   * Get room by ID with relations
   */
  async getRoomById(roomId: string, userId: string): Promise<RoomWithRelations> {
    // Check if user is participant
    const isParticipant = await this.roomRepo.isParticipant(roomId, userId);
    if (!isParticipant) {
      throw new ForbiddenError(ERROR_MESSAGES.ACCESS_DENIED);
    }

    const room = await this.roomRepo.findByIdWithRelations(roomId);
    if (!room) {
      throw new NotFoundError(ERROR_MESSAGES.ROOM_NOT_FOUND);
    }

    return room;
  }

  /**
   * Update participant role (admin only)
   */
  async updateParticipantRole(
    roomId: string,
    userId: string,
    targetUserId: string,
    isAdmin: boolean
  ): Promise<void> {
    // Check if requester is admin
    const isRequesterAdmin = await this.isRoomAdmin(roomId, userId);
    if (!isRequesterAdmin) {
      throw new ForbiddenError(ERROR_MESSAGES.ROOM_ADMIN_REQUIRED);
    }

    // Check if target user is participant
    const isParticipant = await this.roomRepo.isParticipant(roomId, targetUserId);
    if (!isParticipant) {
      throw new NotFoundError(ERROR_MESSAGES.NOT_MEMBER);
    }

    // Update role
    await this.roomRepo.addParticipant(roomId, targetUserId, isAdmin ? 'admin' : 'member');
  }
}

