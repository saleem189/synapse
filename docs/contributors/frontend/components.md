# Component Library

Complete reference of available UI components in Synapse.

---

## UI Primitives (`components/ui/`)

These are base components from **shadcn/ui**. They are styled with Tailwind CSS and use CSS variables for theming.

### Button

Versatile button component with multiple variants.

**Usage:**

```tsx
import { Button } from '@/components/ui/button';

<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon">🔍</Button>
```

**Props:**
- `variant` - Style variant
- `size` - Button size
- `asChild` - Render as child component
- All native button props

---

### Card

Container component for grouped content.

**Usage:**

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    Main content
  </CardContent>
  <CardFooter>
    Footer content
  </CardFooter>
</Card>
```

---

### Dialog

Modal dialog for important interactions.

**Usage:**

```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>
        Dialog description
      </DialogDescription>
    </DialogHeader>
    <div>Dialog content</div>
    <DialogFooter>
      <Button>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### Input

Text input field.

**Usage:**

```tsx
import { Input } from '@/components/ui/input';

<Input 
  type="text" 
  placeholder="Enter text..." 
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>

<Input type="email" placeholder="Email" />
<Input type="password" placeholder="Password" />
<Input type="number" placeholder="Number" />
```

---

### Dropdown Menu

Context menu for actions.

**Usage:**

```tsx
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost">Options</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Edit</DropdownMenuItem>
    <DropdownMenuItem>Share</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-destructive">
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

### Avatar

User avatar with fallback.

**Usage:**

```tsx
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

<Avatar>
  <AvatarImage src={user.image} alt={user.name} />
  <AvatarFallback>{user.name[0]}</AvatarFallback>
</Avatar>
```

---

### Badge

Small status indicator.

**Usage:**

```tsx
import { Badge } from '@/components/ui/badge';

<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Destructive</Badge>
<Badge variant="outline">Outline</Badge>
```

---

### Tooltip

Hover tooltip for additional information.

**Usage:**

```tsx
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>Hover me</TooltipTrigger>
    <TooltipContent>
      Tooltip content
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

### Toast

Notification toast messages.

**Usage:**

```tsx
import { useToast } from '@/components/ui/use-toast';

function MyComponent() {
  const { toast } = useToast();
  
  return (
    <Button onClick={() => {
      toast({
        title: "Success",
        description: "Operation completed successfully",
      });
    }}>
      Show Toast
    </Button>
  );
}
```

**Variants:**

```tsx
// Success toast
toast({
  title: "Success",
  description: "Your changes have been saved",
});

// Error toast
toast({
  variant: "destructive",
  title: "Error",
  description: "Something went wrong",
});
```

---

### Select

Dropdown select component.

**Usage:**

```tsx
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
    <SelectItem value="option3">Option 3</SelectItem>
  </SelectContent>
</Select>
```

---

### Tabs

Tabbed interface.

**Usage:**

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
    <TabsTrigger value="tab3">Tab 3</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Tab 1 content</TabsContent>
  <TabsContent value="tab2">Tab 2 content</TabsContent>
  <TabsContent value="tab3">Tab 3 content</TabsContent>
</Tabs>
```

---

### Switch

Toggle switch.

**Usage:**

```tsx
import { Switch } from '@/components/ui/switch';

<Switch 
  checked={enabled}
  onCheckedChange={setEnabled}
/>
```

---

### Slider

Range slider input.

**Usage:**

```tsx
import { Slider } from '@/components/ui/slider';

<Slider 
  value={[volume]}
  onValueChange={([val]) => setVolume(val)}
  max={100}
  step={1}
/>
```

---

### Progress

Progress bar indicator.

**Usage:**

```tsx
import { Progress } from '@/components/ui/progress';

<Progress value={progress} />
```

---

### Checkbox

Checkbox input.

**Usage:**

```tsx
import { Checkbox } from '@/components/ui/checkbox';

<Checkbox 
  checked={checked}
  onCheckedChange={setChecked}
/>
```

---

### Scroll Area

Custom scrollable area.

**Usage:**

```tsx
import { ScrollArea } from '@/components/ui/scroll-area';

<ScrollArea className="h-72">
  <div className="p-4">
    Long content...
  </div>
</ScrollArea>
```

---

### Separator

Visual divider.

**Usage:**

```tsx
import { Separator } from '@/components/ui/separator';

<div>
  <p>Content above</p>
  <Separator />
  <p>Content below</p>
</div>

<div className="flex items-center gap-4">
  <span>Left</span>
  <Separator orientation="vertical" className="h-6" />
  <span>Right</span>
</div>
```

---

## Chat Components (`components/chat/`)

Domain-specific components for chat functionality.

### MessageItem

Individual message in chat.

**Usage:**

```tsx
import { MessageItem } from '@/components/chat/message-item';

<MessageItem 
  message={message}
  currentUserId={currentUser.id}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

---

### MessageInput

Message composition input.

**Usage:**

```tsx
import { MessageInput } from '@/components/chat/message-input';

<MessageInput 
  roomId={roomId}
  onSend={handleSend}
/>
```

---

### ChatSidebar

Sidebar with room list.

**Usage:**

```tsx
import { ChatSidebar } from '@/components/chat/chat-sidebar';

<ChatSidebar 
  rooms={rooms}
  currentRoomId={currentRoomId}
/>
```

---

### TypingIndicator

Shows who is typing.

**Usage:**

```tsx
import { TypingIndicator } from '@/components/chat/typing-indicator';

<TypingIndicator 
  typingUsers={typingUsers}
/>
```

---

### RoomMembersPanel

Panel showing room participants.

**Usage:**

```tsx
import { RoomMembersPanel } from '@/components/chat/room-members-panel';

<RoomMembersPanel 
  roomId={roomId}
  members={members}
/>
```

---

### EmojiPicker

Emoji selection component.

**Usage:**

```tsx
import { EmojiPicker } from '@/components/chat/emoji-picker';

<EmojiPicker 
  onEmojiSelect={(emoji) => {
    // Handle emoji selection
  }}
/>
```

---

### FileAttachment

Display file attachments.

**Usage:**

```tsx
import { FileAttachment } from '@/components/chat/file-attachment';

<FileAttachment 
  attachment={attachment}
  onDownload={handleDownload}
/>
```

---

### MessageReactions

Display and manage message reactions.

**Usage:**

```tsx
import { MessageReactions } from '@/components/chat/message-reactions';

<MessageReactions 
  messageId={messageId}
  reactions={reactions}
  onAddReaction={handleAddReaction}
/>
```

---

### VirtualizedMessageList

Performant message list with virtualization.

**Usage:**

```tsx
import { VirtualizedMessageList } from '@/components/chat/virtualized-message-list';

<VirtualizedMessageList 
  messages={messages}
  currentUserId={currentUserId}
  onLoadMore={handleLoadMore}
/>
```

---

## Admin Components (`components/admin/`)

Admin dashboard components.

### AdminSidebar

Admin navigation sidebar.

**Usage:**

```tsx
import { AdminSidebar } from '@/components/admin/admin-sidebar';

<AdminSidebar />
```

---

### UsersTable

User management table.

**Usage:**

```tsx
import { UsersTable } from '@/components/admin/users-table';

<UsersTable 
  users={users}
  onDelete={handleDelete}
/>
```

---

### RoomsTable

Room management table.

**Usage:**

```tsx
import { RoomsTable } from '@/components/admin/rooms-table';

<RoomsTable 
  rooms={rooms}
  onDelete={handleDelete}
/>
```

---

### AdminStats

Dashboard statistics.

**Usage:**

```tsx
import { AdminStats } from '@/components/admin/admin-stats';

<AdminStats 
  stats={{
    totalUsers: 150,
    totalRooms: 45,
    activeUsers: 23,
    totalMessages: 5420
  }}
/>
```

---

## Feature Components

### Video Call (`features/video-call/`)

**ParticipantGrid:**

```tsx
import { ParticipantGrid } from '@/features/video-call/components/participant-grid';

<ParticipantGrid 
  participants={participants}
  localStream={localStream}
/>
```

**CallControls:**

```tsx
import { CallControls } from '@/features/video-call/components/call-controls';

<CallControls 
  isMuted={isMuted}
  isVideoOff={isVideoOff}
  onToggleMute={handleToggleMute}
  onToggleVideo={handleToggleVideo}
  onEndCall={handleEndCall}
/>
```

### Mentions (`features/mentions/`)

**MentionSuggestions:**

```tsx
import { MentionSuggestions } from '@/features/mentions';

<MentionSuggestions 
  query={mentionQuery}
  onSelect={handleSelectUser}
/>
```

### Pinned Messages (`features/pinned-messages/`)

**PinnedMessagesPanel:**

```tsx
import { PinnedMessagesPanel } from '@/features/pinned-messages';

<PinnedMessagesPanel 
  roomId={roomId}
  pinnedMessages={pinnedMessages}
/>
```

---

## Layout Components

### Providers

Wrap your app with necessary providers.

**Usage:**

```tsx
import { Providers } from '@/components/providers';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

**Includes:**
- Theme provider
- React Query provider
- Toast provider
- Error boundary

---

### ErrorBoundary

Catch and display React errors.

**Usage:**

```tsx
import { ErrorBoundary } from '@/components/error-boundary';

<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>
```

---

## Shared Components

### TimeDisplay

Consistent time formatting.

**Usage:**

```tsx
import { TimeDisplay } from '@/components/shared/time-display';

<TimeDisplay 
  timestamp={message.createdAt}
  format="relative"  // "2 minutes ago"
/>

<TimeDisplay 
  timestamp={message.createdAt}
  format="absolute"  // "Dec 12, 2025 7:30 PM"
/>
```

---

## Component Guidelines

### When to Use Each Type

**UI Primitives** (`components/ui/`)
- Base building blocks
- Reusable across features
- From shadcn/ui library
- Don't modify directly

**Feature Components** (`components/chat/`, `components/admin/`)
- Domain-specific logic
- Compose UI primitives
- Can be modified
- Specific to chat or admin

**Feature Modules** (`features/`)
- Self-contained features
- Includes components + hooks + types
- Preferred for new features
- Clean separation

---

## Creating New Components

### 1. Choose the Right Location

```
components/ui/           ← shadcn/ui primitives (don't add here)
components/chat/         ← Chat-specific components
components/admin/        ← Admin-specific components
components/shared/       ← Truly shared components
features/my-feature/     ← New feature modules (preferred!)
```

### 2. Follow Naming Conventions

```
PascalCase for components:    MessageItem.tsx
kebab-case for files:          message-item.tsx
camelCase for hooks:           useMessages.ts
```

### 3. Export Pattern

```tsx
// my-component.tsx
export function MyComponent() {
  return <div>...</div>;
}

// index.ts (optional, for feature modules)
export { MyComponent } from './my-component';
export type { MyComponentProps } from './my-component';
```

---

## Next Steps

- **[Design System](./design-system.md)** - Theming and styling
- **[Patterns & Examples](./patterns.md)** - Common patterns
- **[Frontend Architecture](./README.md)** - Main guide

---

## Questions?

- Check `components/` directory for implementation details
- Review shadcn/ui docs for base components
- Look at existing features for examples

