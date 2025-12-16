// ================================
// Message Input Component
// ================================
// Input field for sending messages with typing indicator support
// Includes @mentions, quick replies, emoji picker, and voice recording

"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Send, Paperclip, X, File as FileIcon, Image as ImageIconLucide, Video, FileText, Reply } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { cn, debounce } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { EmojiPicker } from "./emoji-picker";
import { VoiceRecorder } from "./voice-recorder";
import { FormattingToolbar, applyFormatting, type FormatType } from "./formatting-toolbar";
import { MessagePreview } from "./message-preview";
import { useFileUpload } from "@/hooks";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// Features
import {
  useMentions,
  MentionSuggestions,
  type MentionableUser,
  detectShortcut,
  getTemplateByShortcut,
  QuickReplyPicker,
  type QuickReplyTemplate,
  DEFAULT_QUICK_REPLIES,
  mentionsToDisplayText,
  MENTION_DISPLAY_REGEX,
} from "@/features";

interface MessageInputProps {
  onSendMessage: (content: string, fileData?: {
    url: string;
    fileName: string;
    fileSize: number;
    fileType: string;
  }) => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
  replyTo?: {
    id: string;
    content: string;
    senderName: string;
  } | null;
  onCancelReply?: () => void;
  // New props for mentions and quick replies
  mentionableUsers?: MentionableUser[];
  quickReplyTemplates?: QuickReplyTemplate[];
}

export function MessageInput({
  onSendMessage,
  onTyping,
  disabled = false,
  replyTo,
  onCancelReply,
  mentionableUsers = [],
  quickReplyTemplates,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  
  // Convert message to display format (mentions: @[Name](id) -> @Name)
  const displayMessage = useMemo(() => {
    return mentionsToDisplayText(message);
  }, [message]);
  const [selectedFile, setSelectedFile] = useState<{
    url: string;
    fileName: string;
    fileSize: number;
    fileType: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isTypingRef = useRef(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Initialize quick reply templates with defaults if not provided
  const templates = useMemo(() => {
    if (quickReplyTemplates) return quickReplyTemplates;
    // Convert defaults to full templates with IDs
    return DEFAULT_QUICK_REPLIES.map((t, i) => ({
      ...t,
      id: `default-${i}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }, [quickReplyTemplates]);

  // Mentions hook
  const {
    isOpen: mentionsOpen,
    filteredUsers,
    selectedIndex: mentionSelectedIndex,
    handleTextChange: handleMentionTextChange,
    handleKeyDown: handleMentionKeyDown,
    selectUser: selectMentionUser,
    close: closeMentions,
  } = useMentions({ users: mentionableUsers });

  // Use file upload hook
  const { upload, uploading: uploadingFile } = useFileUpload();

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [message]);

  // Debounced stop typing
  const debouncedStopTyping = useRef(
    debounce(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onTyping(false);
      }
    }, 2000)
  ).current;

  // Handle input change - convert display format back to raw format
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDisplayValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    // Convert display format back to raw format
    // Find mentions in original message and restore them in new value
    const originalMentions = message.match(MENTION_DISPLAY_REGEX) || [];
    let newRawValue = newDisplayValue;
    
    // For each mention in original, find @Username in new value and replace with raw format
    originalMentions.forEach((mention) => {
      const match = mention.match(/@\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        const [, name, userId] = match;
        // Replace @name (not already in mention format) with @[name](userId)
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const displayPattern = new RegExp(`@${escapedName}(?!\\[)`, 'g');
        newRawValue = newRawValue.replace(displayPattern, mention);
      }
    });

    setMessage(newRawValue);

    // Check for mention trigger
    handleMentionTextChange(newRawValue, cursorPos);

    // Check for quick reply shortcut (e.g., /thanks)
    const shortcut = detectShortcut(newRawValue);
    if (shortcut) {
      const template = getTemplateByShortcut(shortcut, templates);
      if (template) {
        // Auto-expand the shortcut
        setMessage(template.content);
        return;
      }
    }

    // Emit typing event
    if (newRawValue.trim() && !isTypingRef.current) {
      isTypingRef.current = true;
      onTyping(true);
    }

    // Reset typing timeout
    debouncedStopTyping();
  };

  // Handle send message
  const handleSend = () => {
    const trimmedMessage = message.trim();

    // Allow sending if there's a message OR a file
    if ((!trimmedMessage && !selectedFile) || disabled) return;

    // Stop typing indicator
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTyping(false);
    }

    // Send message with file data if available
    onSendMessage(trimmedMessage || selectedFile?.fileName || "", selectedFile || undefined);

    // Clear input and file
    setMessage("");
    setSelectedFile(null);

    // Focus textarea
    textareaRef.current?.focus();
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    const cursorPos = textarea?.selectionStart || 0;

    // Handle formatting shortcuts
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
      if (e.key === "b") {
        e.preventDefault();
        handleFormat("bold");
        return;
      }
      if (e.key === "i") {
        e.preventDefault();
        handleFormat("italic");
        return;
      }
      if (e.key === "k") {
        e.preventDefault();
        handleFormat("link");
        return;
      }
    }

    // Handle mention keyboard navigation first
    if (mentionsOpen) {
      const result = handleMentionKeyDown(e, message, cursorPos);
      if (result.preventDefault) {
        e.preventDefault();
        if (result.newText !== undefined) {
          setMessage(result.newText);
          // Set cursor position after mention
          setTimeout(() => {
            textarea?.setSelectionRange(result.newCursorPosition!, result.newCursorPosition!);
          }, 0);
        }
        return;
      }
    }

    // Send on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle mention selection from dropdown
  const handleMentionSelect = (user: MentionableUser) => {
    const cursorPos = textareaRef.current?.selectionStart || message.length;
    const result = selectMentionUser(user, message, cursorPos);
    setMessage(result.newText);
    setTimeout(() => {
      textareaRef.current?.setSelectionRange(result.newCursorPosition, result.newCursorPosition);
      textareaRef.current?.focus();
    }, 0);
  };

  // Handle quick reply selection
  const handleQuickReplySelect = (template: QuickReplyTemplate) => {
    setMessage(template.content);
    textareaRef.current?.focus();
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newMessage = message.substring(0, start) + emoji + message.substring(end);
      setMessage(newMessage);

      // Set cursor position after emoji
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    }
  };

  // Handle formatting
  const handleFormat = (type: FormatType) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    try {
      // IMPORTANT: Use the actual textarea value, not the message state
      // This ensures formatting is applied to what the user sees
      const currentValue = textarea.value;
      const { newValue, cursorPos } = applyFormatting(type, textarea, currentValue);
      
      // Update the underlying message state
      // Note: This works correctly because we're formatting the display value
      // and mentions are preserved in their display format
      setMessage(newValue);

      // Refocus textarea with cursor at correct position
      // Use requestAnimationFrame for smoother updates
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(cursorPos, cursorPos);
      });
    } catch (error) {
      logger.error("Error applying formatting", error instanceof Error ? error : new Error(String(error)), {
        component: 'MessageInput',
        action: 'handleFormat',
        formatType: type,
      });
      toast.error("Failed to apply formatting");
    }
  };

  // Handle file upload (using hook)
  const uploadFile = async (file: File) => {
    const result = await upload(file);
    if (result) {
      setSelectedFile({
        url: result.url,
        fileName: result.fileName,
        fileSize: result.fileSize,
        fileType: result.fileType,
      });
    }
  };

  // Handle file input
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    e.target.value = "";
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Only handle the first file
      await uploadFile(files[0]);
    }
  };

  // Get file icon based on type
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return ImageIconLucide;
    if (fileType.startsWith("video/")) return Video;
    if (fileType === "application/pdf" || fileType.startsWith("text/")) return FileText;
    return FileIcon;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const isImage = selectedFile?.fileType.startsWith("image/");
  const isVideo = selectedFile?.fileType.startsWith("video/");

  return (
    <div className="relative px-4 py-3 bg-background">
      {/* Reply Preview - Outside main container */}
      {replyTo && (
        <div className="mb-2 px-3 py-2 rounded-lg bg-primary/10 border-l-3 border-primary flex items-start gap-2">
          <Reply className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary mb-0.5">
              {replyTo.senderName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {replyTo.content}
            </p>
          </div>
          {onCancelReply && (
            <Button
              onClick={onCancelReply}
              variant="ghost"
              size="icon"
              className="w-6 h-6 rounded-full hover:bg-primary/20 text-primary flex-shrink-0"
              title="Cancel reply"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      )}

      {/* UNIFIED INPUT CONTAINER - Like Slack */}
      <div
        ref={dropZoneRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "relative rounded-lg border border-border bg-background overflow-hidden",
          "transition-all duration-200",
          isDragging && "border-primary bg-primary/5 scale-[0.99]"
        )}
      >
        {/* Formatting Toolbar - Top of container, always visible */}
        <FormattingToolbar 
          onFormat={handleFormat}
          showPreview={showPreview}
          onTogglePreview={() => setShowPreview(!showPreview)}
        />

        {/* Drag overlay - Inside container */}
        {isDragging && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary flex items-center justify-center z-50 pointer-events-none">
            <div className="text-center">
              <Paperclip className="w-12 h-12 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-primary">Drop file to upload</p>
            </div>
          </div>
        )}

        {/* File Preview - Inside container */}
        {selectedFile && (
        <div className="mb-2 relative">
          {isImage ? (
            <div className="relative inline-block rounded-lg overflow-hidden border border-border max-w-xs shadow-sm">
              <Image
                src={selectedFile.url}
                alt={selectedFile.fileName}
                width={256}
                height={256}
                sizes="(max-width: 768px) 256px, 256px"
                className="max-h-64 w-auto object-cover rounded-lg"
                unoptimized={selectedFile.url.startsWith('/uploads')}
              />
              <Button
                onClick={() => setSelectedFile(null)}
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 hover:bg-black/90 text-white shadow-lg"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : isVideo ? (
            <div className="relative inline-block rounded-lg overflow-hidden border border-border max-w-xs shadow-sm">
              <video
                src={selectedFile.url}
                controls
                className="max-h-64 w-auto rounded-lg"
              />
              <button
                onClick={() => setSelectedFile(null)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center text-white transition-colors z-10 shadow-lg"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative inline-flex items-center gap-3 p-3 rounded-lg bg-muted border border-border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                {(() => {
                  const Icon = getFileIcon(selectedFile.fileType);
                  return <Icon className="w-5 h-5 text-primary" />;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {selectedFile.fileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.fileSize)}
                </p>
              </div>
              <Button
                onClick={() => setSelectedFile(null)}
                variant="ghost"
                size="icon"
                className="w-6 h-6 rounded-full hover:bg-accent text-muted-foreground flex-shrink-0"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

        {/* Uploading indicator - Inside container */}
        {uploadingFile && (
          <div className="px-3 py-2 bg-primary/10 flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-primary">Uploading file...</p>
          </div>
        )}

        {/* Main Input Area - Inside container */}
        {showPreview ? (
          /* Preview Mode - Show rendered markdown */
          <MessagePreview content={displayMessage} />
        ) : (
          /* Edit Mode - Show textarea */
          <div className="px-3 pb-2">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={displayMessage}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onBlur={() => setTimeout(closeMentions, 200)}
                placeholder="Type a message... (use @ to mention, / for quick replies)"
                disabled={disabled}
                rows={1}
                className={cn(
                  "w-full px-2 py-2 pr-10 resize-none bg-transparent border-0",
                  "focus:ring-0 focus:outline-none",
                  "max-h-[150px] scrollbar-hide",
                  "placeholder:text-muted-foreground"
                )}
              />

              {/* Mention Suggestions */}
              {mentionsOpen && filteredUsers.length > 0 && (
                <MentionSuggestions
                  users={filteredUsers}
                  selectedIndex={mentionSelectedIndex}
                  onSelect={handleMentionSelect}
                  onClose={closeMentions}
                />
              )}
            </div>
          </div>
        )}

        {/* Bottom Toolbar - Inside container */}
        <div className="px-2 pb-2 flex items-center justify-between gap-2">
          {/* Left actions */}
          <div className="flex items-center gap-0.5">
            {/* Attachment Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <label className="h-7 w-7 rounded hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                    />
                    <Paperclip className="w-4 h-4" />
                  </label>
                </TooltipTrigger>
                <TooltipContent side="top">Attach file</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Emoji Picker */}
            <EmojiPicker onEmojiSelect={handleEmojiSelect} />

            {/* Voice Recorder */}
            <VoiceRecorder
              onRecordingComplete={async (audioBlob, duration) => {
                try {
                  const fileName = `voice_${Date.now()}.${audioBlob.type.includes('webm') ? 'webm' : 'mp4'}`;
                  const file = new File([audioBlob], fileName, { type: audioBlob.type });
                  const result = await upload(file);

                  if (result) {
                    onSendMessage("", {
                      url: result.url,
                      fileName: `Voice message (${Math.floor(duration)}s)`,
                      fileSize: result.fileSize,
                      fileType: "audio/webm",
                    });
                  } else {
                    toast.error("Failed to upload voice message");
                  }
                } catch (error) {
                  logger.error("Error uploading voice message", error instanceof Error ? error : new Error(String(error)), {
                    component: 'MessageInput',
                    action: 'uploadVoiceMessage',
                  });
                  toast.error("An error occurred while uploading the voice message");
                }
              }}
              onCancel={() => {}}
            />

            {/* Quick Reply Picker */}
            <QuickReplyPicker
              templates={templates}
              onSelect={handleQuickReplySelect}
            />
          </div>

          {/* Right action - Send Button */}
          <Button
            onClick={handleSend}
            disabled={(!message.trim() && !selectedFile) || disabled || uploadingFile}
            size="sm"
            className={cn(
              "h-7 px-3 gap-1.5 button-animate",
              (message.trim() || selectedFile) && !uploadingFile
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : ""
            )}
            title="Send message"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Send</span>
          </Button>
        </div>
      </div>

      {/* Helper text - Outside container */}
      <p className="text-xs text-muted-foreground mt-1.5">
        <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">Shift</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd> to add a new line
      </p>
    </div>
  );
}

