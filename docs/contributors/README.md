# Contributor Documentation

Welcome to Synapse! This documentation helps you contribute code, fix bugs, and add features.

---

## New to Contributing?

**Start here:**

1. **[Development Setup](./getting-started/setup.md)** - Set up your dev environment (15 min)
2. **[Architecture Overview](../development/01-ARCHITECTURE-OVERVIEW.md)** - Understand the system (20 min)
3. **[Dependency Injection](../development/02-DEPENDENCY-INJECTION.md)** - Learn service patterns (20 min)
4. **[Codebase Guide](../development/CODEBASE_GUIDE.md)** - What already exists (15 min)
5. **[First Contribution](./getting-started/first-contribution.md)** - Make your first PR (30 min)

**Total time:** ~90 minutes to productive contributor

---

## Quick Links

| Task | Documentation |
|------|---------------|
| Understand architecture | [01-ARCHITECTURE-OVERVIEW.md](../development/01-ARCHITECTURE-OVERVIEW.md) |
| Use DI container | [02-DEPENDENCY-INJECTION.md](../development/02-DEPENDENCY-INJECTION.md) |
| Add Socket.io events | [03-SOCKET-IO-AND-WEBRTC.md](../development/03-SOCKET-IO-AND-WEBRTC.md) |
| Create background jobs | [04-QUEUE-SYSTEM.md](../development/04-QUEUE-SYSTEM.md) |
| Comprehensive reference | [COMPLETE-DEVELOPER-GUIDE.md](../development/COMPLETE-DEVELOPER-GUIDE.md) |

---

## Architecture Deep Dive

### Essential Reading

1. **[01 - Architecture Overview](../development/01-ARCHITECTURE-OVERVIEW.md)** (20 min)
   - System overview, tech stack, design patterns
   - Data flow examples
   - Quick start for developers

2. **[02 - Dependency Injection](../development/02-DEPENDENCY-INJECTION.md)** (20 min)
   - DI container, 15+ registered services
   - Creating new services
   - Testing with DI

3. **[Codebase Guide](../development/CODEBASE_GUIDE.md)** (15 min)
   - Existing services (don't recreate!)
   - API route patterns
   - Socket.io memory management

### Deep Dives

4. **[03 - Socket.io & WebRTC](../development/03-SOCKET-IO-AND-WEBRTC.md)** (30 min)
   - Real-time communication
   - **CRITICAL:** Memory leak prevention
   - WebRTC implementation

5. **[04 - Queue System](../development/04-QUEUE-SYSTEM.md)** (25 min)
   - Background jobs with BullMQ
   - Creating job processors
   - Monitoring queues

6. **[Complete Developer Guide](../development/COMPLETE-DEVELOPER-GUIDE.md)** (30 min)
   - Notifications, frontend, themes
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
- **GitHub Discussions** - Ask questions
- **Pull Requests** - Contribute code

---

## Next Steps

**For new contributors:**

1. Set up development environment
2. Read architecture documentation
3. Find a "good first issue"
4. Make your first contribution!

**For experienced contributors:**

- Check [open issues](https://github.com/saleem189/synapse/issues)
- Review [roadmap](https://github.com/saleem189/synapse/projects)
- Join discussions

---

## Questions?

Open a discussion or issue on GitHub, and the community will help!

