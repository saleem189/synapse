// ================================
// Text Formatting Utilities
// ================================
// Functions to parse and format text with markdown-like syntax

import React from "react";
import { cn } from "@/lib/utils";

export interface FormattedText {
  type: "text" | "bold" | "italic" | "code" | "link" | "mention";
  content: string;
  url?: string;
  userId?: string;
}

/**
 * Parse text with markdown-like formatting
 * Supports: **bold**, *italic*, `code`, and URLs
 */
export function parseFormattedText(text: string): FormattedText[] {
  const parts: FormattedText[] = [];
  let currentIndex = 0;
  const textLength = text.length;

  while (currentIndex < textLength) {
    // Check for mentions @[Username](userId)
    const mentionMatch = text.substring(currentIndex).match(/^@\[([^\]]+)\]\(([^)]+)\)/);
    if (mentionMatch) {
      if (currentIndex > 0) {
        parts.push({ type: "text", content: text.substring(0, currentIndex) });
      }
      parts.push({ type: "mention", content: mentionMatch[1], userId: mentionMatch[2] });
      text = text.substring(currentIndex + mentionMatch[0].length);
      currentIndex = 0;
      continue;
    }

    // Check for code blocks (backticks)
    const codeMatch = text.substring(currentIndex).match(/^`([^`]+)`/);
    if (codeMatch) {
      if (currentIndex > 0) {
        parts.push({ type: "text", content: text.substring(0, currentIndex) });
      }
      parts.push({ type: "code", content: codeMatch[1] });
      text = text.substring(currentIndex + codeMatch[0].length);
      currentIndex = 0;
      continue;
    }

    // Check for bold (**text**)
    const boldMatch = text.substring(currentIndex).match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      if (currentIndex > 0) {
        parts.push({ type: "text", content: text.substring(0, currentIndex) });
      }
      parts.push({ type: "bold", content: boldMatch[1] });
      text = text.substring(currentIndex + boldMatch[0].length);
      currentIndex = 0;
      continue;
    }

    // Check for italic (*text*)
    const italicMatch = text.substring(currentIndex).match(/^\*([^*]+)\*/);
    if (italicMatch) {
      if (currentIndex > 0) {
        parts.push({ type: "text", content: text.substring(0, currentIndex) });
      }
      parts.push({ type: "italic", content: italicMatch[1] });
      text = text.substring(currentIndex + italicMatch[0].length);
      currentIndex = 0;
      continue;
    }

    // Check for URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urlMatch = urlRegex.exec(text.substring(currentIndex));
    if (urlMatch && urlMatch.index === 0) {
      if (currentIndex > 0) {
        parts.push({ type: "text", content: text.substring(0, currentIndex) });
      }
      parts.push({ type: "link", content: urlMatch[1], url: urlMatch[1] });
      text = text.substring(currentIndex + urlMatch[0].length);
      currentIndex = 0;
      continue;
    }

    currentIndex++;
  }

  // Add remaining text
  if (text.length > 0) {
    parts.push({ type: "text", content: text });
  }

  return parts.length > 0 ? parts : [{ type: "text", content: text }];
}

/**
 * Render formatted text as React elements
 * Returns an array of React elements with proper formatting
 */
export function renderFormattedText(
  parts: FormattedText[],
  className?: string
): React.ReactNode {
  return parts.map((part, index) => {
    switch (part.type) {
      case "bold":
        return (
          <strong key={index} className={className}>
            {part.content}
          </strong>
        );
      case "italic":
        return (
          <em key={index} className={className}>
            {part.content}
          </em>
        );
      case "code":
        return (
          <code
            key={index}
            className={cn(
              "px-1.5 py-0.5 rounded bg-surface-200 dark:bg-surface-800 text-sm font-mono",
              className
            )}
          >
            {part.content}
          </code>
        );
      case "link":
        return (
          <a
            key={index}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "underline hover:opacity-80 transition-opacity",
              className
            )}
          >
            {part.content}
          </a>
        );
      case "mention":
        return (
          <span
            key={index}
            className={cn(
              "font-semibold text-primary-600 dark:text-primary-400",
              className
            )}
          >
            @{part.content}
          </span>
        );
      default:
        return <span key={index}>{part.content}</span>;
    }
  });
}

