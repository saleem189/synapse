/**
 * API Client Unit Tests
 * 
 * Tests for the centralized API client error handling, retry logic, and request/response processing
 */

import { apiClient, ApiError } from '@/lib/api-client';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}));

// Mock next-auth session
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('ApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('GET requests', () => {
    it('should make a successful GET request', async () => {
      const mockData = { id: '1', name: 'Test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      const result = await apiClient.get<typeof mockData>('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result).toEqual(mockData);
    });

    it('should handle 404 errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      await expect(apiClient.get('/test')).rejects.toThrow(ApiError);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(apiClient.get('/test')).rejects.toThrow('Network error');
    });
  });

  describe('POST requests', () => {
    it('should make a successful POST request with data', async () => {
      const requestData = { name: 'Test Room' };
      const responseData = { id: '1', ...requestData };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => responseData,
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      const result = await apiClient.post('/rooms', requestData);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/rooms',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestData),
        })
      );
      expect(result).toEqual(responseData);
    });
  });

  describe('Error handling', () => {
    it('should handle 401 Unauthorized errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      await expect(apiClient.get('/test')).rejects.toThrow(ApiError);
    });

    it('should handle 403 Forbidden errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Forbidden' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      await expect(apiClient.get('/test')).rejects.toThrow(ApiError);
    });

    it('should handle 500 Server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      await expect(apiClient.get('/test')).rejects.toThrow(ApiError);
    });
  });

  describe('Retry logic', () => {
    it('should retry on network errors', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
          headers: new Headers({ 'content-type': 'application/json' }),
        } as Response);

      const result = await apiClient.get('/test', { retries: 1, retryDelay: 10 });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ success: true });
    });

    it('should not retry on 4xx errors (except 408, 429)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Bad request' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      await expect(apiClient.get('/test', { retries: 2 })).rejects.toThrow(ApiError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on 429 Rate Limit errors', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: async () => ({ error: 'Too many requests' }),
          headers: new Headers({ 'content-type': 'application/json' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
          headers: new Headers({ 'content-type': 'application/json' }),
        } as Response);

      const result = await apiClient.get('/test', { retries: 1, retryDelay: 10 });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ success: true });
    });
  });

  describe('File upload', () => {
    it('should handle file uploads with FormData', async () => {
      const formData = new FormData();
      formData.append('file', new Blob(['test']), 'test.txt');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: 'https://example.com/file.txt' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      const result = await apiClient.upload('/upload', formData);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/upload',
        expect.objectContaining({
          method: 'POST',
          body: formData,
        })
      );
      // Verify Content-Type is not set (browser will set it with boundary)
      const callArgs = mockFetch.mock.calls[0][1];
      if (callArgs?.headers) {
        const headers = callArgs.headers as Headers;
        expect(headers.get('Content-Type')).toBeNull();
      }
      expect(result).toEqual({ url: 'https://example.com/file.txt' });
    });
  });
});

