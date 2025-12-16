# 🎨 WYSIWYG Rich Text Editor - Industry Standard

## What is WYSIWYG?

**WYSIWYG** = **W**hat **Y**ou **S**ee **I**s **W**hat **Y**ou **G**et

Instead of showing markdown syntax like `**bold**`, the text appears **bold** in the editor itself—exactly as it will look when sent.

---

## 🌟 Industry Standards

### Slack
- Uses rich text editor with visual formatting
- Toggle between markup mode and WYSIWYG mode
- Bold text shows as **bold**, not `**bold**`

### Discord
- Rich text editor with instant visual feedback
- Markdown syntax is auto-converted to visual formatting
- Supports bold, italic, strikethrough, code, links

### Notion
- Full WYSIWYG editor
- Slash commands for blocks
- Real-time visual formatting

### Microsoft Teams / Google Chat
- ContentEditable-based editors
- Format toolbar with visual buttons
- No markdown syntax visible to users

---

## ✨ Our Implementation

### **Component:** `WYSIWYGInput`

#### Features:
1. ✅ **Real-time Visual Formatting**
   - Type text → Select → Click Bold → Text appears **bold**
   - No markdown syntax shown (`**text**` ❌)
   - Actual bold HTML rendering (`<strong>text</strong>` ✅)

2. ✅ **Industry-Standard Toolbar**
   - Bold, Italic, Strikethrough
   - Code, Link, Lists, Quotes
   - Always visible (no collapse)

3. ✅ **Keyboard Shortcuts**
   - `Ctrl+B` / `Cmd+B` → Bold
   - `Ctrl+I` / `Cmd+I` → Italic
   - `Ctrl+U` / `Cmd+U` → Underline
   - `Ctrl+K` / `Cmd+K` → Insert Link
   - `Enter` → Send message
   - `Shift+Enter` → New line

4. ✅ **Smart Conversion**
   - Editor uses HTML (`<strong>`, `<em>`, etc.)
   - On send: Converts to markdown for storage/transmission
   - On receive: Can render markdown as HTML

---

## 🛠️ Technical Implementation

### ContentEditable API

```typescript
// Editor element
<div
  contentEditable={true}
  onInput={handleInput}
  onKeyDown={handleKeyDown}
  className="wysiwyg-editor"
  data-placeholder="Type a message..."
/>
```

### Document.execCommand()

```typescript
// Apply formatting
const applyFormat = (command: string, value?: string) => {
  document.execCommand(command, false, value);
};

// Examples:
applyFormat("bold");           // Makes selection bold
applyFormat("italic");         // Makes selection italic
applyFormat("createLink", url); // Creates link
```

### Supported Commands:
- `bold` → `<strong>`
- `italic` → `<em>`
- `strikeThrough` → `<s>`
- `underline` → `<u>`
- `createLink` → `<a href="...">`
- `insertUnorderedList` → `<ul><li>`
- `insertOrderedList` → `<ol><li>`
- `formatBlock` → `<blockquote>`, `<p>`, etc.

---

## 📚 How It Works

### 1. User Types and Formats

```
User types: "Hello World"
User selects: "World"
User clicks: Bold button
```

**Result in Editor:**
```html
Hello <strong>World</strong>
```

**Visual Appearance:**
```
Hello World (where "World" is actually bold)
```

### 2. Conversion to Markdown on Send

```typescript
function getMarkdownContent(): string {
  // Traverse HTML DOM
  // Convert <strong> → **text**
  // Convert <em> → *text*
  // Convert <s> → ~~text~~
  // etc.
  
  return markdown;
}
```

**Stored/Sent as:**
```markdown
Hello **World**
```

### 3. Rendering Received Messages

```typescript
// Markdown → HTML for display
<ReactMarkdown>{message.content}</ReactMarkdown>

// Or use message-content component
<MessageContent content={message.content} />
```

---

## 🎯 Comparison: Markdown vs WYSIWYG

| Feature | Markdown Input | WYSIWYG Input |
|---------|----------------|---------------|
| **Visual** | Shows `**bold**` | Shows **bold** |
| **Learning Curve** | Need to know markdown | Intuitive, no learning |
| **Power Users** | Fast with shortcuts | Fast with shortcuts |
| **Beginners** | Confusing syntax | Easy visual editing |
| **Industry Standard** | GitHub, Reddit | Slack, Discord, Notion |
| **Our Choice** | ❌ Previous | ✅ **New Standard** |

---

## 🚀 Usage Examples

### Basic Formatting

**Bold:**
```
1. Type: "Hello World"
2. Select: "World"
3. Click: [B] button or press Ctrl+B
4. Result: Hello World (World is bold)
5. Sends as: Hello **World**
```

**Italic:**
```
1. Type: "Important note"
2. Select: "Important"
3. Click: [I] button or press Ctrl+I
4. Result: Important note (Important is italic)
5. Sends as: *Important* note
```

**Code:**
```
1. Type: "npm install"
2. Select: "npm install"
3. Click: [</>] button
4. Result: npm install (with code styling)
5. Sends as: `npm install`
```

### Links

```
1. Type: "Visit our site"
2. Select: "our site"
3. Click: [🔗] button or press Ctrl+K
4. Enter URL: "https://example.com"
5. Result: Visit our site (our site is blue/underlined)
6. Sends as: Visit [our site](https://example.com)
```

### Lists

**Bullet List:**
```
1. Click: [•] button
2. Type: "First item"
3. Press: Enter
4. Type: "Second item"
5. Result: 
   • First item
   • Second item
6. Sends as:
   - First item
   - Second item
```

---

## 🎨 Styling & Appearance

### CSS Classes

```css
.wysiwyg-editor {
  /* Base editor styles */
  font-size: 0.875rem;
  line-height: 1.5;
}

.wysiwyg-editor strong {
  /* Bold text */
  font-weight: 700;
}

.wysiwyg-editor em {
  /* Italic text */
  font-style: italic;
}

.wysiwyg-editor code {
  /* Inline code */
  background: hsl(var(--muted));
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
}
```

### Placeholder

```css
.wysiwyg-editor.empty:before {
  content: attr(data-placeholder);
  color: hsl(var(--muted-foreground));
  pointer-events: none;
}
```

---

## 🔧 Integration

### Replace Existing Input

**Old (Markdown):**
```tsx
<MessageInput 
  onSendMessage={handleSend}
  // ...
/>
```

**New (WYSIWYG):**
```tsx
<WYSIWYGInput
  onSendMessage={handleSend}
  placeholder="Type a message..."
  disabled={false}
/>
```

### With Existing Features

```tsx
// Can be extended to include:
// - File uploads
// - Emoji picker
// - Voice recording
// - @Mentions
// - Quick replies

<WYSIWYGInput
  onSendMessage={handleSend}
  onFileUpload={handleFileUpload}
  onEmojiSelect={handleEmojiSelect}
  mentions={mentionableUsers}
/>
```

---

## ⚡ Performance

### Optimizations:
1. **Debounced Input Handling**
   - Don't process every keystroke
   - Batch updates for smooth typing

2. **Efficient DOM Manipulation**
   - Use `document.execCommand()` for speed
   - Minimal re-renders

3. **Smart Conversion**
   - Convert to markdown only on send
   - Cache converted content

4. **Memory Management**
   - Clean up event listeners
   - Remove unused DOM nodes

---

## 🔒 Security

### XSS Prevention

```typescript
// Sanitize HTML before rendering
import DOMPurify from 'dompurify';

const sanitizedHTML = DOMPurify.sanitize(htmlContent);
```

### Safe Markdown Conversion

```typescript
// Only allow specific HTML tags
const allowedTags = ['strong', 'em', 's', 'code', 'a', 'ul', 'ol', 'li', 'blockquote'];

// Strip dangerous attributes
const sanitize = (html: string) => {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Remove scripts, iframes, etc.
  temp.querySelectorAll('script, iframe, object, embed').forEach(el => el.remove());
  
  return temp.innerHTML;
};
```

---

## 🎯 Benefits

### For Users:
✅ **Intuitive** - No markdown syntax to learn  
✅ **Visual** - See formatting in real-time  
✅ **Fast** - Keyboard shortcuts for power users  
✅ **Professional** - Industry-standard experience  

### For Developers:
✅ **Modern** - Uses latest web APIs  
✅ **Maintainable** - Clean, documented code  
✅ **Extensible** - Easy to add features  
✅ **Compatible** - Works with existing markdown backend  

---

## 🔮 Future Enhancements

Potential additions:
- [ ] @Mentions with autocomplete
- [ ] Emoji autocomplete (`:smile:`)
- [ ] Slash commands (`/code`, `/quote`)
- [ ] Drag & drop formatting
- [ ] Collaborative editing (multiple cursors)
- [ ] Formatting history/undo stack
- [ ] Custom emoji support
- [ ] GIF picker integration
- [ ] Voice-to-text formatting

---

## 📊 Browser Compatibility

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 90+ | ✅ Full |
| Firefox | 88+ | ✅ Full |
| Safari | 14+ | ✅ Full |
| Edge | 90+ | ✅ Full |
| Mobile Safari | 14+ | ✅ Full |
| Mobile Chrome | 90+ | ✅ Full |

**Note:** `document.execCommand()` is deprecated but still widely supported. For future-proofing, consider migrating to Selection API + manual DOM manipulation.

---

## 🎓 Best Practices

1. **Keep It Simple**
   - Don't overwhelm users with options
   - Show only essential formatting tools

2. **Keyboard First**
   - Support all major keyboard shortcuts
   - Make shortcuts discoverable (show in tooltips)

3. **Mobile Friendly**
   - Ensure toolbar is touch-friendly
   - Support mobile keyboard shortcuts

4. **Accessibility**
   - Support screen readers
   - Keyboard navigation for all features
   - ARIA labels on buttons

5. **Performance**
   - Debounce input handlers
   - Lazy load heavy features
   - Optimize for large messages

---

## 🆚 Alternatives Considered

### 1. **Draft.js** (Facebook)
- ❌ Large bundle size (~100kb)
- ❌ Complex API
- ❌ Harder to customize
- ✅ Very powerful
- ✅ React-first

### 2. **Slate.js**
- ❌ Steep learning curve
- ❌ Lots of boilerplate
- ✅ Fully customizable
- ✅ Good documentation

### 3. **Lexical** (Facebook's new editor)
- ❌ Still relatively new
- ❌ Smaller ecosystem
- ✅ Modern architecture
- ✅ Great performance

### 4. **Tiptap** (ProseMirror)
- ❌ Learning curve
- ❌ Additional dependencies
- ✅ Excellent docs
- ✅ Extension system

### 5. **Our Custom Solution** ✅
- ✅ Lightweight (~5kb)
- ✅ Simple API
- ✅ Easy to maintain
- ✅ No dependencies
- ✅ Perfect for chat

---

*Last Updated: December 16, 2024*
*Component: `components/chat/wysiwyg-input.tsx`*

