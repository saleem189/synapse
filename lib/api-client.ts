// ================================
// API Client
// ================================
// Centralized HTTP client for all API requests
// Provides consistent error handling, request/response interceptors, and retry logic

"use client";

import { toast } from "sonner";

/**
 * API Error data structure
 */
export interface ApiErrorData {
  error?: string | { code?: string; message: string; details?: Record<string, unknown> };
  message?: string;
  details?: Record<string, unknown>;
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: ApiErrorData
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Request options with additional features
 */
interface RequestOptions extends RequestInit {
  showErrorToast?: boolean; // Show toast on error (default: true)
  skipErrorHandling?: boolean; // Skip automatic error handling
  retries?: number; // Number of retry attempts (default: 0)
  retryDelay?: number; // Delay between retries in ms (default: 1000)
}

/**
 * API Client class
 * Handles all HTTP requests with consistent error handling and retry logic
 */
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = "/api") {
    this.baseURL = baseURL;
  }

  /**
   * Get authentication token from session
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Try to get session token if available
    try {
      const sessionRes = await fetch("/api/auth/session");
      if (sessionRes.ok) {
        const session = await sessionRes.json();
        // Add auth headers if needed (e.g., Bearer token)
        // if (session?.token) {
        //   headers["Authorization"] = `Bearer ${session.token}`;
        // }
      }
      // If sessionRes is not ok, silently continue - not all requests need auth
      // Errors from NextAuth URL construction are logged server-side but don't block requests
    } catch (error) {
      // Silently fail - not all requests need auth
      // NextAuth URL construction errors are handled server-side
    }

    return headers;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Handle error response
   */
  private async handleErrorResponse(
    response: Response,
    showErrorToast: boolean
  ): Promise<never> {
    let errorData: ApiErrorData;
    try {
      errorData = await response.json() as ApiErrorData;
    } catch {
      errorData = { error: "Unknown error occurred" };
    }

    // Handle nested error object structure: {error: {code, message}}
    const errorMessage =
      (typeof errorData.error === 'object' && errorData.error?.message) ||
      (typeof errorData.error === 'string' && errorData.error) ||
      errorData.message ||
      `Request failed with status ${response.status}`;

    // Don't show toast for authentication errors (401, 403) - these are handled by auth system
    // Show toast for important 404 errors (like "User not found") but not for resource not found
    const isImportant404 = response.status === 404 && 
      (errorMessage.toLowerCase().includes('user not found') ||
       errorMessage.toLowerCase().includes('please log out'));
    
    const shouldShowToast = showErrorToast &&
      response.status !== 401 &&
      response.status !== 403 &&
      (response.status !== 404 || isImportant404);

    if (shouldShowToast) {
      toast.error(errorMessage);
    }

    throw new ApiError(errorMessage, response.status, errorData);
  }

  /**
   * Main request method with retry logic
   */
  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      showErrorToast = true,
      skipErrorHandling = false,
      retries = 0,
      retryDelay = 1000,
      ...fetchOptions
    } = options;

    const url = `${this.baseURL}${endpoint}`;
    const headers = await this.getAuthHeaders();

    // Merge headers
    const requestHeaders = new Headers(headers);
    if (fetchOptions.headers) {
      const providedHeaders = new Headers(fetchOptions.headers);
      providedHeaders.forEach((value, key) => {
        requestHeaders.set(key, value);
      });
    }

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= retries) {
      try {
        const response = await fetch(url, {
          ...fetchOptions,
          headers: requestHeaders,
        });

        if (!response.ok) {
          if (skipErrorHandling) {
            const errorData = await response.json().catch(() => ({}));
            throw new ApiError(
              errorData.error || `Request failed with status ${response.status}`,
              response.status,
              errorData
            );
          }
          await this.handleErrorResponse(response, showErrorToast);
        }

        // Handle empty responses
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          return {} as T;
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx) except 408, 429
        if (error instanceof ApiError) {
          if (error.status >= 400 && error.status < 500) {
            if (error.status !== 408 && error.status !== 429) {
              throw error;
            }
          }
        }

        // Retry logic
        if (attempt < retries) {
          attempt++;
          await this.sleep(retryDelay * attempt); // Exponential backoff
          continue;
        }

        // All retries exhausted
        // Don't show toast for authentication errors or network errors that might be temporary
        if (showErrorToast && !skipErrorHandling) {
          const isAuthError = lastError instanceof ApiError &&
            (lastError.status === 401 || lastError.status === 403);

          // Don't show toast for auth errors (handled by auth system)
          // Don't show toast for network errors (might be temporary)
          const isNetworkError = lastError instanceof Error &&
            (lastError.message.includes('fetch') || lastError.message.includes('network'));

          if (!isAuthError && !isNetworkError) {
            toast.error(
              lastError instanceof ApiError
                ? lastError.message
                : "Request failed. Please try again."
            );
          }
        }
        throw lastError;
      }
    }

    throw lastError || new Error("Request failed");
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  /**
   * Upload file (multipart/form-data)
   */
  async upload<T>(
    endpoint: string,
    formData: FormData,
    options?: RequestOptions
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const authHeaders = await this.getAuthHeaders();

    // For FormData, we must NOT set Content-Type - browser will set it automatically with boundary
    // Remove Content-Type from any headers
    const uploadHeaders: HeadersInit = {};
    if (authHeaders) {
      Object.entries(authHeaders).forEach(([key, value]) => {
        if (key.toLowerCase() !== "content-type") {
          uploadHeaders[key] = value;
        }
      });
    }

    // Merge with any provided headers (but still exclude Content-Type)
    if (options?.headers) {
      const providedHeaders = new Headers(options.headers);
      providedHeaders.forEach((value, key) => {
        if (key.toLowerCase() !== "content-type") {
          uploadHeaders[key] = value;
        }
      });
    }

    const {
      showErrorToast = true,
      skipErrorHandling = false,
      retries = 0,
      ...fetchOptions
    } = options || {};

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= retries) {
      try {
        const response = await fetch(url, {
          ...fetchOptions,
          method: "POST",
          headers: uploadHeaders, // Don't set Content-Type - let browser handle it
          body: formData,
        });

        if (!response.ok) {
          if (skipErrorHandling) {
            const errorData = await response.json().catch(() => ({}));
            throw new ApiError(
              errorData.error || `Request failed with status ${response.status}`,
              response.status,
              errorData
            );
          }
          await this.handleErrorResponse(response, showErrorToast);
        }

        // Handle empty responses
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          return {} as T;
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx) except 408, 429
        if (error instanceof ApiError) {
          if (error.status >= 400 && error.status < 500) {
            if (error.status !== 408 && error.status !== 429) {
              throw error;
            }
          }
        } else if (error instanceof Error && error.name === "AbortError") {
          throw error;
        }

        // Retry logic
        if (attempt < retries) {
          attempt++;
          await this.sleep(1000 * attempt); // Exponential backoff
          continue;
        }

        // All retries exhausted
        if (showErrorToast && !skipErrorHandling) {
          toast.error(
            lastError instanceof ApiError
              ? lastError.message
              : "Request failed. Please try again."
          );
        }
        throw lastError;
      }
    }

    throw lastError || new Error("Request failed");
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export default for convenience
export default apiClient;

