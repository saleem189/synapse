// ================================
// User Repository
// ================================
// Data access layer for users

import { PrismaClient, User, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';
import { CacheService } from '@/lib/cache/cache.service';

export type UserWithRelations = Prisma.UserGetPayload<{
  select: {
    id: true;
    name: true;
    email: true;
    avatar: true;
    role: true;
    status: true;
    lastSeen: true;
    createdAt: true;
    updatedAt: true;
  };
}>;

export class UserRepository extends BaseRepository<
  User,
  Prisma.UserCreateInput,
  Prisma.UserUpdateInput
> {
  private cache: CacheService;
  
  // Cache TTLs (in seconds)
  private readonly CACHE_TTL_USER = 300; // 5 minutes

  constructor(prisma: PrismaClient, cache: CacheService) {
    super(prisma, 'user');
    this.cache = cache;
  }

  /**
   * Find user by email
   * Cached for performance
   */
  async findByEmail(email: string): Promise<User | null> {
    const cacheKey = `user:email:${email}`;
    
    return await this.cache.getOrSet(
      cacheKey,
      async () => {
        return await this.prisma.user.findUnique({
          where: { email },
        });
      },
      this.CACHE_TTL_USER
    );
  }

  /**
   * Update user avatar
   * Invalidates cache on update
   */
  async updateAvatar(userId: string, avatarUrl: string): Promise<User> {
    const result = await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
    });
    
    // Invalidate cache
    await this.cache.invalidateUser(userId);
    
    return result;
  }

  /**
   * Update user status
   * Invalidates cache on update
   */
  async updateStatus(userId: string, status: string): Promise<User> {
    const result = await this.prisma.user.update({
      where: { id: userId },
      data: { status, lastSeen: new Date() },
    });
    
    // Invalidate cache
    await this.cache.invalidateUser(userId);
    
    return result;
  }

  /**
   * Get all users (for admin or search)
   * Cached for performance (short TTL for search results)
   * Returns users without password field
   */
  async findAll(options?: {
    skip?: number;
    take?: number;
    search?: string;
  }): Promise<Omit<User, 'password'>[]> {
    const { skip, take, search } = options || {};
    
    // Cache key includes search params
    const cacheKey = `users:all:${skip || 0}:${take || 100}:${search || 'none'}`;
    
    return await this.cache.getOrSet(
      cacheKey,
      async () => {
        return await this.fetchAllUsers(skip, take, search);
      },
      search ? 60 : 300 // Shorter TTL for search results
    );
  }

  /**
   * Internal method to fetch users (without cache)
   */
  private async fetchAllUsers(skip?: number, take?: number, search?: string): Promise<Omit<User, 'password'>[]> {
    return await this.prisma.user.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      // Don't select password for security
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        status: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Override findById to add caching
   */
  async findById(id: string): Promise<User | null> {
    const cacheKey = `user:${id}`;
    
    return await this.cache.getOrSet(
      cacheKey,
      async () => {
        return await super.findById(id);
      },
      this.CACHE_TTL_USER
    );
  }

  /**
   * Override update to invalidate cache
   */
  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    const result = await super.update(id, data);
    
    // Invalidate cache
    await this.cache.invalidateUser(id);
    
    return result;
  }
}

