# Enhanced UI Components

Professional, polished components following Slack/AWS Cloudscape design patterns.

## 🎨 Components

### StatusIndicator

Professional status indicators with colored dots.

**Import:**
```tsx
import { StatusIndicator, StatusDot } from '@/components/enhanced';
```

**Usage:**
```tsx
// With label
<StatusIndicator type="success">Online</StatusIndicator>
<StatusIndicator type="warning">Away</StatusIndicator>
<StatusIndicator type="error">Error</StatusIndicator>
<StatusIndicator type="info">Processing</StatusIndicator>
<StatusIndicator type="offline">Offline</StatusIndicator>

// With pulse animation
<StatusIndicator type="success" withPulse>Online</StatusIndicator>

// Different sizes
<StatusIndicator type="success" size="sm">Online</StatusIndicator>
<StatusIndicator type="success" size="md">Online</StatusIndicator>
<StatusIndicator type="success" size="lg">Online</StatusIndicator>

// Just the dot (for avatars)
<div className="relative">
  <Avatar>...</Avatar>
  <StatusDot type="success" position="avatar" withPulse />
</div>
```

**Types:**
- `success` - Green dot (Online, Active, Success)
- `warning` - Orange dot (Away, Busy, Warning)
- `error` - Red dot (Error, Critical)
- `info` - Blue dot (Info, Processing)
- `offline` - Gray dot (Offline, Inactive)

---

### EmptyState

Beautiful empty state component with icon, title, description, and optional action.

**Import:**
```tsx
import { EmptyState, EmptyStateCompact, EmptyStateInline } from '@/components/enhanced';
```

**Usage:**
```tsx
import { MessageCircle, Search, Hash, Users, FileText } from 'lucide-react';

// Standard (with action)
<EmptyState
  icon={MessageCircle}
  title="No messages yet"
  description="Be the first to say hello!"
  action={{
    label: "Start Conversation",
    onClick: () => messageInputRef.current?.focus()
  }}
/>

// Without action
<EmptyState
  icon={Search}
  title="No results found"
  description="Try different keywords or check your spelling"
/>

// Compact version
<EmptyStateCompact
  icon={Hash}
  title="No channels"
  description="Create your first channel to get started"
/>

// Inline version (minimal)
<EmptyStateInline
  icon={FileText}
  text="No files shared in this channel"
/>
```

**Common Use Cases:**
- No messages in chat
- No search results
- No channels created
- No team members
- No files shared
- Empty inbox
- No notifications

---

### MessageHoverActions

Unified hover toolbar for messages (used internally in `MessageItem`).

**Features:**
- Reply button
- React button (emoji picker)
- Pin/Unpin toggle
- More menu (Edit/Delete for owner)

**Already integrated in:** `components/chat/message-item.tsx`

---

## 🎯 Button Microinteractions

Add smooth hover/active states to any button:

```tsx
<Button className="button-animate">
  Click me
</Button>
```

**Effect:**
- Hover: Scale up (102%) + shadow elevation
- Active: Scale down (98%)
- Duration: 200ms
- Easing: cubic-bezier(0.4, 0.0, 0.2, 1)

---

## 📐 Animation Classes

Global animation utilities (in `globals.css`):

### Hover Actions
```tsx
<div className="group">
  <div className="hover-actions">
    {/* Slides in on group hover */}
  </div>
</div>
```

### Badge Pulse
```tsx
<Badge className="badge-new">New</Badge>
```

### Shimmer Loading
```tsx
<div className="skeleton-shimmer h-8 w-full rounded-md" />
```

### Message Enter Animation
```tsx
<div className="message-enter">
  {/* Fades in from bottom */}
</div>
```

### Message Hover Background
```tsx
<div className="message-hover-bg">
  {/* Subtle background on hover */}
</div>
```

---

## 🎨 CSS Variables

Animation timings (from Slack):

```css
--animation-fast: 150ms
--animation-base: 200ms
--animation-slow: 300ms
--animation-easing: cubic-bezier(0.4, 0.0, 0.2, 1)
```

Usage:
```css
.my-component {
  transition: all var(--animation-base) var(--animation-easing);
}
```

---

## 🚀 Examples

### User Avatar with Status
```tsx
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { StatusDot } from '@/components/enhanced';

<div className="relative">
  <Avatar>
    <AvatarImage src={user.avatar} />
    <AvatarFallback>{user.name[0]}</AvatarFallback>
  </Avatar>
  <StatusDot 
    type={user.isOnline ? 'success' : 'offline'} 
    position="avatar" 
    withPulse={user.isOnline}
  />
</div>
```

### Chat Room Empty State
```tsx
import { MessageCircle } from 'lucide-react';
import { EmptyState } from '@/components/enhanced';

{messages.length === 0 && (
  <EmptyState
    icon={MessageCircle}
    title="No messages yet"
    description="Start the conversation by sending the first message!"
    action={{
      label: "Say Hello 👋",
      onClick: () => sendMessage("Hello!")
    }}
  />
)}
```

### Search Results
```tsx
import { Search } from 'lucide-react';
import { EmptyState } from '@/components/enhanced';

{searchResults.length === 0 && searchQuery && (
  <EmptyState
    icon={Search}
    title="No results found"
    description={`No matches for "${searchQuery}". Try different keywords.`}
  />
)}
```

### Button with Animation
```tsx
<Button 
  className="button-animate"
  onClick={handleSubmit}
>
  Submit
</Button>
```

---

## 📚 Design Principles

All components follow:
- **Consistency**: Aligned with shadcn/ui patterns
- **Accessibility**: Keyboard navigation, tooltips, ARIA labels
- **Performance**: Lightweight animations, optimized renders
- **Responsiveness**: Mobile-first, works on all screen sizes
- **Theming**: Full dark mode support

---

## 🎯 Impact

**Before:**
- Basic, static UI
- Inconsistent empty states
- Cluttered message actions

**After:**
- ✨ Smooth, polished microinteractions
- 🎯 Professional status indicators (like Slack)
- 📭 Beautiful, welcoming empty states
- 🎭 Unified, elegant hover actions
- 🚀 10x more polished feel

---

## 🔍 Quick Switcher (CMD+K)

Global search modal for instant navigation to any room.

**Features:**
- Keyboard shortcut: `CMD+K` (Mac) or `CTRL+K` (Windows/Linux)
- Fuzzy search across all channels and DMs
- Smart sections: Unread → Recent → Channels → DMs
- Keyboard navigation (↑ ↓ Enter ESC)
- Instant navigation

**Usage:**
```tsx
// Automatically included in chat layout
// Just press CMD+K anywhere in the app!

// Or trigger programmatically:
import { useQuickSwitcher } from '@/hooks/use-quick-switcher';

function MyComponent() {
  const openSwitcher = useQuickSwitcher((state) => state.open);
  
  return (
    <Button onClick={openSwitcher}>
      Open Quick Switcher
    </Button>
  );
}
```

**Keyboard Shortcuts:**
- `CMD+K` / `CTRL+K` - Open
- `↑` / `↓` - Navigate
- `Enter` - Select
- `ESC` - Close

---

## 📊 Unread Hierarchy

Visual indicators for unread messages in sidebar.

**Features:**
- **White dot** (1.5px) for unread messages
- **Bold text** for channel names with unread
- **Semibold** last message preview
- **Badge** with count (with pulse animation)
- Respects mute status

**Visual Hierarchy:**
```
Priority 1: Unread
  • Bold name
  • White dot
  • Semibold preview
  • Count badge

Priority 2: Read
  Normal name
  No dot
  Muted preview
  No badge
```

---

## 💬 Enhanced Message Input with Formatting

Rich text formatting toolbar for message composition.

**Features:**
- **Collapsible toolbar** with 8 formatting options
- **Keyboard shortcuts**: Ctrl+B (Bold), Ctrl+I (Italic), Ctrl+K (Link)
- **Selection-aware**: Wraps selected text or inserts placeholder
- **Smart cursor positioning** after formatting

**Formatting Options:**
- **Bold** (`**text**`)
- **Italic** (`*text*`)
- **Strikethrough** (`~~text~~`)
- **Inline code** (`` `code` ``)
- **Code block** (` ```code``` `)
- **Link** (`[text](url)`)
- **Bullet list** (`- item`)
- **Numbered list** (`1. item`)
- **Quote** (`> text`)

**Usage:**
```tsx
import { FormattingToolbar, applyFormatting, type FormatType } from '@/components/chat/formatting-toolbar';

// In your message input
const [showFormatting, setShowFormatting] = useState(false);

const handleFormat = (type: FormatType) => {
  const textarea = textareaRef.current;
  if (!textarea) return;
  
  const { newValue, cursorPos } = applyFormatting(type, textarea, message);
  setMessage(newValue);
  
  // Refocus with cursor at correct position
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(cursorPos, cursorPos);
  }, 0);
};

<FormattingToolbar
  onFormat={handleFormat}
  collapsed={!showFormatting}
  onToggleCollapse={() => setShowFormatting(!showFormatting)}
/>
```

**Keyboard Shortcuts:**
```
Ctrl+B / Cmd+B → Bold
Ctrl+I / Cmd+I → Italic
Ctrl+K / Cmd+K → Insert link
```

---

*Part of UI/UX Polish Phase 1, 2 & 3 - December 16, 2025*

