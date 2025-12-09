/**
 * UserRepository Unit Tests
 * 
 * Tests for user repository database operations
 */

import { UserRepository } from '@/lib/repositories/user.repository';
import { PrismaClient } from '@prisma/client';
import type { ILogger } from '@/lib/logger/logger.interface';
import type { CacheService } from '@/lib/cache/cache.service';

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
} as unknown as PrismaClient;

// Mock logger
const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  performance: jest.fn(),
} as unknown as ILogger;

// Mock cache service
const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  invalidate: jest.fn(),
  getOrSet: jest.fn(),
} as unknown as CacheService;

describe('UserRepository', () => {
  let userRepository: UserRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    userRepository = new UserRepository(mockPrisma, mockCacheService);
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        status: 'ONLINE',
        role: 'USER',
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockCacheService.get as jest.Mock).mockResolvedValue(null);

      const result = await userRepository.findById('user-123');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockCacheService.get as jest.Mock).mockResolvedValue(null);

      const result = await userRepository.findById('non-existent');

      expect(result).toBeNull();
    });

    it('should use cache if available', async () => {
      const cachedUser = {
        id: 'user-123',
        name: 'Cached User',
      };

      (mockCacheService.get as jest.Mock).mockResolvedValue(cachedUser);

      const result = await userRepository.findById('user-123');

      expect(mockCacheService.get).toHaveBeenCalled();
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual(cachedUser);
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await userRepository.findByEmail('test@example.com');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findAll', () => {
    it('should find all users', async () => {
      const mockUsers = [
        { id: 'user-1', name: 'User 1' },
        { id: 'user-2', name: 'User 2' },
      ];

      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const result = await userRepository.findAll();

      expect(mockPrisma.user.findMany).toHaveBeenCalled();
      expect(result).toEqual(mockUsers);
    });

    it('should filter by status if provided', async () => {
      const mockUsers = [{ id: 'user-1', status: 'ONLINE' }];

      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      await userRepository.findAll({ search: 'test' });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'test', mode: 'insensitive' } },
            { email: { contains: 'test', mode: 'insensitive' } },
          ],
        },
      });
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        name: 'New User',
        email: 'new@example.com',
        password: 'hashed-password',
      };

      const createdUser = {
        id: 'user-123',
        ...userData,
        role: 'USER',
        status: 'OFFLINE',
        createdAt: new Date(),
      };

      (mockPrisma.user.create as jest.Mock).mockResolvedValue(createdUser);

      const result = await userRepository.create(userData);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: userData,
      });
      expect(result).toEqual(createdUser);
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      const updateData = {
        name: 'Updated Name',
        status: 'ONLINE' as const,
      };

      const updatedUser = {
        id: 'user-123',
        ...updateData,
        email: 'test@example.com',
      };

      (mockPrisma.user.update as jest.Mock).mockResolvedValue(updatedUser);
      (mockCacheService.delete as jest.Mock).mockResolvedValue(undefined);

      const result = await userRepository.update('user-123', updateData);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: updateData,
      });
      expect(mockCacheService.delete).toHaveBeenCalled();
      expect(result).toEqual(updatedUser);
    });
  });

  describe('delete', () => {
    it('should delete user', async () => {
      (mockPrisma.user.delete as jest.Mock).mockResolvedValue({ id: 'user-123' });
      (mockCacheService.delete as jest.Mock).mockResolvedValue(undefined);

      await userRepository.delete('user-123');

      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
      expect(mockCacheService.delete).toHaveBeenCalled();
    });
  });
});

