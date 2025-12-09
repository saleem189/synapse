/**
 * Error Handler Unit Tests
 * 
 * Tests for centralized error handling and error response formatting
 */

import { NextResponse } from 'next/server';
import { handleError } from '@/lib/errors/error-handler';
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  AppError,
} from '@/lib/errors';
import { ZodError, z } from 'zod';

// Mock logger to avoid side effects
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('ErrorHandler', () => {
  describe('handleError', () => {
    it('should handle ValidationError', () => {
      const error = new ValidationError('Invalid input');
      const response = handleError(error);

      expect(response.status).toBe(400);
      expect(response).toBeInstanceOf(NextResponse);
    });

    it('should handle NotFoundError', () => {
      const error = new NotFoundError('Resource not found');
      const response = handleError(error);

      expect(response.status).toBe(404);
    });

    it('should handle UnauthorizedError', () => {
      const error = new UnauthorizedError('Not authenticated');
      const response = handleError(error);

      expect(response.status).toBe(401);
    });

    it('should handle ForbiddenError', () => {
      const error = new ForbiddenError('Access denied');
      const response = handleError(error);

      expect(response.status).toBe(403);
    });

    it('should handle ZodError', () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      });

      try {
        schema.parse({ name: '', email: 'invalid' });
      } catch (err) {
        const response = handleError(err as ZodError);

        expect(response.status).toBe(400);
      }
    });

    it('should handle unknown errors', () => {
      const error = new Error('Unexpected error');
      const response = handleError(error);

      expect(response.status).toBe(500);
    });

    it('should handle non-Error objects', () => {
      const response = handleError('String error');

      expect(response.status).toBe(500);
    });

    it('should include error details in response', async () => {
      const error = new ValidationError('Invalid input', [
        { path: ['email'], message: 'Invalid email' },
      ]);
      const response = handleError(error);
      const json = await response.json();

      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.message).toBe('Invalid input');
    });
  });

  describe('Error response format', () => {
    it('should format AppError correctly', async () => {
      const error = new ValidationError('Test error');
      const response = handleError(error);
      const json = await response.json();

      expect(json).toHaveProperty('error');
      expect(json.error).toHaveProperty('code');
      expect(json.error).toHaveProperty('message');
    });

    it('should format ZodError correctly', async () => {
      const schema = z.object({ name: z.string().min(1) });
      try {
        schema.parse({ name: '' });
      } catch (err) {
        const response = handleError(err as ZodError);
        const json = await response.json();

        expect(json).toHaveProperty('error');
        expect(json.error.code).toBe('VALIDATION_ERROR');
        expect(json.error).toHaveProperty('details');
      }
    });
  });
});

