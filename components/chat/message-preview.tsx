"use client";

import { cn } from "@/lib/utils";

interface MessagePreviewProps {
  content: string;
  className?: string;
}

/**
 * Simple markdown renderer for live preview
 * Supports: bold, italic, strikethrough, code, code blocks, links, quotes, lists
 */
function renderMarkdown(text: string): string {
  if (!text) return "";

  let html = text;

  // Escape HTML to prevent XSS
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks (must be before inline code)
  html = html.replace(/```([^`]+)```/g, '<pre class="code-block">$1</pre>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  // Strikethrough
  html = html.replace(/~~([^~]+)~~/g, "<del>$1</del>");

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Process line by line for quotes and lists
  const lines = html.split("\n");
  const processedLines = lines.map((line) => {
    // Blockquote
    if (line.trimStart().startsWith("&gt; ")) {
      return `<blockquote>${line.replace(/&gt; /, "")}</blockquote>`;
    }
    // Unordered list
    if (line.trimStart().startsWith("- ")) {
      return `<li class="bullet">${line.replace(/- /, "")}</li>`;
    }
    // Ordered list
    if (/^\d+\.\s/.test(line.trimStart())) {
      return `<li class="ordered">${line.replace(/^\d+\.\s/, "")}</li>`;
    }
    // Regular line
    return line ? `<p>${line}</p>` : "<br/>";
  });

  return processedLines.join("");
}

/**
 * MessagePreview - Shows live preview of formatted markdown
 * Renders markdown exactly as it will appear in the chat
 */
export function MessagePreview({ content, className }: MessagePreviewProps) {
  // If content is empty, show placeholder
  const isEmpty = !content.trim();

  if (isEmpty) {
    return (
      <div
        className={cn(
          "px-3 py-2 bg-muted/30 min-h-[60px] flex items-center justify-center",
          className
        )}
      >
        <p className="text-muted-foreground text-sm italic">
          Preview will appear here...
        </p>
      </div>
    );
  }

  const renderedHtml = renderMarkdown(content);

  return (
    <div
      className={cn(
        "px-3 py-2 bg-muted/30 preview-content",
        "text-sm leading-relaxed",
        className
      )}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
      style={{
        // Custom CSS for preview styling
        fontFamily: "inherit",
      }}
    />
  );
}

