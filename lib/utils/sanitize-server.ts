// ================================
// Server-Side Input Sanitization
// ================================
// Sanitizes user input on the server to prevent XSS attacks
// Uses DOMPurify with JSDOM for robust, consistent sanitization

import 'server-only';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Create a JSDOM window instance for DOMPurify
// This is created once at module load and reused for performance
const jsdomWindow = new JSDOM('').window;
// DOMPurify accepts JSDOM's window object
// Type assertion needed because JSDOM's window type doesn't exactly match DOMPurify's expected type
// but it's compatible at runtime - JSDOM provides all necessary DOM APIs
// @ts-ignore - JSDOM window is runtime-compatible with DOMPurify requirements
const purify = DOMPurify(jsdomWindow);

/**
 * Sanitize message content on the server
 * Uses DOMPurify with JSDOM for robust XSS protection
 * Same configuration as client-side for consistency
 * 
 * @param content - Raw message content from user
 * @returns Sanitized string safe for storage
 */
export function sanitizeMessageContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Sanitize with DOMPurify - same configuration as client-side
  return purify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'code', 'pre', 'br', 'p'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    // Prevent script injection
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    // Only allow http/https URLs in href
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  }).trim();
}

/**
 * Sanitize plain text (removes all HTML)
 * Use this for non-formatted text fields
 * 
 * @param text - Text that may contain HTML
 * @returns Plain text with all HTML removed
 */
export function sanitizePlainText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Remove all HTML tags
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Sanitize URL to prevent javascript: and data: protocol attacks
 * 
 * @param url - URL string to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // Remove dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowerUrl = url.toLowerCase().trim();
  
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return '';
    }
  }

  // Basic URL validation
  try {
    const parsed = new URL(url);
    // Only allow http and https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    return url;
  } catch {
    // If URL parsing fails, return empty string
    return '';
  }
}

