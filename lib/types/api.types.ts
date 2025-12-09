// ================================
// API Types
// ================================
// Shared TypeScript types for API requests and responses

/**
 * Standard API error response
 */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Standard API success response
 */
export interface ApiSuccess<T = unknown> {
  data?: T;
  message?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  limit?: number;
  cursor?: string;
  skip?: number;
}

/**
 * Search parameters
 */
export interface SearchParams {
  query: string;
  limit?: number;
}

/**
 * File upload response
 */
export interface FileUploadResponse {
  url: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

