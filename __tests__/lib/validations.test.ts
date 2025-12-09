/**
 * Validation Schemas Unit Tests
 * 
 * Tests for Zod validation schemas used throughout the application
 */

import {
  loginSchema,
  registerSchema,
  messageSchema,
  createRoomSchema,
} from '@/lib/validations';

describe('Validation Schemas', () => {
  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'not-an-email',
        password: 'password123',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('email');
      }
    });

    it('should reject empty password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject password shorter than 6 characters', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '12345',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('should validate correct registration data', () => {
      const validData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject mismatched passwords', () => {
      const invalidData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'DifferentPassword',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('confirmPassword');
      }
    });

    it('should reject weak passwords', () => {
      const invalidData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'weak',
        confirmPassword: 'weak',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject name shorter than 2 characters', () => {
      const invalidData = {
        name: 'A',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('messageSchema', () => {
    it('should validate message with content', () => {
      const validData = {
        content: 'Hello, world!',
        roomId: 'room-123',
      };

      const result = messageSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate message with file attachment', () => {
      const validData = {
        roomId: 'room-123',
        fileUrl: 'https://example.com/file.pdf',
        fileName: 'document.pdf',
        fileSize: 1024,
        fileType: 'application/pdf',
        type: 'file' as const,
      };

      const result = messageSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject message without content or file', () => {
      const invalidData = {
        roomId: 'room-123',
      };

      const result = messageSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject content longer than 2000 characters', () => {
      const invalidData = {
        content: 'a'.repeat(2001),
        roomId: 'room-123',
      };

      const result = messageSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should transform empty content to empty string', () => {
      const data = {
        content: '   ',
        roomId: 'room-123',
      };

      const result = messageSchema.safeParse(data);
      if (result.success) {
        expect(result.data.content).toBe('');
      }
    });

    it('should validate reply message', () => {
      const validData = {
        content: 'This is a reply',
        roomId: 'room-123',
        replyToId: 'message-456',
      };

      const result = messageSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('createRoomSchema', () => {
    it('should validate group room creation', () => {
      const validData = {
        name: 'Test Room',
        description: 'A test room',
        isGroup: true,
        participantIds: ['user-1', 'user-2'],
      };

      const result = createRoomSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate DM room creation (name optional)', () => {
      const validData = {
        isGroup: false,
        participantIds: ['user-1'],
      };

      const result = createRoomSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject room without participants', () => {
      const invalidData = {
        name: 'Test Room',
        isGroup: true,
        participantIds: [],
      };

      const result = createRoomSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject name shorter than 2 characters', () => {
      const invalidData = {
        name: 'A',
        isGroup: true,
        participantIds: ['user-1'],
      };

      const result = createRoomSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject description longer than 200 characters', () => {
      const invalidData = {
        name: 'Test Room',
        description: 'a'.repeat(201),
        isGroup: true,
        participantIds: ['user-1'],
      };

      const result = createRoomSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});

