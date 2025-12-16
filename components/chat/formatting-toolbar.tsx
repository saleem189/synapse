"use client";

import { useState } from "react";
import {
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

export type FormatType =
  | "bold"
  | "italic"
  | "strikethrough"
  | "code"
  | "codeBlock"
  | "link"
  | "bulletList"
  | "orderedList"
  | "quote";

interface FormattingToolbarProps {
  onFormat: (type: FormatType) => void;
  className?: string;
  showPreview?: boolean;
  onTogglePreview?: () => void;
}

/**
 * FormattingToolbar - Rich text formatting controls
 * Inserts markdown formatting into textarea
 * Always visible with optional preview toggle
 */
export function FormattingToolbar({
  onFormat,
  className,
  showPreview = false,
  onTogglePreview,
}: FormattingToolbarProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30",
        className
      )}
    >
      <TooltipProvider delayDuration={300}>
        {/* Text Formatting */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onFormat("bold")}
              className="h-7 w-7 p-0 hover:bg-accent button-animate"
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

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onFormat("italic")}
              className="h-7 w-7 p-0 hover:bg-accent button-animate"
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

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onFormat("strikethrough")}
              className="h-7 w-7 p-0 hover:bg-accent button-animate"
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
              onClick={() => onFormat("code")}
              className="h-7 w-7 p-0 hover:bg-accent button-animate"
            >
              <Code className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Inline code</p>
          </TooltipContent>
        </Tooltip>

        {/* Link */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onFormat("link")}
              className="h-7 w-7 p-0 hover:bg-accent button-animate"
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

        {/* Lists */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onFormat("bulletList")}
              className="h-7 w-7 p-0 hover:bg-accent button-animate"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Bullet list</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onFormat("orderedList")}
              className="h-7 w-7 p-0 hover:bg-accent button-animate"
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Numbered list</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onFormat("quote")}
              className="h-7 w-7 p-0 hover:bg-accent button-animate"
            >
              <Quote className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Quote</p>
          </TooltipContent>
        </Tooltip>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Preview Toggle */}
        {onTogglePreview && (
          <>
            <Separator orientation="vertical" className="h-5 mx-1" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={showPreview ? "default" : "ghost"}
                  size="sm"
                  onClick={onTogglePreview}
                  className={cn(
                    "h-7 w-7 p-0 button-animate",
                    showPreview 
                      ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                      : "hover:bg-accent"
                  )}
                >
                  {showPreview ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">
                  {showPreview ? "Hide" : "Show"} preview
                </p>
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </TooltipProvider>
    </div>
  );
}

/**
 * Professional formatting utilities - Slack/Discord style
 * Handles selection and cursor positioning intelligently
 */
export function applyFormatting(
  type: FormatType,
  textarea: HTMLTextAreaElement,
  value: string
): { newValue: string; cursorPos: number } {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = value.substring(start, end);
  const hasSelection = selectedText.length > 0;

  let formattedText = "";
  let cursorOffset = 0;

  switch (type) {
    case "bold":
      if (hasSelection) {
        formattedText = `**${selectedText}**`;
        cursorOffset = formattedText.length;
      } else {
        formattedText = "****";
        cursorOffset = 2; // Place cursor between **|**
      }
      break;

    case "italic":
      if (hasSelection) {
        formattedText = `*${selectedText}*`;
        cursorOffset = formattedText.length;
      } else {
        formattedText = "**";
        cursorOffset = 1; // Place cursor between *|*
      }
      break;

    case "strikethrough":
      if (hasSelection) {
        formattedText = `~~${selectedText}~~`;
        cursorOffset = formattedText.length;
      } else {
        formattedText = "~~~~";
        cursorOffset = 2; // Place cursor between ~~|~~
      }
      break;

    case "code":
      if (hasSelection) {
        formattedText = `\`${selectedText}\``;
        cursorOffset = formattedText.length;
      } else {
        formattedText = "``";
        cursorOffset = 1; // Place cursor between `|`
      }
      break;

    case "codeBlock":
      if (hasSelection) {
        formattedText = `\`\`\`\n${selectedText}\n\`\`\``;
        cursorOffset = formattedText.length;
      } else {
        formattedText = "```\n\n```";
        cursorOffset = 4; // Place cursor on empty line
      }
      break;

    case "link":
      if (hasSelection) {
        formattedText = `[${selectedText}](url)`;
        cursorOffset = formattedText.length - 4; // Select "url"
      } else {
        formattedText = "[](url)";
        cursorOffset = 1; // Place cursor in link text
      }
      break;

    case "bulletList":
      if (hasSelection) {
        const lines = selectedText.split("\n");
        formattedText = lines.map((line) => {
          // Don't add bullet if line is empty
          if (line.trim() === "") return line;
          // Don't add bullet if already has one
          if (line.trimStart().startsWith("- ")) return line;
          return `- ${line}`;
        }).join("\n");
        cursorOffset = formattedText.length;
      } else {
        formattedText = "- ";
        cursorOffset = 2; // Place cursor after "- "
      }
      break;

    case "orderedList":
      if (hasSelection) {
        const lines = selectedText.split("\n");
        formattedText = lines.map((line, i) => {
          // Don't number if line is empty
          if (line.trim() === "") return line;
          // Don't number if already numbered
          if (/^\d+\.\s/.test(line.trimStart())) return line;
          return `${i + 1}. ${line}`;
        }).join("\n");
        cursorOffset = formattedText.length;
      } else {
        formattedText = "1. ";
        cursorOffset = 3; // Place cursor after "1. "
      }
      break;

    case "quote":
      if (hasSelection) {
        const lines = selectedText.split("\n");
        formattedText = lines.map((line) => {
          // Don't quote if line is empty
          if (line.trim() === "") return line;
          // Don't quote if already quoted
          if (line.trimStart().startsWith("> ")) return line;
          return `> ${line}`;
        }).join("\n");
        cursorOffset = formattedText.length;
      } else {
        formattedText = "> ";
        cursorOffset = 2; // Place cursor after "> "
      }
      break;
  }

  const newValue = value.substring(0, start) + formattedText + value.substring(end);
  const cursorPos = start + cursorOffset;

  return { newValue, cursorPos };
}

