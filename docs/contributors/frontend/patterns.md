# Patterns & Examples

Common patterns and code examples for building features in Synapse.

---

## Data Fetching Patterns

### Fetching with React Query

**Basic query:**

```tsx
import { useQuery } from '@tanstack/react-query';

function Messages({ roomId }: { roomId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['messages', roomId],
    queryFn: async () => {
      const res = await fetch(`/api/rooms/${roomId}/messages`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    },
  });

  if (isLoading) return <MessagesSkeleton />;
  if (error) return <ErrorMessage error={error} />;

  return <MessageList messages={data.messages} />;
}
```

**With pagination:**

```tsx
function Messages({ roomId }: { roomId: string }) {
  const { 
    data, 
    fetchNextPage, 
    hasNextPage,
    isFetchingNextPage 
  } = useInfiniteQuery({
    queryKey: ['messages', roomId],
    queryFn: async ({ pageParam }) => {
      const res = await fetch(
        `/api/rooms/${roomId}/messages?cursor=${pageParam ?? ''}`
      );
      return res.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
  });

  return (
    <div>
      {data?.pages.map((page) =>
        page.messages.map((msg) => (
          <MessageItem key={msg.id} message={msg} />
        ))
      )}
      
      {hasNextPage && (
        <Button 
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </Button>
      )}
    </div>
  );
}
```

---

### Mutations with React Query

**Basic mutation:**

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

function MessageInput({ roomId }: { roomId: string }) {
  const queryClient = useQueryClient();
  
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      return res.json();
    },
    onSuccess: () => {
      // Invalidate and refetch messages
      queryClient.invalidateQueries({ queryKey: ['messages', roomId] });
    },
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      sendMessage.mutate(formData.get('content') as string);
      e.currentTarget.reset();
    }}>
      <Input name="content" placeholder="Type a message..." />
      <Button type="submit" disabled={sendMessage.isPending}>
        {sendMessage.isPending ? 'Sending...' : 'Send'}
      </Button>
    </form>
  );
}
```

**Optimistic updates:**

```tsx
const sendMessage = useMutation({
  mutationFn: async (content: string) => {
    // API call
  },
  onMutate: async (newMessage) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['messages', roomId] });

    // Snapshot previous value
    const previousMessages = queryClient.getQueryData(['messages', roomId]);

    // Optimistically update
    queryClient.setQueryData(['messages', roomId], (old: any) => ({
      ...old,
      messages: [...old.messages, {
        id: 'temp-' + Date.now(),
        content: newMessage,
        createdAt: new Date().toISOString(),
        user: currentUser,
      }],
    }));

    return { previousMessages };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(
      ['messages', roomId], 
      context?.previousMessages
    );
  },
  onSettled: () => {
    // Always refetch after error or success
    queryClient.invalidateQueries({ queryKey: ['messages', roomId] });
  },
});
```

---

## Socket.io Patterns

### Basic Socket Connection

```tsx
import { useEffect } from 'react';
import { useSocket } from '@/hooks/use-socket';

function ChatRoom({ roomId }: { roomId: string }) {
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    // Join room
    socket.emit('room:join', { roomId });

    // Listen for new messages
    const handleNewMessage = (message: Message) => {
      console.log('New message:', message);
      // Update UI
    };
    
    socket.on('message:new', handleNewMessage);

    // Cleanup
    return () => {
      socket.off('message:new', handleNewMessage);
      socket.emit('room:leave', { roomId });
    };
  }, [socket, roomId]);

  return <div>Chat room content</div>;
}
```

### Socket with React Query

**Sync real-time updates with React Query cache:**

```tsx
function ChatRoom({ roomId }: { roomId: string }) {
  const socket = useSocket();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['messages', roomId],
    queryFn: () => fetchMessages(roomId),
  });

  useEffect(() => {
    if (!socket) return;

    socket.emit('room:join', { roomId });

    // Update cache when new message arrives
    socket.on('message:new', (message: Message) => {
      queryClient.setQueryData(['messages', roomId], (old: any) => ({
        ...old,
        messages: [...old.messages, message],
      }));
    });

    // Update cache when message is deleted
    socket.on('message:deleted', (messageId: string) => {
      queryClient.setQueryData(['messages', roomId], (old: any) => ({
        ...old,
        messages: old.messages.filter((m: Message) => m.id !== messageId),
      }));
    });

    return () => {
      socket.off('message:new');
      socket.off('message:deleted');
      socket.emit('room:leave', { roomId });
    };
  }, [socket, roomId, queryClient]);

  return <MessageList messages={data?.messages ?? []} />;
}
```

---

## State Management Patterns

### Global UI State (Zustand)

**Create a store:**

```tsx
// stores/ui-store.ts
import { create } from 'zustand';

interface UIStore {
  isSidebarOpen: boolean;
  activeModal: string | null;
  toggleSidebar: () => void;
  openModal: (modal: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isSidebarOpen: true,
  activeModal: null,
  toggleSidebar: () => set((state) => ({ 
    isSidebarOpen: !state.isSidebarOpen 
  })),
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),
}));
```

**Use in components:**

```tsx
function Sidebar() {
  const { isSidebarOpen, toggleSidebar } = useUIStore();

  if (!isSidebarOpen) return null;

  return (
    <div>
      <Button onClick={toggleSidebar}>Close</Button>
      Sidebar content
    </div>
  );
}

function Header() {
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);

  return (
    <header>
      <Button onClick={toggleSidebar}>Toggle Sidebar</Button>
    </header>
  );
}
```

### Persisted State

```tsx
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const usePreferencesStore = create(
  persist<PreferencesStore>(
    (set) => ({
      fontSize: 'medium',
      compactMode: false,
      setFontSize: (fontSize) => set({ fontSize }),
      toggleCompactMode: () => set((state) => ({ 
        compactMode: !state.compactMode 
      })),
    }),
    {
      name: 'user-preferences',
    }
  )
);
```

---

## Form Patterns

### Controlled Form

```tsx
function CreateRoomForm() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const createRoom = useMutation({
    mutationFn: async (data: RoomData) => {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRoom.mutate({ name, description, isPrivate });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Room name"
        required
      />
      <Input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
      />
      <div className="flex items-center gap-2">
        <Switch
          checked={isPrivate}
          onCheckedChange={setIsPrivate}
        />
        <label>Private room</label>
      </div>
      <Button type="submit" disabled={createRoom.isPending}>
        Create Room
      </Button>
    </form>
  );
}
```

### Uncontrolled Form with FormData

```tsx
function CreateRoomForm() {
  const createRoom = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        body: data,
      });
      return res.json();
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createRoom.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input name="name" placeholder="Room name" required />
      <Input name="description" placeholder="Description" />
      <Button type="submit">Create Room</Button>
    </form>
  );
}
```

---

## Modal Patterns

### Basic Modal

```tsx
function DeleteConfirmModal({ 
  message, 
  onConfirm,
  onCancel 
}: {
  message: Message;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <TrashIcon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Message?</DialogTitle>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => {
            setOpen(false);
            onCancel();
          }}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => {
            setOpen(false);
            onConfirm();
          }}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Loading States

### Skeleton Screens

```tsx
function MessagesSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Messages({ roomId }: { roomId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['messages', roomId],
    queryFn: () => fetchMessages(roomId),
  });

  if (isLoading) return <MessagesSkeleton />;

  return <MessageList messages={data.messages} />;
}
```

---

## Error Handling

### Error Boundary

```tsx
function MyFeature() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <FeatureContent />
    </ErrorBoundary>
  );
}

function ErrorFallback() {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <Button onClick={() => window.location.reload()}>
        Reload Page
      </Button>
    </div>
  );
}
```

### Query Error Handling

```tsx
function Messages({ roomId }: { roomId: string }) {
  const { data, error, isError, refetch } = useQuery({
    queryKey: ['messages', roomId],
    queryFn: () => fetchMessages(roomId),
    retry: 3,
  });

  if (isError) {
    return (
      <div className="p-4 text-center">
        <p className="text-destructive mb-4">
          {error.message || 'Failed to load messages'}
        </p>
        <Button onClick={() => refetch()}>
          Try Again
        </Button>
      </div>
    );
  }

  return <MessageList messages={data.messages} />;
}
```

---

## Performance Patterns

### Memoization

```tsx
import { memo, useMemo, useCallback } from 'react';

// Memoize expensive component
export const MessageItem = memo(function MessageItem({ message }: Props) {
  return <div>{message.content}</div>;
});

// Memoize expensive calculation
function MessageList({ messages }: { messages: Message[] }) {
  const sortedMessages = useMemo(
    () => messages.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    ),
    [messages]
  );

  return <div>{sortedMessages.map(/* ... */)}</div>;
}

// Memoize callbacks
function MessageInput({ onSend }: { onSend: (text: string) => void }) {
  const handleSend = useCallback((text: string) => {
    onSend(text);
  }, [onSend]);

  return <input onSubmit={handleSend} />;
}
```

### Lazy Loading

```tsx
import dynamic from 'next/dynamic';

// Lazy load heavy component
const VideoCallModal = dynamic(
  () => import('@/features/video-call/components/video-call-modal'),
  {
    loading: () => <Spinner />,
    ssr: false,
  }
);

function ChatRoom() {
  const [showVideoCall, setShowVideoCall] = useState(false);

  return (
    <div>
      <Button onClick={() => setShowVideoCall(true)}>
        Start Video Call
      </Button>
      
      {showVideoCall && <VideoCallModal />}
    </div>
  );
}
```

### Virtualization

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

function MessageList({ messages }: { messages: Message[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((item) => (
          <div
            key={item.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${item.size}px`,
              transform: `translateY(${item.start}px)`,
            }}
          >
            <MessageItem message={messages[item.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Animation Patterns

### Framer Motion

```tsx
import { motion, AnimatePresence } from 'framer-motion';

// Fade in animation
function FadeIn({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {children}
    </motion.div>
  );
}

// Slide up animation
function SlideUp({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
    >
      {children}
    </motion.div>
  );
}

// List animations
function MessageList({ messages }: { messages: Message[] }) {
  return (
    <AnimatePresence>
      {messages.map((message) => (
        <motion.div
          key={message.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -100 }}
          layout
        >
          <MessageItem message={message} />
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
```

---

## Custom Hooks Patterns

### Compound Hook

```tsx
function useMessages(roomId: string) {
  const queryClient = useQueryClient();
  const socket = useSocket();

  // Query for messages
  const { data, isLoading } = useQuery({
    queryKey: ['messages', roomId],
    queryFn: () => fetchMessages(roomId),
  });

  // Mutation for sending
  const sendMessage = useMutation({
    mutationFn: (content: string) => 
      fetch(`/api/rooms/${roomId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', roomId] });
    },
  });

  // Real-time updates
  useEffect(() => {
    if (!socket) return;

    socket.on('message:new', (message: Message) => {
      queryClient.setQueryData(['messages', roomId], (old: any) => ({
        ...old,
        messages: [...old.messages, message],
      }));
    });

    return () => socket.off('message:new');
  }, [socket, roomId, queryClient]);

  return {
    messages: data?.messages ?? [],
    isLoading,
    sendMessage: sendMessage.mutate,
    isSending: sendMessage.isPending,
  };
}

// Usage
function ChatRoom({ roomId }: { roomId: string }) {
  const { messages, isLoading, sendMessage } = useMessages(roomId);

  if (isLoading) return <Spinner />;

  return (
    <div>
      <MessageList messages={messages} />
      <MessageInput onSend={sendMessage} />
    </div>
  );
}
```

---

## Next Steps

- **[Frontend Architecture](./README.md)** - Main guide
- **[Design System](./design-system.md)** - Theming and styling
- **[Component Library](./components.md)** - Available components

---

## Questions?

- Review existing code for more patterns
- Check React Query docs for advanced patterns
- See Zustand docs for state management patterns

