// ================================
// useApi Hook
// ================================
// Generic hook for API calls with loading, error, and data states
// Provides consistent API request handling across components

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient, ApiError } from "@/lib/api-client";

export interface UseApiOptions<T> {
  immediate?: boolean; // Execute request immediately on mount (default: true)
  onSuccess?: (data: T) => void; // Callback on successful request
  onError?: (error: ApiError) => void; // Callback on error
  showErrorToast?: boolean; // Show error toast (default: true)
  skipErrorHandling?: boolean; // Skip automatic error handling
  retries?: number; // Number of retry attempts
}

export interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  execute: () => Promise<T | null>;
  reset: () => void;
}

/**
 * Generic hook for API GET requests
 * 
 * @example
 * ```tsx
 * const { data, loading, error, execute } = useApi<Room[]>('/rooms');
 * 
 * // Manual execution
 * const handleRefresh = () => {
 *   execute();
 * };
 * ```
 */
export function useApi<T>(
  endpoint: string,
  options: UseApiOptions<T> = {}
): UseApiReturn<T> {
  const {
    immediate = true,
    onSuccess,
    onError,
    showErrorToast = true,
    skipErrorHandling = false,
    retries = 0,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<ApiError | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Execute the API request
   */
  const execute = useCallback(async (): Promise<T | null> => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const result = await apiClient.get<T>(endpoint, {
        signal: abortControllerRef.current.signal,
        showErrorToast,
        skipErrorHandling,
        retries,
      });

      setData(result);
      onSuccess?.(result);
      return result;
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === "AbortError") {
        return null;
      }

      const apiError = err instanceof ApiError ? err : new ApiError(
        err instanceof Error ? err.message : "Unknown error",
        500
      );

      setError(apiError);
      onError?.(apiError);
      return null;
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [endpoint, showErrorToast, skipErrorHandling, retries, onSuccess, onError]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    // Cancel pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  // Execute on mount if immediate
  useEffect(() => {
    if (immediate) {
      execute();
    }

    // Cleanup: cancel request on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate]); // execute is stable due to useCallback with all dependencies listed

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
}

/**
 * Hook for API POST requests
 */
export function useApiPost<TData, TResponse = TData>(
  endpoint: string,
  options: UseApiOptions<TResponse> = {}
) {
  const {
    onSuccess,
    onError,
    showErrorToast = true,
    skipErrorHandling = false,
    retries = 0,
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [data, setData] = useState<TResponse | null>(null);

  const execute = useCallback(
    async (requestData?: TData): Promise<TResponse | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await apiClient.post<TResponse>(endpoint, requestData, {
          showErrorToast,
          skipErrorHandling,
          retries,
        });

        setData(result);
        onSuccess?.(result);
        return result;
      } catch (err) {
        const apiError = err instanceof ApiError ? err : new ApiError(
          err instanceof Error ? err.message : "Unknown error",
          500
        );

        setError(apiError);
        onError?.(apiError);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [endpoint, showErrorToast, skipErrorHandling, retries, onSuccess, onError]
  );

  return {
    data,
    loading,
    error,
    execute,
    reset: () => {
      setData(null);
      setError(null);
      setLoading(false);
    },
  };
}

/**
 * Hook for API PATCH requests
 */
export function useApiPatch<TData, TResponse = TData>(
  endpoint: string,
  options: UseApiOptions<TResponse> = {}
) {
  const {
    onSuccess,
    onError,
    showErrorToast = true,
    skipErrorHandling = false,
    retries = 0,
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [data, setData] = useState<TResponse | null>(null);

  const execute = useCallback(
    async (requestData?: TData): Promise<TResponse | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await apiClient.patch<TResponse>(endpoint, requestData, {
          showErrorToast,
          skipErrorHandling,
          retries,
        });

        setData(result);
        onSuccess?.(result);
        return result;
      } catch (err) {
        const apiError = err instanceof ApiError ? err : new ApiError(
          err instanceof Error ? err.message : "Unknown error",
          500
        );

        setError(apiError);
        onError?.(apiError);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [endpoint, showErrorToast, skipErrorHandling, retries, onSuccess, onError]
  );

  return {
    data,
    loading,
    error,
    execute,
    reset: () => {
      setData(null);
      setError(null);
      setLoading(false);
    },
  };
}

/**
 * Hook for API DELETE requests
 */
export function useApiDelete<TResponse = void>(
  endpoint: string,
  options: UseApiOptions<TResponse> = {}
) {
  const {
    onSuccess,
    onError,
    showErrorToast = true,
    skipErrorHandling = false,
    retries = 0,
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const execute = useCallback(async (): Promise<TResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiClient.delete<TResponse>(endpoint, {
        showErrorToast,
        skipErrorHandling,
        retries,
      });

      onSuccess?.(result as TResponse);
      return result;
    } catch (err) {
      const apiError = err instanceof ApiError ? err : new ApiError(
        err instanceof Error ? err.message : "Unknown error",
        500
      );

      setError(apiError);
      onError?.(apiError);
      return null;
    } finally {
      setLoading(false);
    }
  }, [endpoint, showErrorToast, skipErrorHandling, retries, onSuccess, onError]);

  return {
    loading,
    error,
    execute,
    reset: () => {
      setError(null);
      setLoading(false);
    },
  };
}

