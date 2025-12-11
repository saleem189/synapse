// ================================
// Admin Service
// ================================
// Business logic for admin operations

import { UserRepository } from '../repositories/user.repository';
import { RoomRepository } from '../repositories/room.repository';
import { MessageRepository } from '../repositories/message.repository';
import { ForbiddenError, NotFoundError, ValidationError } from '../errors';
import { Prisma } from '@prisma/client';
import type { UserRole, UserStatus } from '@/lib/types/user.types';

export class AdminService {
  private userRepository: UserRepository;
  private roomRepository: RoomRepository;
  private messageRepository: MessageRepository;

  constructor(
    userRepository: UserRepository,
    roomRepository: RoomRepository,
    messageRepository: MessageRepository
  ) {
    this.userRepository = userRepository;
    this.roomRepository = roomRepository;
    this.messageRepository = messageRepository;
  }

  /**
   * Get all users with statistics
   * Supports pagination and search
   */
  async getAllUsers(options?: {
    skip?: number;
    take?: number;
    search?: string;
  }) {
    const prisma = this.userRepository.getPrismaClient();
    const { skip = 0, take = 50, search } = options || {};
    
    return prisma.user.findMany({
      where: search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      } : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        lastSeen: true,
        createdAt: true,
        _count: {
          select: {
            messages: true,
            rooms: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  /**
   * Update user (admin only)
   */
  async updateUser(userId: string, data: { name?: string; email?: string; role?: UserRole; status?: UserStatus }) {
    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.role) updateData.role = data.role;
    if (data.status) updateData.status = data.status;

    const updatedUser = await this.userRepository.update(userId, updateData);
    
    // Return only the fields we want to expose
    return {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.status,
    };
  }

  /**
   * Delete user (admin only)
   */
  async deleteUser(userId: string) {
    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    await this.userRepository.delete(userId);
    return { message: 'User deleted successfully' };
  }

  /**
   * Get all rooms with statistics
   * Supports pagination and search
   */
  async getAllRooms(options?: {
    skip?: number;
    take?: number;
    search?: string;
  }) {
    const prisma = this.roomRepository.getPrismaClient();
    const { skip = 0, take = 50, search } = options || {};
    
    return prisma.chatRoom.findMany({
      where: search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      } : undefined,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            messages: true,
            participants: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  /**
   * Get application statistics
   * Includes total counts, recent users, and messages per day
   */
  async getStats() {
    const prisma = this.userRepository.getPrismaClient();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [totalUsers, totalMessages, totalRooms, messagesThisHour, recentUsers, messagesPerDay] = await Promise.all([
      prisma.user.count(),
      prisma.message.count(),
      prisma.chatRoom.count(),
      prisma.message.count({
        where: {
          createdAt: { gte: oneHourAgo },
        },
      }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.message.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: { gte: sevenDaysAgo },
        },
        _count: true,
      }),
    ]);

    return {
      totalUsers,
      totalMessages,
      totalRooms,
      messagesThisHour,
      recentUsers,
      messagesPerDay,
    };
  }

  /**
   * Delete room (admin only)
   */
  async deleteRoom(roomId: string) {
    if (!roomId) {
      throw new ValidationError('Room ID is required');
    }

    const room = await this.roomRepository.findById(roomId);
    if (!room) {
      throw new NotFoundError('Room not found');
    }

    await this.roomRepository.delete(roomId);
    return { message: 'Room deleted successfully' };
  }
}

