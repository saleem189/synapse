// ================================
// Message Processing Queue Hook
// ================================
// Prevents race conditions by ensuring messages are processed sequentially
// and preventing duplicate processing of the same message

"use client";

import { useRef, useCallback } from "react";

interface QueuedMessage {
  id: string;
  processor: () => Promise<void>;
  promise?: Promise<void>;
}

/**
 * Hook for managing message processing queue
 * Ensures messages are processed one at a time to prevent race conditions
 * 
 * @example
 * ```tsx
 * const { processMessage } = useMessageQueue();
 * 
 * const handleReceiveMessage = (message: MessagePayload) => {
 *   processMessage(message.id, async () => {
 *     // Process message logic
 *     updateMessage(roomId, message.id, { ... });
 *   });
 * };
 * ```
 */
export function useMessageQueue() {
  // Track messages currently being processed
  const processingQueue = useRef<Map<string, QueuedMessage>>(new Map());

  /**
   * Process a message with queue management
   * If the message is already being processed, waits for the existing process to complete
   * 
   * @param messageId - Unique identifier for the message
   * @param processor - Async function that processes the message
   * @returns Promise that resolves when processing is complete
   */
  const processMessage = useCallback(
    async (messageId: string, processor: () => Promise<void>): Promise<void> => {
      // Check if message is already being processed
      const existing = processingQueue.current.get(messageId);

      if (existing?.promise) {
        // Message is already being processed - wait for it to complete
        try {
          await existing.promise;
        } catch (error) {
          // Ignore errors from previous processing attempt
          // We'll process it again
        }
        return;
      }

      // Create processing promise
      const promise = processor()
        .then(() => {
          // Success - remove from queue
          processingQueue.current.delete(messageId);
        })
        .catch((error) => {
          // Error - remove from queue and re-throw
          processingQueue.current.delete(messageId);
          throw error;
        });

      // Add to queue
      processingQueue.current.set(messageId, {
        id: messageId,
        processor,
        promise,
      });

      // Wait for processing to complete
      await promise;
    },
    []
  );

  /**
   * Check if a message is currently being processed
   */
  const isProcessing = useCallback((messageId: string): boolean => {
    return processingQueue.current.has(messageId);
  }, []);

  /**
   * Clear the processing queue (useful for cleanup)
   */
  const clearQueue = useCallback(() => {
    processingQueue.current.clear();
  }, []);

  /**
   * Get the number of messages currently in the queue
   */
  const queueSize = useCallback((): number => {
    return processingQueue.current.size;
  }, []);

  return {
    processMessage,
    isProcessing,
    clearQueue,
    queueSize,
  };
}

