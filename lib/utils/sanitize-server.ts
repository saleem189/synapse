// ================================
// Server-Side Input Sanitization
// ================================
// Sanitizes user input on the server to prevent XSS attacks
// Uses a simple but effective approach for server-side sanitization

/**
 * Sanitize message content on the server
 * Removes dangerous HTML tags and attributes
 * 
 * @param content - Raw message content from user
 * @returns Sanitized string safe for storage
 */
export function sanitizeMessageContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Remove script tags and event handlers
  let sanitized = content
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove iframe tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Remove object/embed tags
    .replace(/<(object|embed)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '')
    // Remove event handlers (onclick, onerror, etc.)
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: and data: protocols
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '');

  // Allow only safe HTML tags (basic formatting)
  const allowedTags = ['b', 'i', 'em', 'strong', 'a', 'code', 'pre', 'br', 'p'];
  const tagPattern = new RegExp(`<(?!\/?(${allowedTags.join('|')})\b)[^>]+>`, 'gi');
  sanitized = sanitized.replace(tagPattern, '');

  // Remove dangerous attributes from allowed tags
  sanitized = sanitized.replace(/<(\w+)([^>]*)>/gi, (match, tag, attrs) => {
    if (!allowedTags.includes(tag.toLowerCase())) {
      return '';
    }
    
    // Only allow safe attributes
    const safeAttrs = attrs
      .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
      .replace(/\s*href\s*=\s*["'](?!javascript:|data:)[^"']*["']/gi, (hrefMatch: string) => {
        // Only allow http/https URLs
        const urlMatch = hrefMatch.match(/["']([^"']+)["']/);
        if (urlMatch && (urlMatch[1].startsWith('http://') || urlMatch[1].startsWith('https://'))) {
          return hrefMatch;
        }
        return '';
      })
      .replace(/\s*(target|rel)\s*=\s*["'][^"']*["']/gi, ''); // Allow target and rel
    
    return `<${tag}${safeAttrs}>`;
  });

  return sanitized.trim();
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

