# Contributor Documentation

Welcome to Synapse! **We're excited to have you contribute!** 🎉

---

## 🎨 We Need Your Help!

**Synapse is actively seeking contributions, especially in:**

### UI/UX Improvements (HIGH PRIORITY)

The current interface is functional but could be **much better**! We're looking for contributors to help with:

- ✨ **Modern, polished designs** - Better component styling, layouts, and visual hierarchy
- 🎯 **User experience** - More intuitive flows, better onboarding, smoother interactions
- 📱 **Responsive design** - Enhanced mobile and tablet experiences
- ♿ **Accessibility** - ARIA labels, keyboard navigation, screen reader support
- 🎭 **Animations** - Smooth transitions and delightful micro-interactions
- 🌈 **Theming** - Custom themes, color schemes, and style options

**See: [Frontend Architecture Guide](./frontend/README.md)** for details

### New Features (ALWAYS WELCOME)

Have an idea? We'd love to hear it! Some examples:
- Message threading
- Rich text formatting
- Voice notes
- Screen sharing
- Custom themes
- Keyboard shortcuts
- Enhanced search

**Open a discussion** on GitHub to share your ideas!

### Bug Fixes & Code Improvements

Browse [open issues](https://github.com/saleem189/synapse/issues) for bugs to fix or improvements to make.

---

## New to Contributing?

**Start here:**

1. **[Development Setup](./getting-started/setup.md)** - Set up your dev environment (15 min)
2. **[Frontend Architecture](./frontend/README.md)** - ⭐ Understand the frontend (20 min)
3. **[Architecture Overview](../development/01-ARCHITECTURE-OVERVIEW.md)** - System design (20 min)
4. **[Codebase Guide](../development/CODEBASE_GUIDE.md)** - What already exists (15 min)
5. **[First Contribution](./getting-started/first-contribution.md)** - Make your first PR (30 min)

**Total time:** ~90 minutes to productive contributor

---

## Quick Links

| Task | Documentation |
|------|---------------|
| **Improve UI/UX** | **[Frontend Architecture](./frontend/README.md)** ⭐ |
| Add new features | [Frontend Architecture](./frontend/README.md) |
| Understand backend | [01-ARCHITECTURE-OVERVIEW.md](../development/01-ARCHITECTURE-OVERVIEW.md) |
| Use DI container | [02-DEPENDENCY-INJECTION.md](../development/02-DEPENDENCY-INJECTION.md) |
| Add Socket.io events | [03-SOCKET-IO-AND-WEBRTC.md](../development/03-SOCKET-IO-AND-WEBRTC.md) |
| Create background jobs | [04-QUEUE-SYSTEM.md](../development/04-QUEUE-SYSTEM.md) |
| Comprehensive reference | [COMPLETE-DEVELOPER-GUIDE.md](../development/COMPLETE-DEVELOPER-GUIDE.md) |

---

## Architecture Deep Dive

### Frontend (START HERE for UI/UX)

1. **[Frontend Architecture](./frontend/README.md)** ⭐ (20 min)
   - Next.js 16 + React 19 architecture
   - Component structure & feature patterns
   - Theme system (Light/Dark + Solid/Glassmorphic)
   - State management (React Query, Zustand)
   - How to add new features
   - **UI/UX contribution guidelines**

### Backend (Essential Reading)

2. **[01 - Architecture Overview](../development/01-ARCHITECTURE-OVERVIEW.md)** (20 min)
   - System overview, tech stack, design patterns
   - Data flow examples
   - Quick start for developers

3. **[02 - Dependency Injection](../development/02-DEPENDENCY-INJECTION.md)** (20 min)
   - DI container, 15+ registered services
   - Creating new services
   - Testing with DI

4. **[Codebase Guide](../development/CODEBASE_GUIDE.md)** (15 min)
   - Existing services (don't recreate!)
   - API route patterns
   - Socket.io memory management

### Deep Dives

5. **[03 - Socket.io & WebRTC](../development/03-SOCKET-IO-AND-WEBRTC.md)** (30 min)
   - Real-time communication
   - **CRITICAL:** Memory leak prevention
   - WebRTC implementation

6. **[04 - Queue System](../development/04-QUEUE-SYSTEM.md)** (25 min)
   - Background jobs with BullMQ
   - Creating job processors
   - Monitoring queues

7. **[Complete Developer Guide](../development/COMPLETE-DEVELOPER-GUIDE.md)** (30 min)
   - Notifications, frontend patterns, themes
   - Memory management, API patterns
   - Quick reference

---

## Development Workflow

### Before You Code

- [ ] Read [Architecture Overview](../development/01-ARCHITECTURE-OVERVIEW.md)
- [ ] Check [Codebase Guide](../development/CODEBASE_GUIDE.md) for existing functionality
- [ ] Review [Coding Standards](../../CONTRIBUTING.md#coding-standards)
- [ ] Create an issue or claim an existing one

### While Coding

- [ ] Follow [API Patterns](../development/COMPLETE-DEVELOPER-GUIDE.md#api-patterns)
- [ ] Use DI container for services
- [ ] Add Zod validation for all inputs
- [ ] Clean up Socket.io listeners ([Memory Guide](../development/03-SOCKET-IO-AND-WEBRTC.md#memory-management))
- [ ] Write tests for new features

### Before Submitting

- [ ] Run `npm run lint`
- [ ] Run `npm run type-check`
- [ ] Run `npm run test`
- [ ] Update documentation
- [ ] Create PR with clear description

---

## Project Structure

```
synapse/
├── app/                      # Next.js App Router
│   ├── (chat)/              # Chat routes
│   ├── (admin)/             # Admin routes
│   ├── api/                 # REST API routes
│   └── call/                # Video call pages
│
├── components/              # React components
│   ├── ui/                  # shadcn/ui primitives
│   ├── chat/                # Chat components
│   └── admin/               # Admin components
│
├── features/                # Feature modules
│   ├── video-call/          # Video call feature
│   ├── mentions/            # @mentions feature
│   └── pinned-messages/     # Pinned messages
│
├── lib/                     # Core libraries
│   ├── di/                  # ⭐ Dependency Injection
│   ├── services/            # ⭐ Business logic (15+ services)
│   ├── repositories/        # Data access
│   ├── middleware/          # Request middleware
│   ├── queue/               # Background jobs
│   ├── cache/               # Redis caching
│   └── utils/               # Utilities
│
├── backend/                 # Real-time servers
│   ├── server.js            # ⚠️ Socket.io (memory critical!)
│   └── worker.ts            # BullMQ worker
│
├── prisma/                  # Database
│   ├── schema.prisma        # Schema definition
│   └── migrations/          # Migration history
│
└── docs/                    # Documentation
    ├── product/             # Product docs (users)
    └── contributors/        # Contributor docs (you!)
```

---

## Common Tasks

### Add a New Service

```bash
# 1. Create service class
lib/services/my-service.ts

# 2. Register in DI
lib/di/providers.ts

# 3. Use in API route
app/api/my-endpoint/route.ts
```

See: [Creating Services Guide](../development/02-DEPENDENCY-INJECTION.md#creating-new-services)

### Add API Endpoint

```bash
# Create route file
app/api/my-endpoint/route.ts

# Follow standard pattern:
# 1. Rate limiting
# 2. Authentication
# 3. Validation (Zod)
# 4. Get service from DI
# 5. Business logic
# 6. Return response
```

See: [API Patterns](../development/COMPLETE-DEVELOPER-GUIDE.md#api-patterns)

### Add Socket.io Event

```bash
# Add event handler in:
backend/server.js

# ⚠️ REMEMBER: Clean up listeners on disconnect!
socket.removeAllListeners();
```

See: [Socket.io Guide](../development/03-SOCKET-IO-AND-WEBRTC.md)

### Add Background Job

```bash
# 1. Define job type
lib/queue/queues.ts

# 2. Create processor
lib/queue/job-processors.ts

# 3. Register worker
backend/worker.ts

# 4. Queue jobs via QueueService
```

See: [Queue System Guide](../development/04-QUEUE-SYSTEM.md)

---

## Code Standards

- **TypeScript:** Strict mode, no `any`
- **React:** Functional components, hooks
- **Testing:** Write tests for new features
- **Linting:** Pass ESLint checks
- **Formatting:** Use Prettier

See: [CONTRIBUTING.md](../../CONTRIBUTING.md)

---

## Testing

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

See: [Testing Guide](./guides/testing.md)

---

## Pull Request Process

1. **Fork the repository**
2. **Create feature branch** (`git checkout -b feature/my-feature`)
3. **Make changes** (follow code standards)
4. **Write tests** (maintain >80% coverage)
5. **Run checks** (lint, type-check, test)
6. **Commit** (conventional commits)
7. **Push** to your fork
8. **Create PR** with clear description

See: [CONTRIBUTING.md](../../CONTRIBUTING.md#pull-request-process)

---

## Community

- **GitHub Issues** - Report bugs or suggest features
- **GitHub Discussions** - Ask questions, share ideas
- **Pull Requests** - Contribute code, designs, documentation

---

## 💡 Contribution Ideas

Not sure where to start? Here are some ideas:

### UI/UX Improvements
- Redesign the chat interface
- Improve the onboarding flow
- Create better empty states
- Add loading skeletons
- Enhance mobile responsiveness
- Improve accessibility

### Features
- Add message threading
- Implement rich text editing
- Create custom emoji reactions
- Add voice messages
- Build screen sharing
- Create keyboard shortcuts

### Bug Fixes
- Browse [open issues](https://github.com/saleem189/synapse/issues)
- Look for "good first issue" label
- Fix reported bugs

### Documentation
- Improve existing docs
- Add code examples
- Create tutorials
- Add screenshots/videos

---

## Next Steps

**For new contributors:**

1. ⭐ **Read [Frontend Architecture](./frontend/README.md)** - Understand the UI (20 min)
2. Set up development environment - [Setup Guide](./getting-started/setup.md)
3. Find a "good first issue" or propose a UI improvement
4. Make your first contribution!

**For experienced contributors:**

- Check [open issues](https://github.com/saleem189/synapse/issues) for high-priority items
- Propose new features in [discussions](https://github.com/saleem189/synapse/discussions)
- Review [roadmap](https://github.com/saleem189/synapse/projects)

---

## Questions or Ideas?

**We'd love to hear from you!**

- 💬 Open a [discussion](https://github.com/saleem189/synapse/discussions) to share ideas
- 🐛 Open an [issue](https://github.com/saleem189/synapse/issues) to report bugs
- 🎨 Share design mockups or UI improvements
- 📖 Suggest documentation improvements

**Every contribution makes Synapse better!** 🚀

