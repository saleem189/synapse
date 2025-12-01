// ================================
// React Query Hooks
// ================================
// Custom hooks built on top of React Query for API calls
// Replaces useApi hooks with better caching and deduplication

"use client";

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";
import { toast } from "sonner";

/**
 * Hook for GET requests with React Query
 * Provides automatic caching, deduplication, and background refetching
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useQueryApi<Room[]>('/rooms');
 * ```
 */
export function useQueryApi<T>(
  endpoint: string,
  options?: {
    enabled?: boolean;
    showErrorToast?: boolean;
    staleTime?: number;
    refetchInterval?: number;
    onSuccess?: (data: T) => void;
    onError?: (error: ApiError) => void;
  }
) {
  const {
    enabled = true,
    showErrorToast = true,
    staleTime,
    refetchInterval,
    onSuccess,
    onError,
  } = options || {};

  const query = useQuery<T, ApiError>({
    queryKey: [endpoint],
    queryFn: async () => {
      return await apiClient.get<T>(endpoint, {
        showErrorToast,
      });
    },
    enabled,
    staleTime,
    refetchInterval,
    retry: 1,
    onSuccess,
    onError: (error) => {
      onError?.(error);
      if (showErrorToast && error.message) {
        toast.error(error.message);
      }
    },
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}

/**
 * Hook for POST requests with React Query
 * 
 * @example
 * ```tsx
 * const { mutate, isLoading } = useMutationApi<Room, CreateRoomData>(
 *   '/rooms',
 *   {
 *     onSuccess: (data) => {
 *       queryClient.invalidateQueries({ queryKey: ['/rooms'] });
 *     }
 *   }
 * );
 * ```
 */
export function useMutationApi<TData, TResponse = TData>(
  endpoint: string,
  options?: {
    method?: "POST" | "PATCH" | "PUT" | "DELETE";
    showErrorToast?: boolean;
    onSuccess?: (data: TResponse) => void;
    onError?: (error: ApiError) => void;
    invalidateQueries?: string[];
  }
) {
  const queryClient = useQueryClient();
  const {
    method = "POST",
    showErrorToast = true,
    onSuccess,
    onError,
    invalidateQueries = [],
  } = options || {};

  const mutation = useMutation<TResponse, ApiError, TData>({
    mutationFn: async (data: TData) => {
      switch (method) {
        case "POST":
          return await apiClient.post<TResponse>(endpoint, data, {
            showErrorToast,
          });
        case "PATCH":
          return await apiClient.patch<TResponse>(endpoint, data, {
            showErrorToast,
          });
        case "PUT":
          return await apiClient.put<TResponse>(endpoint, data, {
            showErrorToast,
          });
        case "DELETE":
          return await apiClient.delete<TResponse>(endpoint, {
            showErrorToast,
          });
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
    },
    onSuccess: (data) => {
      // Invalidate related queries to refetch fresh data
      invalidateQueries.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      });
      onSuccess?.(data);
    },
    onError: (error) => {
      onError?.(error);
      if (showErrorToast && error.message) {
        toast.error(error.message);
      }
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    loading: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}

/**
 * Hook for optimistic updates with React Query
 * Useful for chat messages where we want immediate UI feedback
 */
export function useOptimisticMutation<TData, TResponse = TData>(
  endpoint: string,
  options?: {
    method?: "POST" | "PATCH" | "PUT" | "DELETE";
    showErrorToast?: boolean;
    onSuccess?: (data: TResponse) => void;
    onError?: (error: ApiError) => void;
    invalidateQueries?: string[];
    optimisticUpdate?: (variables: TData) => TResponse;
  }
) {
  const queryClient = useQueryClient();
  const {
    method = "POST",
    showErrorToast = true,
    onSuccess,
    onError,
    invalidateQueries = [],
    optimisticUpdate,
  } = options || {};

  const mutation = useMutation<TResponse, ApiError, TData>({
    mutationFn: async (data: TData) => {
      switch (method) {
        case "POST":
          return await apiClient.post<TResponse>(endpoint, data, {
            showErrorToast,
          });
        case "PATCH":
          return await apiClient.patch<TResponse>(endpoint, data, {
            showErrorToast,
          });
        case "PUT":
          return await apiClient.put<TResponse>(endpoint, data, {
            showErrorToast,
          });
        case "DELETE":
          return await apiClient.delete<TResponse>(endpoint, {
            showErrorToast,
          });
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await Promise.all(
        invalidateQueries.map((queryKey) =>
          queryClient.cancelQueries({ queryKey: [queryKey] })
        )
      );

      // Snapshot previous values for rollback
      const snapshots = invalidateQueries.map((queryKey) => ({
        queryKey: [queryKey],
        snapshot: queryClient.getQueryData([queryKey]),
      }));

      // Optimistically update if function provided
      if (optimisticUpdate) {
        invalidateQueries.forEach((queryKey) => {
          const previousData = queryClient.getQueryData([queryKey]);
          if (previousData) {
            queryClient.setQueryData([queryKey], (old: any) => {
              if (Array.isArray(old)) {
                return [...old, optimisticUpdate(variables)];
              }
              return optimisticUpdate(variables);
            });
          }
        });
      }

      return { snapshots };
    },
    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (context?.snapshots) {
        context.snapshots.forEach(({ queryKey, snapshot }) => {
          queryClient.setQueryData(queryKey, snapshot);
        });
      }
      onError?.(error);
      if (showErrorToast && error.message) {
        toast.error(error.message);
      }
    },
    onSuccess: (data) => {
      // Invalidate related queries to refetch fresh data
      invalidateQueries.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      });
      onSuccess?.(data);
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    loading: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}

