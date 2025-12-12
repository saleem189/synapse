# Frontend Architecture

**Welcome to Synapse Frontend!** 🎨

We're excited to have you contribute! The frontend is where users interact with Synapse, and we're actively looking for contributors to help improve the **UI/UX, add new features, and enhance the overall user experience**.

---

## 🎯 Priority Areas for Contribution

### 🎨 UI/UX Improvements (HIGH PRIORITY)

**We need your help!** The current UI is functional but could be much better. Areas where we'd love your contributions:

**Design & Aesthetics:**
- Modern, polished component designs
- Better color schemes and typography
- Improved spacing and layout
- Enhanced visual hierarchy
- More intuitive user flows

**User Experience:**
- Better onboarding experience
- Improved navigation
- More intuitive interactions
- Better error states and empty states
- Enhanced loading states and skeleton screens
- Smoother animations and transitions

**Accessibility:**
- ARIA labels and roles
- Keyboard navigation
- Screen reader support
- Color contrast improvements
- Focus management

**Responsive Design:**
- Better mobile experience
- Tablet optimization
- Consistent breakpoints

### ✨ New Features (ALWAYS WELCOME)

We're open to feature suggestions! Some ideas:
- Enhanced emoji reactions
- Rich text formatting
- Message threading
- Voice notes
- Screen sharing in calls
- Custom themes
- Keyboard shortcuts
- Message search improvements
- File preview enhancements

**Have an idea?** Open a discussion on GitHub!

---

## Architecture Overview

Synapse uses **Next.js 16 with App Router** and follows a modern React architecture.

### Tech Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| **Next.js** | Framework | 16.x |
| **React** | UI Library | 19.x |
| **TypeScript** | Type Safety | 5.x |
| **Tailwind CSS** | Styling | 3.x |
| **shadcn/ui** | UI Components | Latest |
| **React Query** | Server State | 5.x |
| **Zustand** | Client State | 5.x |
| **Socket.io Client** | Real-time | 4.x |
| **Framer Motion** | Animations | Latest |

---

## Project Structure

```
synapse/
├── app/                          # Next.js App Router
│   ├── (chat)/                  # Chat routes (layout group)
│   │   ├── chat/
│   │   │   ├── page.tsx         # Chat home
│   │   │   └── [roomId]/        # Individual chat room
│   │   └── layout.tsx           # Chat layout
│   ├── (admin)/                 # Admin routes (layout group)
│   │   ├── admin/
│   │   │   ├── page.tsx         # Admin dashboard
│   │   │   ├── users/           # User management
│   │   │   └── rooms/           # Room management
│   │   └── layout.tsx           # Admin layout
│   ├── call/[callId]/           # Video call page
│   ├── auth/                    # Authentication pages
│   ├── api/                     # API routes
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Landing page
│   └── globals.css              # Global styles + CSS variables
│
├── components/                   # Reusable components
│   ├── ui/                      # shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── chat/                    # Chat-specific components
│   │   ├── message-item.tsx
│   │   ├── message-input.tsx
│   │   ├── chat-sidebar.tsx
│   │   └── ...
│   ├── admin/                   # Admin components
│   └── shared/                  # Shared utilities
│
├── features/                     # Feature modules (⭐ IMPORTANT!)
│   ├── video-call/
│   │   ├── components/          # Feature components
│   │   ├── hooks/               # Feature hooks
│   │   ├── types.ts             # Feature types
│   │   └── index.ts             # Public API
│   ├── mentions/
│   ├── pinned-messages/
│   └── quick-replies/
│
├── lib/                          # Core libraries
│   ├── design-system/           # Theme system
│   ├── hooks/                   # Global hooks
│   └── utils/                   # Utilities
│
└── hooks/                        # Global custom hooks
    ├── use-socket.ts
    ├── use-chat.ts
    └── ...
```

---

## Component Architecture

### Component Categories

**1. UI Primitives (`components/ui/`)**

Base components from shadcn/ui:
- Buttons, inputs, dialogs, cards, etc.
- Styled with Tailwind CSS
- Theme-aware using CSS variables
- **DO NOT modify directly** - they follow shadcn conventions

**2. Feature Components (`components/chat/`, `components/admin/`)**

Domain-specific components:
- Chat sidebar, message items, admin tables
- Compose multiple UI primitives
- Contains business logic
- **Can be modified** - these are our custom components

**3. Feature Modules (`features/`)**

Self-contained features:
- Video calls, mentions, pinned messages
- Includes components, hooks, types
- Exports public API via `index.ts`
- **Preferred for new features** - keeps code organized

---

## Theme System

Synapse uses a **two-dimensional theming system**:

### Dimension 1: Theme (Color)

- **Light** - Light color scheme
- **Dark** - Dark color scheme
- **System** - Follows OS preference

### Dimension 2: Style (Visual Effect)

- **Solid** - Traditional opaque design (default)
- **Glassmorphic** - Modern blur + transparency effects

Users can independently choose: "Dark theme + Glassmorphic style" or "Light theme + Solid style", etc.

### CSS Variables

All colors use CSS variables defined in `app/globals.css`:

```css
:root {
  /* Theme colors */
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --card: 0 0% 100%;
  --primary: 0 0% 9%;
  --border: 0 0% 89.8%;
  
  /* Style effects */
  --effect-background-opacity: 1;
  --effect-backdrop-blur: 0px;
  --effect-border-opacity: 1;
  --effect-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
}

.dark {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
  /* ... dark mode colors */
}
```

### Using Theme Variables

**DO:** Use CSS variables

```tsx
<div className="bg-background text-foreground border-border">
  Content
</div>
```

**DON'T:** Hard-code colors

```tsx
<div className="bg-white dark:bg-gray-900 text-black dark:text-white">
  Content
</div>
```

### Glassmorphic Effects

Components automatically support glassmorphic style:

```tsx
// This component will be solid OR glassmorphic based on user preference
<div className="card">
  Content adapts to user's style choice
</div>
```

**Theme hooks:**

```tsx
import { useTheme } from 'next-themes';

function MyComponent() {
  const { theme, setTheme } = useTheme(); // 'light' | 'dark' | 'system'
  
  return (
    <button onClick={() => setTheme('dark')}>
      Switch to dark
    </button>
  );
}
```

---

## State Management

### Server State (React Query)

Use React Query for **all API data**:

```tsx
import { useQuery } from '@tanstack/react-query';

function Messages({ roomId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['messages', roomId],
    queryFn: () => fetch(`/api/rooms/${roomId}/messages`).then(r => r.json())
  });
  
  if (isLoading) return <MessagesSkeleton />;
  
  return <MessageList messages={data.messages} />;
}
```

### Global Client State (Zustand)

Use Zustand for **UI state shared across components**:

```tsx
// stores/ui-store.ts
import { create } from 'zustand';

interface UIStore {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ 
    isSidebarOpen: !state.isSidebarOpen 
  })),
}));

// Usage
function Sidebar() {
  const { isSidebarOpen, toggleSidebar } = useUIStore();
  
  return isSidebarOpen ? <div>Sidebar content</div> : null;
}
```

### Local State (useState)

Use `useState` for **component-local state**:

```tsx
function MessageInput() {
  const [message, setMessage] = useState('');
  
  return (
    <input 
      value={message}
      onChange={(e) => setMessage(e.target.value)}
    />
  );
}
```

---

## Adding New Features

Follow the **feature-based pattern** for new features:

### 1. Create Feature Directory

```bash
mkdir -p features/my-feature/{components,hooks}
touch features/my-feature/{index.ts,types.ts}
```

### 2. Define Types

```typescript
// features/my-feature/types.ts
export interface MyFeatureData {
  id: string;
  name: string;
}

export interface MyFeatureProps {
  data: MyFeatureData;
  onAction: () => void;
}
```

### 3. Create Components

```tsx
// features/my-feature/components/my-feature-ui.tsx
import { MyFeatureProps } from '../types';

export function MyFeatureUI({ data, onAction }: MyFeatureProps) {
  return (
    <div className="card p-4">
      <h3 className="text-lg font-semibold">{data.name}</h3>
      <button 
        onClick={onAction}
        className="btn-primary mt-4"
      >
        Take Action
      </button>
    </div>
  );
}
```

### 4. Create Hooks

```tsx
// features/my-feature/hooks/use-my-feature.ts
import { useState, useCallback } from 'react';
import { MyFeatureData } from '../types';

export function useMyFeature() {
  const [data, setData] = useState<MyFeatureData | null>(null);
  
  const handleAction = useCallback(() => {
    // Feature logic
    console.log('Action performed');
  }, []);
  
  return { data, handleAction };
}
```

### 5. Export Public API

```typescript
// features/my-feature/index.ts
export { MyFeatureUI } from './components/my-feature-ui';
export { useMyFeature } from './hooks/use-my-feature';
export type { MyFeatureData, MyFeatureProps } from './types';
```

### 6. Use in Pages

```tsx
// app/my-page/page.tsx
import { MyFeatureUI, useMyFeature } from '@/features/my-feature';

export default function MyPage() {
  const { data, handleAction } = useMyFeature();
  
  return (
    <div>
      <h1>My Page</h1>
      {data && <MyFeatureUI data={data} onAction={handleAction} />}
    </div>
  );
}
```

---

## Component Best Practices

### 1. Use Composition

**Good:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

**Bad:**
```tsx
<Card title="Title" content="Content" />
```

### 2. Keep Components Small

Each component should do one thing well:

```tsx
// Good - focused component
function MessageItem({ message }) {
  return (
    <div className="message">
      <MessageAvatar user={message.user} />
      <MessageContent content={message.content} />
      <MessageTimestamp timestamp={message.createdAt} />
    </div>
  );
}

// Bad - too much responsibility
function Messages({ roomId }) {
  // Fetching, rendering, websockets, all in one component
}
```

### 3. Extract Reusable Logic to Hooks

```tsx
// hooks/use-messages.ts
export function useMessages(roomId: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['messages', roomId],
    queryFn: () => fetchMessages(roomId)
  });
  
  return { messages: data?.messages ?? [], isLoading };
}

// Usage
function MessageList({ roomId }) {
  const { messages, isLoading } = useMessages(roomId);
  // ...
}
```

### 4. Use TypeScript Properly

```tsx
// Define prop types
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  children: React.ReactNode;
}

// Use prop types
export function Button({ 
  variant = 'primary', 
  size = 'md',
  onClick,
  children 
}: ButtonProps) {
  return (
    <button 
      className={`btn btn-${variant} btn-${size}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

---

## Styling Guidelines

### 1. Use Tailwind CSS

**Prefer utility classes:**

```tsx
<div className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border">
  Content
</div>
```

### 2. Use CSS Variables for Colors

```tsx
// Good
<div className="bg-background text-foreground">

// Bad
<div className="bg-white dark:bg-black text-black dark:text-white">
```

### 3. Responsive Design

Mobile-first approach:

```tsx
<div className="
  grid 
  grid-cols-1 
  sm:grid-cols-2 
  lg:grid-cols-3 
  gap-4
">
  {/* Content */}
</div>
```

### 4. Animations

Use Framer Motion for smooth animations:

```tsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
>
  Content
</motion.div>
```

---

## Real-time Features

### Using Socket.io

```tsx
import { useSocket } from '@/hooks/use-socket';

function ChatRoom({ roomId }) {
  const socket = useSocket();
  
  useEffect(() => {
    if (!socket) return;
    
    // Join room
    socket.emit('room:join', { roomId });
    
    // Listen for new messages
    socket.on('message:new', (message) => {
      // Update UI
      console.log('New message:', message);
    });
    
    // Cleanup
    return () => {
      socket.off('message:new');
      socket.emit('room:leave', { roomId });
    };
  }, [socket, roomId]);
  
  return <div>Chat content</div>;
}
```

---

## Performance Best Practices

### 1. Memoization

```tsx
import { memo, useMemo, useCallback } from 'react';

// Memoize expensive components
export const MessageItem = memo(function MessageItem({ message }) {
  return <div>{message.content}</div>;
});

// Memoize expensive calculations
function Messages({ messages }) {
  const sortedMessages = useMemo(
    () => messages.sort((a, b) => a.timestamp - b.timestamp),
    [messages]
  );
  
  return <div>{sortedMessages.map(/* ... */)}</div>;
}

// Memoize callbacks
function MessageInput({ onSend }) {
  const handleSubmit = useCallback((text) => {
    onSend(text);
  }, [onSend]);
  
  return <input onSubmit={handleSubmit} />;
}
```

### 2. Lazy Loading

```tsx
import dynamic from 'next/dynamic';

// Lazy load heavy components
const VideoCallModal = dynamic(
  () => import('@/features/video-call/components/video-call-modal'),
  { loading: () => <Spinner /> }
);
```

### 3. Virtualization

For long lists (messages, users):

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function MessageList({ messages }) {
  const parentRef = useRef(null);
  
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
  });
  
  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) => (
          <div key={item.key} style={{ height: item.size }}>
            <MessageItem message={messages[item.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Testing Components

```tsx
import { render, screen } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    
    screen.getByText('Click').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

---

## Next Steps

- **[Design System Guide](./design-system.md)** - Complete theme system documentation
- **[Component Library](./components.md)** - Available UI components
- **[Patterns & Examples](./patterns.md)** - Common patterns and code examples

---

## Questions?

- Open a discussion on GitHub
- Check existing components for examples
- Review shadcn/ui documentation for base components

---

## We Need Your Help! 🙏

**UI/UX contributions are our top priority!** If you have design skills, UX expertise, or just ideas for making Synapse better, **we'd love to hear from you!**

Open an issue or discussion to:
- Propose UI/UX improvements
- Share design mockups
- Suggest new features
- Report usability issues

**Every contribution matters!** 🚀

