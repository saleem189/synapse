// ================================
// Chat Room Component
// ================================
// Main chat room with messages, input, and real-time updates

"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Hash,
  Users,
  Loader2,
  AlertCircle,
  RefreshCw,
  Search,
  X,
  Reply,
  Settings,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn, debounce, getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { MessageInput } from "./message-input";
import { TypingIndicator } from "./typing-indicator";
import { RoomMenu } from "./room-menu";
import { RoomSettingsModal } from "./room-settings-modal";
import { RoomMembersPanel } from "./room-members-panel";
import { MessageEditModal } from "./message-edit-modal";
import { ChatRoomHeader } from "./chat-room-header";
import { MessageItem } from "./message-item";
import { MessageListErrorBoundary } from "./message-list-error-boundary";
import { MessageInputErrorBoundary } from "./message-input-error-boundary";
import { type MessagePayload } from "@/lib/socket";
import { apiClient } from "@/lib/api-client";
import { TIMEOUTS } from "@/lib/constants";
import { useMessagesStore, useUserStore, useUIStore } from "@/lib/store";
import { useTyping, useMessageOperations, useSocket } from "@/hooks";
import { useMessageQueue } from "@/hooks/use-message-queue";
import { logger } from "@/lib/logger";
import { createMessageFromPayload } from "@/lib/utils/message-helpers";
import type { Message } from "@/lib/types/message.types";
import { VirtualizedMessageList } from "./virtualized-message-list";

interface Participant {
  id: string;
  name: string;
  avatar?: string | null;
  status: string;
  lastSeen?: string;
  role: string; // "admin" or "member" in RoomParticipant (required)
  isOwner?: boolean;
}

interface ChatRoomProps {
  roomId: string;
  roomName: string;
  isGroup: boolean;
  participants: Participant[];
  initialMessages: Message[];
  roomOwnerId?: string;
  roomData?: {
    id: string;
    name: string;
    description?: string | null;
    avatar?: string | null;
    isGroup: boolean;
  };
}

export function ChatRoom({
  roomId,
  roomName,
  isGroup,
  participants: initialParticipants,
  initialMessages,
  roomOwnerId,
  roomData: initialRoomData,
}: ChatRoomProps) {
  const router = useRouter();

  // Get current user from store
  const currentUser = useUserStore((state) => state.user);
  const currentUserId = currentUser ? currentUser.id : null;

  // Local state for room data and participants (can be updated without reload)
  const [roomData, setRoomData] = useState(initialRoomData);
  const [participants, setParticipants] = useState(initialParticipants);

  // Use selector - Zustand automatically does reference equality for single selectors
  const messages = useMessagesStore((state) => state.messagesByRoom[roomId]);
  const {
    setMessages,
    addMessage,
    updateMessage,
    removeMessage,
    getMessages
  } = useMessagesStore();

  // Use specialized hooks
  const { socket, isConnected } = useSocket();
  const { startTyping, stopTyping } = useTyping({ roomId, enabled: !!currentUser });
  const { sendMessage, editMessage, deleteMessage, retryMessage } = useMessageOperations({
    roomId,
    participants,
    onReplyCleared: () => setReplyingTo(null),
  });
  const { processMessage } = useMessageQueue();

  const displayMessages = messages ?? initialMessages;

  // Debug: Log when messages change
  useEffect(() => {
    logger.log("🔄 [RENDER] Display messages updated:", {
      roomId,
      storeMessagesCount: messages?.length || 0,
      displayMessagesCount: displayMessages.length,
      hasStoreMessages: !!messages,
      storeMessageIds: messages?.map(m => m.id) || [],
      displayMessageIds: displayMessages.map(m => m.id)
    });
  }, [messages, displayMessages, roomId]);

  useEffect(() => {
    if (displayMessages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, TIMEOUTS.SCROLL_DELAY);
    }
  }, [displayMessages.length, roomId]);

  useEffect(() => {
    if (initialMessages.length > 0 && !messages) {
      setMessages(roomId, initialMessages);
    }
  }, [roomId, initialMessages, messages, setMessages]);

  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());

  // Use UI store for info panel, room settings modal, and message edit modal
  const {
    isInfoPanelOpen,
    isRoomSettingsModalOpen,
    isMessageEditModalOpen,
    editingMessage,
    toggleInfoPanel,
    openInfoPanel,
    closeInfoPanel,
    openRoomSettingsModal,
    closeRoomSettingsModal,
    openMessageEditModal,
    closeMessageEditModal,
  } = useUIStore();
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: Message } | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const currentRoomRef = useRef<string | null>(null);
  const onlineUsersRef = useRef<Set<string>>(new Set());
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Scroll to bottom of messages
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    scrollToBottom("auto");
  }, [roomId, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!currentUser) return;

    const unreadMessages = displayMessages.filter(
      (msg) => msg.senderId !== currentUser.id && !msg.isRead && !msg.isDeleted
    );

    if (unreadMessages.length > 0) {
      // Only mark messages with real IDs as read (not temp IDs)
      const messagesWithRealIds = unreadMessages.filter((msg) => {
        const isRealId = msg.id && !msg.id.startsWith("msg_") && !msg.id.startsWith("temp_");
        return isRealId;
      });

      // Use batch API to mark all messages as read in a single request
      // This prevents race conditions from concurrent forEach loops
      if (messagesWithRealIds.length > 0) {
        const messageIds = messagesWithRealIds.map((msg) => msg.id);

        apiClient.post('/messages/read-batch', {
          messageIds,
        }, {
          showErrorToast: false, // Don't show toast for read receipts
        }).catch((error: any) => {
          // Silently ignore errors - batch API handles duplicates gracefully
          // Only log unexpected errors
          if (error?.status !== 404 && error?.code !== 'P2002') {
            logger.error("Error marking messages as read:", error);
          }
        });
      }

      // Update all unread messages (including temp IDs) as read in the UI
      // This provides immediate feedback while the API call processes
      unreadMessages.forEach((msg) => {
        updateMessage(roomId, msg.id, { isRead: true, isDelivered: true });
      });
    }
  }, [messages, currentUser?.id, roomId, updateMessage]);

  // Use refs to store current values and avoid stale closures
  const handleReceiveMessageRef = useRef<(message: MessagePayload) => void>();
  const participantsRef = useRef(participants);
  const currentUserRef = useRef(currentUser);
  const processingMessagesRef = useRef<Set<string>>(new Set());

  // Update refs when values change
  useEffect(() => {
    participantsRef.current = participants;
    currentUserRef.current = currentUser;
  }, [participants, currentUser]);

  useEffect(() => {
    if (!currentUser || !socket || !isConnected) return;

    logger.log("🔌 Setting up socket listeners for room:", roomId, "Socket connected:", isConnected, "Socket ID:", socket.id);

    // Verify socket connection status
    const checkConnection = () => {
      if (!socket.connected) {
        logger.error("❌ Socket is NOT connected! Messages won't be received in real-time.");
      } else {
        logger.log("✅ Socket is connected and ready");
      }
    };

    // Check immediately and on connect
    checkConnection();

    const previousRoomId = currentRoomRef.current;
    if (previousRoomId && previousRoomId !== roomId) {
      socket.emit("leave-room", previousRoomId);
      logger.log("Left previous room:", previousRoomId);
    }

    currentRoomRef.current = roomId;

    // Join room immediately when socket connects
    const joinRoomWhenConnected = () => {
      if (socket.connected) {
        logger.log("✅ Joining room:", roomId, "Socket ID:", socket.id);
        socket.emit("join-room", roomId);
        socket.emit("get-online-users");
      } else {
        logger.warn("⚠️ Socket not connected, waiting for connection before joining room...");
      }
    };

    const handleConnect = () => {
      logger.log("✅ Socket connected, ID:", socket.id);
      checkConnection();
      // Join room as soon as socket connects
      joinRoomWhenConnected();
    };

    // Join room immediately if already connected, otherwise wait for connect event
    if (socket.connected) {
      joinRoomWhenConnected();
    }

    // Listen for connect events (both initial and reconnects)
    socket.on("connect", handleConnect);
    socket.on("online-users", (userIds: string[]) => {
      const onlineSet = new Set(userIds);
      setOnlineUsers(onlineSet);
      onlineUsersRef.current = onlineSet; // Update ref for use in handlers

      // Mark pending messages as delivered if recipient is now online
      // Use refs to get current values
      const currentUser = currentUserRef.current;
      if (!currentUser) return;
      const participants = participantsRef.current;
      const recipientIds = participants
        .filter((p) => p.id !== currentUser.id)
        .map((p) => p.id);

      const currentMessages = getMessages(roomId);
      currentMessages.forEach((msg) => {
        if (
          msg.senderId === currentUser.id &&
          !msg.isDelivered &&
          !msg.isRead &&
          recipientIds.some((id) => userIds.includes(id))
        ) {
          updateMessage(roomId, msg.id, { isDelivered: true });
        }
      });
    });

    socket.on("user-online", (userId: string) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.add(userId);
        onlineUsersRef.current = next; // Update ref
        return next;
      });

      // Mark pending messages as delivered if this user is the recipient
      // Use refs to get current values
      const currentUser = currentUserRef.current;
      if (!currentUser) return;
      const participants = participantsRef.current;
      const recipientIds = participants
        .filter((p) => p.id !== currentUser.id)
        .map((p) => p.id);

      if (recipientIds.includes(userId)) {
        const currentMessages = getMessages(roomId);
        currentMessages.forEach((msg) => {
          if (
            msg.senderId === currentUser.id &&
            !msg.isDelivered &&
            !msg.isRead
          ) {
            updateMessage(roomId, msg.id, { isDelivered: true });
          }
        });
      }
    });

    socket.on("user-offline", (userId: string) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        onlineUsersRef.current = next; // Update ref
        return next;
      });
    });

    const clearTypingTimeout = (userId: string) => {
      const timeout = typingTimeoutsRef.current.get(userId);
      if (timeout) {
        clearTimeout(timeout);
        typingTimeoutsRef.current.delete(userId);
      }
    };

    const setTypingTimeout = (userId: string, callback: () => void, delay: number = TIMEOUTS.TYPING_AUTO_CLEAR) => {
      clearTypingTimeout(userId);
      const timeout = setTimeout(callback, delay);
      typingTimeoutsRef.current.set(userId, timeout);
    };

    // Create handler function that uses refs to avoid stale closures
    const createHandleReceiveMessage = () => {
      return async (message: MessagePayload) => {
        // Use refs to get current values
        const currentUser = currentUserRef.current;
        if (!currentUser) return;
        const participants = participantsRef.current;

        // Log client receive to message flow logger (via API call)
        if (currentUser?.id) {
          fetch('/api/debug/log-message-receive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messageId: message.id,
              roomId: message.roomId,
              senderId: message.senderId,
              receiverId: currentUser.id,
              socketId: socket?.id,
            }),
          }).catch(() => {
            // Ignore errors in logging
          });
        }

        logger.log("🔔 Received socket message:", {
          roomId: message.roomId,
          currentRoomId: roomId,
          senderId: message.senderId,
          currentUserId: currentUser.id,
          messageId: message.id,
          content: message.content?.substring(0, 50)
        });

        // Only process messages for current room
        if (message.roomId !== roomId) {
          logger.log("⚠️ Message for different room, ignoring");
          return;
        }

        // Use message queue to prevent race conditions and duplicate processing
        if (!message.id) {
          logger.warn("⚠️ Message missing ID, skipping:", message);
          return;
        }

        await processMessage(message.id, async () => {
          // Handle sender's own messages from API broadcast
          // When API broadcasts, it includes the sender, so we receive our own messages
          // We should update the optimistic message with the real ID if it's a new message
          if (message.senderId === currentUser.id) {
            const existingMessages = getMessages(roomId);
            // Check if this is a real ID (from API) that should replace an optimistic message
            // Real IDs from database are longer and don't start with "msg_" or "temp_"
            const isRealId = message.id && !message.id.startsWith("msg_") && !message.id.startsWith("temp_");

            if (isRealId) {
              // This is a real message from API broadcast - find and update optimistic message
              const optimisticMsg = existingMessages.find((msg) => {
                // Match by content, sender, and timestamp (within 5 seconds)
                if (msg.senderId !== currentUser.id) return false;
                if (msg.content !== message.content) return false;
                if (msg.id === message.id) return false; // Already has real ID
                if (msg.status !== "sending" && msg.status !== "sent") return false;

                const timeDiff = Math.abs(
                  new Date(msg.createdAt).getTime() -
                  new Date(message.createdAt || new Date().toISOString()).getTime()
                );
                return timeDiff < TIMEOUTS.MESSAGE_MATCH;
              });

              if (optimisticMsg) {
                // Replace optimistic message with real message
                logger.log("🔄 Updating optimistic message with real ID:", optimisticMsg.id, "->", message.id);
                updateMessage(roomId, optimisticMsg.id, {
                  ...createMessageFromPayload(message, false),
                  status: "sent" as const,
                });
                return;
              }

              // Check if message with real ID already exists
              const existingByRealId = existingMessages.find((msg) => msg.id === message.id);
              if (existingByRealId) {
                // Already exists, just ensure it's marked as sent
                logger.log("✅ Message with real ID already exists:", message.id);
                return;
              }
            }

            // If it's a temp ID or we can't match it, ignore it (optimistic message will be updated by API response)
            logger.log("⚠️ Received own message via socket (temp ID or unmatched):", message.id);
            return;
          }

          // This is a message from another user - add it immediately
          const recipientIds = participants
            .filter((p) => p.id !== currentUser.id)
            .map((p) => p.id);
          const recipientOnline = recipientIds.some((id) => onlineUsersRef.current.has(id));

          const newMessage = createMessageFromPayload(message, recipientOnline);

          // Check if message already exists (shouldn't happen, but be safe)
          const existingMessages = getMessages(roomId);
          const existingIndex = existingMessages.findIndex((msg) => msg.id === newMessage.id);

          if (existingIndex === -1) {
            logger.log("✅ Adding new message from other user:", {
              messageId: newMessage.id,
              content: newMessage.content?.substring(0, 50),
              roomId,
              senderId: newMessage.senderId,
              currentMessagesCount: existingMessages.length
            });

            // Add message to store
            addMessage(roomId, newMessage);

            // Verify it was added
            const afterAdd = getMessages(roomId);
            logger.log("📊 Store after add:", {
              beforeCount: existingMessages.length,
              afterCount: afterAdd.length,
              messageAdded: afterAdd.some(m => m.id === newMessage.id)
            });

            // Mark as delivered since we received it
            socket.emit("message-delivered", {
              messageId: newMessage.id,
              roomId: roomId,
            });

            // Auto-scroll to bottom
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
          } else {
            logger.log("⚠️ Message already exists, updating:", newMessage.id);
            const existing = existingMessages[existingIndex];
            if (!existing.replyTo && newMessage.replyTo) {
              updateMessage(roomId, newMessage.id, {
                replyTo: newMessage.replyTo,
                replyToId: newMessage.replyToId,
              });
            }
          }

          // Mark message as read and clear typing indicator
          // Only mark as read if it's a real ID (not temp ID) - temp IDs don't exist in DB yet
          const isRealId = newMessage.id && !newMessage.id.startsWith("msg_") && !newMessage.id.startsWith("temp_");
          if (isRealId) {
            apiClient.post(`/messages/${newMessage.id}/read`, {}, {
              showErrorToast: false,
            }).then(() => {
              socket.emit("message-read", {
                messageId: newMessage.id,
                userId: currentUser.id,
                roomId: roomId,
              });
            }).catch((error: any) => {
              // Silently ignore 404 errors (temp IDs don't exist in DB yet)
              // Check both status code and error message
              const is404 = error?.status === 404 ||
                error?.message?.includes("404") ||
                error?.message?.includes("Message not found") ||
                error?.message?.includes("not found") ||
                String(error || '').includes("404") ||
                String(error || '').includes("Message not found");

              if (!is404) {
                logger.error("Error marking message as read:", error);
              }
            });
          } else {
            // For temp IDs, wait for the real ID from API broadcast, then mark as read
            // No need to log - this is expected behavior
          }

          clearTypingTimeout(message.senderId);
          setTypingUsers((prev) => {
            const next = new Map(prev);
            next.delete(message.senderId);
            return next;
          });
        });
      };
    };

    const handleReceiveMessage = createHandleReceiveMessage();
    handleReceiveMessageRef.current = handleReceiveMessage;

    const handleUserTyping = ({
      roomId: typingRoomId,
      userId,
      userName,
    }: {
      roomId: string;
      userId: string;
      userName: string;
    }) => {
      const currentUser = currentUserRef.current;
      if (typingRoomId === roomId && userId !== currentUser.id) {
        setTypingUsers((prev) => new Map(prev).set(userId, userName));
        setTypingTimeout(userId, () => {
          logger.log("Auto-clearing stuck typing indicator for user:", userId);
          setTypingUsers((prev) => {
            const next = new Map(prev);
            next.delete(userId);
            return next;
          });
        }, TIMEOUTS.TYPING_AUTO_CLEAR);
      }
    };

    const handleUserStopTyping = ({
      roomId: typingRoomId,
      userId,
    }: {
      roomId: string;
      userId: string;
    }) => {
      if (typingRoomId === roomId) {
        clearTypingTimeout(userId);
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.delete(userId);
          return next;
        });
      }
    };

    // Handle message updated (edit)
    const handleMessageUpdated = ({ messageId, content, updatedAt }: { messageId: string; content: string; updatedAt: string }) => {
      updateMessage(roomId, messageId, { content, isEdited: true });
    };

    // Handle message deleted
    const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
      updateMessage(roomId, messageId, {
        isDeleted: true,
        content: "[This message was deleted]"
      });
    };

    const handleReactionUpdated = ({ messageId, reactions }: { messageId: string; reactions: Record<string, Array<{ id: string; name: string; avatar: string | null }>> }) => {
      updateMessage(roomId, messageId, { reactions });
    };

    const handleMessageReadUpdate = ({ messageId, userId, roomId: eventRoomId }: { messageId: string; userId: string; roomId: string; readAt: string }) => {
      if (eventRoomId !== roomId) return;

      // Update message read status
      const currentUser = currentUserRef.current;
      const currentMessages = getMessages(roomId);
      const message = currentMessages.find((msg) => msg.id === messageId);

      if (message && message.senderId === currentUser.id) {
        // This is our message that was read by someone else
        // Update isRead status
        updateMessage(roomId, messageId, { isRead: true });
      }
    };

    const handleMessageDeliveredUpdate = ({ messageId, roomId: eventRoomId }: { messageId: string; roomId: string }) => {
      if (eventRoomId !== roomId) return;

      // Update message delivery status
      const currentUser = currentUserRef.current;
      const currentMessages = getMessages(roomId);
      const message = currentMessages.find((msg) => msg.id === messageId);

      if (message && message.senderId === currentUser.id && !message.isDelivered) {
        // This is our message that was delivered
        updateMessage(roomId, messageId, { isDelivered: true });
      }
    };

    // Wrap handleReceiveMessage with debug logging
    const wrappedHandleReceiveMessage = (message: MessagePayload) => {
      const currentUser = currentUserRef.current;
      logger.log("🎯 [SOCKET EVENT] receive-message handler CALLED:", {
        messageId: message.id,
        roomId: message.roomId,
        currentRoomId: roomId,
        senderId: message.senderId,
        currentUserId: currentUser.id,
        socketId: socket.id,
        socketConnected: socket.connected,
        content: message.content?.substring(0, 50)
      });
      handleReceiveMessage(message);
    };

    logger.log("🔌 Registering socket listeners for room:", roomId, "Socket ID:", socket.id);

    // Register the handler
    socket.on("receive-message", wrappedHandleReceiveMessage);

    // Verify handler is registered (Socket.io doesn't have listenerCount, so we just log)
    logger.log(`✅ Handler registered for receive-message event`);
    socket.on("user-typing", handleUserTyping);
    socket.on("user-stop-typing", handleUserStopTyping);
    socket.on("message-updated", handleMessageUpdated);
    socket.on("message-deleted", handleMessageDeleted);
    socket.on("reaction-updated", handleReactionUpdated);
    socket.on("message-read-update", handleMessageReadUpdate);
    socket.on("message-delivered-update", handleMessageDeliveredUpdate);

    // Verify listener is registered
    logger.log("✅ Socket listeners registered. Socket connected:", socket.connected, "Socket ID:", socket.id);

    // Test: Manually check if we're in the room (can't directly check, but we can verify socket is connected)
    if (socket.connected) {
      logger.log("✅ Socket is connected and ready to receive messages. Socket ID:", socket.id);
      // Emit a test event to verify server communication
      socket.emit("ping-room", roomId);
    } else {
      logger.error("❌ Socket is NOT connected! Messages won't be received.");
    }

    // Cleanup
    return () => {
      logger.log("🧹 Cleaning up socket listeners for room:", roomId);
      socket.emit("leave-room", roomId);
      socket.off("connect", handleConnect);
      // Remove receive-message handler - use off with specific handler
      socket.off("receive-message", wrappedHandleReceiveMessage);
      socket.off("user-typing", handleUserTyping);
      socket.off("user-stop-typing", handleUserStopTyping);
      socket.off("message-updated", handleMessageUpdated);
      socket.off("message-deleted", handleMessageDeleted);
      socket.off("reaction-updated", handleReactionUpdated);
      socket.off("message-read-update", handleMessageReadUpdate);
      socket.off("message-delivered-update", handleMessageDeliveredUpdate);

      // Clear processing messages set
      processingMessagesRef.current.clear();

      // Cleanup typing timeouts
      typingTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeoutsRef.current.clear();
      socket.off("online-users");
      socket.off("user-online");
      socket.off("user-offline");
    };
  }, [roomId, currentUserId, socket, isConnected]); // Only roomId and currentUserId in dependencies - handlers use refs for other values

  // Close context menu
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }
  }, [contextMenu]);

  // All hooks must be called before any early returns
  // Handle message send - memoized
  const handleSendMessage = useCallback(async (
    content: string,
    fileData?: {
      url: string;
      fileName: string;
      fileSize: number;
      fileType: string;
    }
  ) => {
    if (!currentUser) return;
    await sendMessage(
      content,
      fileData,
      replyingTo ? {
        id: replyingTo.id,
        content: replyingTo.content,
        senderName: replyingTo.senderName,
        senderAvatar: replyingTo.senderAvatar || null,
      } : null
    );
  }, [sendMessage, replyingTo, currentUser]);

  // Handle message edit - memoized
  const handleEditMessage = useCallback((messageId: string, currentContent: string) => {
    openMessageEditModal(messageId, currentContent);
  }, [openMessageEditModal]);

  // Handle reply to message - memoized
  const handleReplyToMessage = useCallback((message: Message) => {
    setReplyingTo(message);
    // Scroll to message input
    setTimeout(() => {
      document.querySelector('textarea')?.focus();
    }, TIMEOUTS.SCROLL_DELAY);
  }, []);

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent, message: Message) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      message,
    });
  };

  // Long-press handler for mobile - memoized
  const createLongPressHandlers = useCallback((message: Message) => {
    let timeoutId: NodeJS.Timeout | null = null;
    let isLongPress = false;

    const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
      isLongPress = false;
      timeoutId = setTimeout(() => {
        isLongPress = true;
        handleReplyToMessage(message);
        // Haptic feedback on mobile
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      }, 500);
    };

    const handleEnd = (e: React.TouchEvent | React.MouseEvent) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    return {
      onTouchStart: handleStart,
      onTouchEnd: handleEnd,
      onMouseDown: handleStart,
      onMouseUp: handleEnd,
      onMouseLeave: handleEnd,
    };
  }, [handleReplyToMessage]);

  // Handle retry failed message (wrapped to use hook)
  const handleRetryMessage = async (message: Message) => {
    await retryMessage(message);
  };

  // Handle message save after edit (wrapped to use hook)
  const handleSaveEdit = async (messageId: string, newContent: string) => {
    await editMessage(messageId, newContent);
    closeMessageEditModal();
  };

  // Handle message delete (wrapped to use hook)
  const handleDeleteMessage = async (messageId: string) => {
    await deleteMessage(messageId);
  };

  const handleTyping = (isTyping: boolean) => {
    if (isTyping) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  // Group messages by date - memoized for performance
  // MUST be called before any early returns to follow Rules of Hooks
  const groupedMessages = useMemo(() => {
    return displayMessages.reduce((groups, message) => {
      const date = new Date(message.createdAt).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
      return groups;
    }, {} as Record<string, Message[]>);
  }, [displayMessages]);

  // Early return after ALL hooks are called
  if (!currentUser) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  // Now safe to use currentUser (guarded by early return above)
  const currentParticipant = participants.find((p) => p.id === currentUser.id);
  const isRoomAdmin =
    roomOwnerId === currentUser.id || // Owner is always admin
    currentParticipant?.role === "admin" || // Participant with admin role
    currentParticipant?.isOwner; // Explicit owner flag

  // Get online participants
  const onlineParticipants = participants.filter(
    (p) => p.id !== currentUser.id && p.status === "online"
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-50 dark:bg-surface-950">
      {/* Header */}
      <ChatRoomHeader
        roomName={roomName}
        isGroup={isGroup}
        participants={participants}
        roomData={roomData}
        isRoomAdmin={isRoomAdmin || false}
        showSearch={showSearch}
        showInfo={isInfoPanelOpen}
        onToggleSearch={() => setShowSearch(!showSearch)}
        onToggleInfo={toggleInfoPanel}
        onRoomSettings={openRoomSettingsModal}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Messages Area */}
        <MessageListErrorBoundary
          onReset={() => {
            // Refetch messages on error reset
            router.refresh();
          }}
        >
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto px-4 py-4"
          >
            {/* Virtualized message list for performance with large message counts */}
            {displayMessages.length > 50 ? (
              <VirtualizedMessageList
                messages={displayMessages}
                groupedMessages={groupedMessages}
                currentUserId={currentUser.id}
                isGroup={isGroup}
                roomId={roomId}
                onReply={handleReplyToMessage}
                onEdit={handleEditMessage}
                onDelete={handleDeleteMessage}
                onReactionChange={async (messageId: string) => {
                  try {
                    const data = await apiClient.get<{ reactions: any }>(`/messages/${messageId}/reactions`, {
                      showErrorToast: false,
                    });
                    if (data?.reactions) {
                      updateMessage(roomId, messageId, { reactions: data.reactions });
                    }
                  } catch (error) {
                    // Silently fail - reactions will update via socket
                  }
                }}
                onContextMenu={handleContextMenu}
                createLongPressHandlers={createLongPressHandlers}
                containerRef={messagesContainerRef}
              />
            ) : (
              /* Fallback to regular rendering for small message lists */
              Object.entries(groupedMessages).map(([date, dateMessages]) => (
                <div key={date}>
                  {/* Date separator */}
                  <div className="flex items-center gap-3 my-4">
                    <Separator className="flex-1" />
                    <div className="px-3 py-1 rounded-full bg-surface-200/50 dark:bg-surface-800/50 text-xs text-surface-500 dark:text-surface-400 font-medium">
                      {date === new Date().toLocaleDateString()
                        ? "Today"
                        : date ===
                          new Date(
                            Date.now() - 86400000
                          ).toLocaleDateString()
                          ? "Yesterday"
                          : date}
                    </div>
                    <Separator className="flex-1" />
                  </div>

                  {/* Messages */}
                  <div className="space-y-1.5">
                    {dateMessages.map((message, index) => {
                      const isSent = message.senderId === currentUser.id;
                      const showAvatar =
                        !isSent &&
                        (index === 0 ||
                          dateMessages[index - 1]?.senderId !== message.senderId);
                      const showName = isGroup && !isSent && showAvatar;
                      const isConsecutive = index > 0 && dateMessages[index - 1]?.senderId === message.senderId;
                      const spacing = isConsecutive ? "mt-0.5" : "mt-3";

                      return (
                        <MessageItem
                          key={message.id}
                          message={message}
                          isSent={isSent}
                          showAvatar={showAvatar}
                          showName={showName}
                          isConsecutive={isConsecutive}
                          spacing={spacing}
                          isGroup={isGroup}
                          roomId={roomId}
                          currentUserId={currentUser?.id || ""}
                          onReply={handleReplyToMessage}
                          onEdit={handleEditMessage}
                          onDelete={handleDeleteMessage}
                          onReactionChange={async () => {
                            try {
                              const data = await apiClient.get<{ reactions: any }>(`/messages/${message.id}/reactions`, {
                                showErrorToast: false,
                              });
                              updateMessage(roomId, message.id, { reactions: data.reactions });
                            } catch (error) {
                              logger.error("Error fetching reactions:", error);
                            }
                          }}
                          onContextMenu={handleContextMenu}
                          createLongPressHandlers={createLongPressHandlers}
                        />
                      );
                    })}
                  </div>
                </div>
              ))
            )}

            {/* Typing Indicator */}
            {typingUsers.size > 0 && (
              <TypingIndicator users={Array.from(typingUsers.values())} />
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </MessageListErrorBoundary>

        {/* Info Panel */}
        {isInfoPanelOpen && (
          <div className="w-72 border-l border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-y-auto">
            <div className="p-4">
              {/* Room Info */}
              <div className="text-center mb-6">
                <div
                  className={cn(
                    "w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-2xl font-bold",
                    isGroup
                      ? "bg-gradient-to-br from-accent-400 to-pink-500"
                      : "bg-gradient-to-br from-primary-400 to-blue-500"
                  )}
                >
                  {isGroup ? <Hash className="w-10 h-10" /> : getInitials(roomName)}
                </div>
                <h3 className="font-semibold text-lg text-surface-900 dark:text-white">
                  {roomName}
                </h3>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  {isGroup ? "Group Chat" : "Direct Message"}
                </p>
              </div>

              {/* Room Settings Button (Room Admins only) */}
              {isRoomAdmin && (
                <div className="mb-4">
                  <Button
                    onClick={openRoomSettingsModal}
                    variant="outline"
                    className="w-full"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Room Settings
                  </Button>
                </div>
              )}

              {/* Participants List */}
              <div>
                <h4 className="font-semibold text-sm text-surface-900 dark:text-white mb-3">
                  Members ({participants.length})
                </h4>
                <div className="space-y-2">
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                    >
                      <Avatar className="w-10 h-10 bg-gradient-to-br from-primary-400 to-blue-500">
                        <AvatarImage src={participant.avatar || undefined} alt={participant.name} />
                        <AvatarFallback className="bg-gradient-to-br from-primary-400 to-blue-500 text-white text-sm font-semibold">
                          {getInitials(participant.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
                          {participant.name}
                          {participant.id === currentUser?.id && " (You)"}
                        </p>
                        <p className="text-xs text-surface-500 dark:text-surface-400">
                          {participant.status === "online" ? (
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                              Online
                            </span>
                          ) : (
                            participant.lastSeen
                              ? `Last seen ${new Date(participant.lastSeen).toLocaleDateString()}`
                              : "Offline"
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Message Input */}
      <MessageInputErrorBoundary
        onReset={() => {
          router.refresh();
        }}
      >
        <div className="border-t border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900">
          <MessageInput
            onSendMessage={handleSendMessage}
            onTyping={handleTyping}
            replyTo={replyingTo ? {
              id: replyingTo.id,
              content: replyingTo.content,
              senderName: replyingTo.senderName,
            } : null}
            onCancelReply={() => setReplyingTo(null)}
          />
        </div>
      </MessageInputErrorBoundary>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-surface-800 rounded-lg shadow-xl border border-surface-200 dark:border-surface-700 py-1 min-w-[180px]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              handleReplyToMessage(contextMenu.message);
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center gap-2"
          >
            <Reply className="w-4 h-4" />
            <span>Reply</span>
          </button>
          {contextMenu.message.senderId === currentUser?.id && !contextMenu.message.isDeleted && (
            <>
              <button
                onClick={() => {
                  openMessageEditModal(contextMenu.message.id, contextMenu.message.content);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => {
                  handleDeleteMessage(contextMenu.message.id);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Search Dialog */}
      <CommandDialog open={showSearch} onOpenChange={setShowSearch}>
        <CommandInput placeholder="Search messages..." />
        <CommandList>
          <CommandEmpty>No messages found.</CommandEmpty>
          <CommandGroup heading="Messages">
            {displayMessages
              .filter((msg) =>
                msg.content?.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((msg) => (
                <CommandItem
                  key={msg.id}
                  onSelect={() => {
                    // Scroll to message
                    const messageElement = document.querySelector(
                      `[data-message-id="${msg.id}"]`
                    );
                    if (messageElement) {
                      messageElement.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                      setShowSearch(false);
                    }
                  }}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{msg.senderName}</span>
                    <span className="text-xs text-surface-500">
                      {msg.content?.substring(0, 50)}...
                    </span>
                  </div>
                </CommandItem>
              ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Room Settings Modal */}
      {isRoomSettingsModalOpen && roomData && (
        <RoomSettingsModal
          isOpen={isRoomSettingsModalOpen}
          onClose={closeRoomSettingsModal}
          room={roomData}
          onUpdate={() => {
            router.refresh();
          }}
        />
      )}

      {/* Message Edit Modal */}
      {editingMessage && (
        <MessageEditModal
          isOpen={isMessageEditModalOpen}
          onClose={closeMessageEditModal}
          messageId={editingMessage.id}
          currentContent={editingMessage.content}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}
