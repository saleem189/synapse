"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Paperclip,
  Smile,
  Mic,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Eye,
  EyeOff,
  X,
  File as FileIcon,
  Image as ImageIconLucide,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { EmojiPicker } from "./emoji-picker";
import { VoiceRecorder } from "./voice-recorder";
import { useFileUpload } from "@/hooks";
import { QuickReplyPicker } from "@/features/quick-replies/quick-reply-picker";
import { DEFAULT_QUICK_REPLIES, type QuickReplyTemplate } from "@/features/quick-replies/types";
import { useMentions, MentionSuggestions, type MentionableUser } from "@/features/mentions";

interface WYSIWYGInputProps {
  onSendMessage: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
  mentionableUsers?: MentionableUser[];
}

/**
 * WYSIWYG Rich Text Editor - Industry Standard
 * What You See Is What You Get - Like Slack, Notion, Discord
 * Text appears formatted as you type (bold shows as bold, not **bold**)
 */
export function WYSIWYGInput({
  onSendMessage,
  placeholder = "Type a message...",
  disabled = false,
  mentionableUsers = [],
}: WYSIWYGInputProps) {
  const [showPreview, setShowPreview] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  
  // File upload state
  const { upload, uploading: uploadingFile } = useFileUpload();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick reply templates (hydrate with proper fields)
  const quickReplyTemplates: QuickReplyTemplate[] = DEFAULT_QUICK_REPLIES.map((template, index) => ({
    ...template,
    id: `default-${index}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  // Mentions functionality
  const mentions = useMentions({
    users: mentionableUsers,
    onMentionInsert: (userId) => {
      logger.log(`Mentioned user ${userId}`, { component: 'WYSIWYGInput' });
    },
  });

  // Check if editor is empty
  const checkIfEmpty = useCallback(() => {
    if (!editorRef.current) return true;
    const text = editorRef.current.innerText.trim();
    setIsEmpty(text.length === 0);
    return text.length === 0;
  }, []);

  // Get text content and cursor position from contenteditable
  const getEditorState = useCallback(() => {
    if (!editorRef.current) return { text: '', cursorPosition: 0 };

    const text = editorRef.current.innerText || '';
    let cursorPosition = 0;

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(editorRef.current);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      cursorPosition = preCaretRange.toString().length;
    }

    return { text, cursorPosition };
  }, []);

  // Handle input changes
  const handleInput = useCallback(() => {
    checkIfEmpty();
    
    // Check for @ mentions
    const { text, cursorPosition } = getEditorState();
    mentions.handleTextChange(text, cursorPosition);
  }, [checkIfEmpty, getEditorState, mentions]);

  // Apply formatting command
  const applyFormat = useCallback((command: string, value?: string) => {
    if (disabled) return;

    // Focus the editor first
    editorRef.current?.focus();

    // Apply the formatting command
    document.execCommand(command, false, value);

    // Check if empty after formatting
    checkIfEmpty();
  }, [disabled, checkIfEmpty]);

  // Insert emoji at cursor position
  const insertEmoji = useCallback((emoji: string) => {
    if (disabled || !editorRef.current) return;

    // Focus the editor
    editorRef.current.focus();

    // Get the current selection
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // No selection, append to end
      const textNode = document.createTextNode(emoji);
      editorRef.current.appendChild(textNode);
    } else {
      // Insert at cursor position
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(emoji);
      range.insertNode(textNode);
      
      // Move cursor after emoji
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    // Trigger input event to update state
    editorRef.current.dispatchEvent(new Event('input', { bubbles: true }));
    checkIfEmpty();
  }, [disabled, checkIfEmpty]);

  // Get HTML content and convert to markdown for sending
  const getMarkdownContent = useCallback((): string => {
    if (!editorRef.current) return "";

    // Clone the content to manipulate
    const clone = editorRef.current.cloneNode(true) as HTMLElement;

    // Convert HTML to markdown
    let markdown = "";

    const processNode = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || "";
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const children = Array.from(element.childNodes)
          .map(processNode)
          .join("");

        // Convert HTML tags to markdown
        switch (element.tagName) {
          case "STRONG":
          case "B":
            return `**${children}**`;
          case "EM":
          case "I":
            return `*${children}*`;
          case "S":
          case "STRIKE":
          case "DEL":
            return `~~${children}~~`;
          case "CODE":
            return `\`${children}\``;
          case "A":
            const href = element.getAttribute("href") || "";
            return `[${children}](${href})`;
          case "BLOCKQUOTE":
            return `> ${children}`;
          case "LI":
            return `- ${children}\n`;
          case "BR":
            return "\n";
          case "DIV":
          case "P":
            return children + "\n";
          default:
            return children;
        }
      }

      return "";
    };

    markdown = Array.from(clone.childNodes)
      .map(processNode)
      .join("")
      .trim();

    return markdown;
  }, []);

  // Handle voice recording completion
  const handleVoiceRecordingComplete = useCallback(async (audioBlob: Blob, duration: number) => {
    try {
      // Create file from blob
      const fileName = `voice_${Date.now()}.${audioBlob.type.includes('webm') ? 'webm' : 'mp4'}`;
      const file = new File([audioBlob], fileName, { type: audioBlob.type });

      // Upload audio file
      const result = await upload(file);

      if (result) {
        // Send voice message (with current text if any)
        const currentText = getMarkdownContent();
        const messageContent = currentText 
          ? `${currentText}\n\n[Voice message (${Math.floor(duration)}s)](${result.url})`
          : `[Voice message (${Math.floor(duration)}s)](${result.url})`;
        
        onSendMessage(messageContent);

        // Clear editor
        if (editorRef.current) {
          editorRef.current.innerHTML = "";
          setIsEmpty(true);
        }
      } else {
        toast.error("Failed to upload voice message");
      }
    } catch (error) {
      logger.error("Error uploading voice message", error instanceof Error ? error : new Error(String(error)), {
        component: 'WYSIWYGInput',
        action: 'uploadVoiceMessage',
      });
      toast.error("An error occurred while uploading the voice message");
    }
  }, [upload, getMarkdownContent, onSendMessage]);

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        toast.error("File size exceeds 50MB limit");
        return;
      }
      setSelectedFile(file);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Handle drag and drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      // Validate file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        toast.error("File size exceeds 50MB limit");
        return;
      }
      setSelectedFile(file);
    }
  }, []);

  // Remove selected file
  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  // Handle quick reply selection
  const handleQuickReplySelect = useCallback((template: QuickReplyTemplate) => {
    if (disabled || !editorRef.current) return;

    // Focus the editor
    editorRef.current.focus();

    // Insert the template content at cursor position
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // No selection, append to end
      const textNode = document.createTextNode(template.content);
      editorRef.current.appendChild(textNode);
    } else {
      // Insert at cursor position
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(template.content);
      range.insertNode(textNode);
      
      // Move cursor after inserted text
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    // Trigger input event to update state
    editorRef.current.dispatchEvent(new Event('input', { bubbles: true }));
    checkIfEmpty();
  }, [disabled, checkIfEmpty]);

  // Handle mention selection
  const handleMentionSelect = useCallback((user: MentionableUser) => {
    if (disabled || !editorRef.current) return;

    const { text, cursorPosition } = getEditorState();
    const result = mentions.selectUser(user, text, cursorPosition);

    // Update editor content
    const textNode = document.createTextNode(result.newText);
    editorRef.current.innerHTML = '';
    editorRef.current.appendChild(textNode);

    // Set cursor position
    const range = document.createRange();
    const sel = window.getSelection();
    range.setStart(textNode, Math.min(result.newCursorPosition, textNode.length));
    range.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(range);

    // Trigger input event
    editorRef.current.dispatchEvent(new Event('input', { bubbles: true }));
    checkIfEmpty();
  }, [disabled, getEditorState, mentions, checkIfEmpty]);

  // Handle send
  const handleSend = useCallback(async () => {
    if (disabled || (isEmpty && !selectedFile)) return;

    const content = getMarkdownContent();
    if (!content.trim() && !selectedFile) return;

    try {
      // Upload file if selected
      if (selectedFile) {
        const result = await upload(selectedFile);
        if (result) {
          // Include file in message
          const fileMarkdown = `[${selectedFile.name}](${result.url})`;
          const finalContent = content.trim() 
            ? `${content}\n\n${fileMarkdown}`
            : fileMarkdown;
          
          onSendMessage(finalContent);
        } else {
          toast.error("Failed to upload file");
          return;
        }
      } else {
        // Send text only
        onSendMessage(content);
      }

      // Clear the editor and file
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
        setIsEmpty(true);
      }
      setSelectedFile(null);
    } catch (error) {
      logger.error("Error sending message", error instanceof Error ? error : new Error(String(error)), {
        component: 'WYSIWYGInput',
        action: 'handleSend',
      });
      toast.error("An error occurred while sending the message");
    }
  }, [disabled, isEmpty, selectedFile, getMarkdownContent, upload, onSendMessage]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Check if mentions are open - let mentions hook handle navigation
      if (mentions.isOpen) {
        const { text, cursorPosition } = getEditorState();
        const result = mentions.handleKeyDown(e, text, cursorPosition);
        
        if (result.preventDefault) {
          e.preventDefault();
          
          // If mention was selected (Enter/Tab), update editor content
          if (result.newText !== undefined && result.newCursorPosition !== undefined && editorRef.current) {
            // Update editor content
            const textNode = document.createTextNode(result.newText);
            editorRef.current.innerHTML = '';
            editorRef.current.appendChild(textNode);
            
            // Set cursor position
            const range = document.createRange();
            const sel = window.getSelection();
            range.setStart(textNode, Math.min(result.newCursorPosition, textNode.length));
            range.collapse(true);
            sel?.removeAllRanges();
            sel?.addRange(range);
            
            // Trigger input event
            editorRef.current.dispatchEvent(new Event('input', { bubbles: true }));
          }
          return;
        }
      }

      // Ctrl/Cmd + B = Bold
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        applyFormat("bold");
        return;
      }

      // Ctrl/Cmd + I = Italic
      if ((e.ctrlKey || e.metaKey) && e.key === "i") {
        e.preventDefault();
        applyFormat("italic");
        return;
      }

      // Ctrl/Cmd + U = Underline
      if ((e.ctrlKey || e.metaKey) && e.key === "u") {
        e.preventDefault();
        applyFormat("underline");
        return;
      }

      // Enter to send (without Shift)
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
        return;
      }
    },
    [applyFormat, handleSend, mentions, getEditorState]
  );

  // Insert link
  const insertLink = useCallback(() => {
    const url = prompt("Enter the URL:");
    if (url) {
      applyFormat("createLink", url);
    }
  }, [applyFormat]);

  return (
    <div className="px-5 pb-5">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar"
      />

      {/* Slack-style Input Container */}
      <div 
        className={cn(
          // Base styling - Slack-inspired
          "rounded-lg border-2 overflow-hidden relative",
          "transition-all duration-200",
          // Background & Border
          "bg-background border-border",
          "shadow-sm hover:shadow-md",
          // Focus state (when typing)
          isEmpty 
            ? "border-border" 
            : "border-primary/50 shadow-primary/10",
          // Drag state
          isDragging && "border-primary bg-primary/5 ring-2 ring-primary/20 scale-[0.99]"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary flex items-center justify-center z-50 pointer-events-none">
            <div className="text-center">
              <Paperclip className="w-12 h-12 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-primary">Drop file to upload</p>
            </div>
          </div>
        )}

        {/* Formatting Toolbar - Slack style */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-border/50 bg-surface-50 dark:bg-surface-900">
          <TooltipProvider delayDuration={300}>
            {/* Bold */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => applyFormat("bold")}
                  className="h-7 w-7 p-0 hover:bg-accent button-animate"
                  disabled={disabled}
                >
                  <Bold className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">
                  Bold <kbd className="ml-1 px-1 py-0.5 bg-muted rounded text-[10px]">Ctrl+B</kbd>
                </p>
              </TooltipContent>
            </Tooltip>

            {/* Italic */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => applyFormat("italic")}
                  className="h-7 w-7 p-0 hover:bg-accent button-animate"
                  disabled={disabled}
                >
                  <Italic className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">
                  Italic <kbd className="ml-1 px-1 py-0.5 bg-muted rounded text-[10px]">Ctrl+I</kbd>
                </p>
              </TooltipContent>
            </Tooltip>

            {/* Strikethrough */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => applyFormat("strikeThrough")}
                  className="h-7 w-7 p-0 hover:bg-accent button-animate"
                  disabled={disabled}
                >
                  <Strikethrough className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Strikethrough</p>
              </TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-5 mx-0.5" />

            {/* Code */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Wrap selection in <code> tag
                    const selection = window.getSelection();
                    if (selection && selection.rangeCount > 0) {
                      const range = selection.getRangeAt(0);
                      const code = document.createElement("code");
                      code.className = "inline-code-wysiwyg";
                      code.appendChild(range.extractContents());
                      range.insertNode(code);
                    }
                  }}
                  className="h-7 w-7 p-0 hover:bg-accent button-animate"
                  disabled={disabled}
                >
                  <Code className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Code</p>
              </TooltipContent>
            </Tooltip>

            {/* Link */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={insertLink}
                  className="h-7 w-7 p-0 hover:bg-accent button-animate"
                  disabled={disabled}
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">
                  Insert link <kbd className="ml-1 px-1 py-0.5 bg-muted rounded text-[10px]">Ctrl+K</kbd>
                </p>
              </TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-5 mx-0.5" />

            {/* Bullet List */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => applyFormat("insertUnorderedList")}
                  className="h-7 w-7 p-0 hover:bg-accent button-animate"
                  disabled={disabled}
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Bullet list</p>
              </TooltipContent>
            </Tooltip>

            {/* Numbered List */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => applyFormat("insertOrderedList")}
                  className="h-7 w-7 p-0 hover:bg-accent button-animate"
                  disabled={disabled}
                >
                  <ListOrdered className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Numbered list</p>
              </TooltipContent>
            </Tooltip>

            {/* Quote */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => applyFormat("formatBlock", "blockquote")}
                  className="h-7 w-7 p-0 hover:bg-accent button-animate"
                  disabled={disabled}
                >
                  <Quote className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Quote</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* WYSIWYG Editor Area */}
        <div className="relative">
          <div
            ref={editorRef}
            contentEditable={!disabled}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            className={cn(
              "px-3 py-2 min-h-[60px] max-h-[200px] overflow-y-auto",
              "focus:outline-none",
              "wysiwyg-editor",
              isEmpty && "empty"
            )}
            data-placeholder={placeholder}
            suppressContentEditableWarning
          />

          {/* Mention Suggestions */}
          {mentions.isOpen && mentions.filteredUsers.length > 0 && (
            <MentionSuggestions
              users={mentions.filteredUsers}
              selectedIndex={mentions.selectedIndex}
              onSelect={handleMentionSelect}
              onClose={mentions.close}
            />
          )}
        </div>

        {/* File Preview */}
        {selectedFile && (
          <div className="px-3 py-2 border-t border-border bg-muted/30">
            <div className="flex items-center gap-3 bg-background rounded-lg p-2 border border-border">
              <div className="flex-shrink-0">
                {selectedFile.type.startsWith('image/') ? (
                  <ImageIconLucide className="w-8 h-8 text-blue-500" />
                ) : selectedFile.type.startsWith('video/') ? (
                  <Video className="w-8 h-8 text-purple-500" />
                ) : (
                  <FileIcon className="w-8 h-8 text-gray-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleRemoveFile}
                className="h-7 w-7 flex-shrink-0 hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Uploading Indicator */}
        {uploadingFile && (
          <div className="px-3 py-2 border-t border-border bg-primary/10">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-primary">Uploading file...</p>
            </div>
          </div>
        )}

        {/* Bottom Actions Bar - Slack style */}
        <div className="px-3 pb-3 flex items-center justify-between gap-2 border-t border-border/50 pt-3 bg-surface-50 dark:bg-surface-900">
          {/* Left actions */}
          <div className="flex items-center gap-0.5">
            <TooltipProvider>
              {/* Attachment */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-accent"
                    disabled={disabled || uploadingFile}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Attach file</TooltipContent>
              </Tooltip>

              {/* Emoji Picker */}
              <div className="h-7 w-7 flex items-center justify-center">
                <EmojiPicker onEmojiSelect={insertEmoji} />
              </div>

              {/* Voice Recorder */}
              <div className="h-7 flex items-center">
                <VoiceRecorder
                  onRecordingComplete={handleVoiceRecordingComplete}
                  onCancel={() => {}}
                />
              </div>

              {/* Quick Reply Picker */}
              <div className="h-7 w-7 flex items-center justify-center">
                <QuickReplyPicker
                  templates={quickReplyTemplates}
                  onSelect={handleQuickReplySelect}
                />
              </div>
            </TooltipProvider>
          </div>

          {/* Send Button - Slack-style (green when active) */}
          <Button
            onClick={handleSend}
            disabled={(isEmpty && !selectedFile) || disabled || uploadingFile}
            size="sm"
            className={cn(
              "h-8 px-4 gap-2 rounded-md font-semibold transition-base press-effect",
              (!isEmpty || selectedFile) && !disabled && !uploadingFile
                ? "bg-success text-white hover:bg-success/90 shadow-sm"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Send className="w-4 h-4" />
            <span className="text-sm">
              {uploadingFile ? "Sending..." : "Send"}
            </span>
          </Button>
        </div>
      </div>

      {/* Helper text - Slack style */}
      <div className="mt-2 px-1 flex items-center justify-between">
        <p className="text-[12px] text-muted-foreground">
          <kbd className="px-1.5 py-0.5 bg-surface-200 dark:bg-surface-700 rounded text-[11px] font-mono">⇧ Shift</kbd>
          {" + "}
          <kbd className="px-1.5 py-0.5 bg-surface-200 dark:bg-surface-700 rounded text-[11px] font-mono">↵ Enter</kbd>
          {" "}for new line
        </p>
      </div>
    </div>
  );
}

