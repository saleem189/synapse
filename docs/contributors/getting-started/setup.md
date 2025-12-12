# Development Setup

Set up your local development environment for contributing to Synapse.

---

## Prerequisites

Before you begin, install:

- **Node.js 18+** - [Download](https://nodejs.org/)
- **PostgreSQL 14+** - [Download](https://www.postgresql.org/download/)
- **Redis 6+** - [Download](https://redis.io/download/)
- **Git** - [Download](https://git-scm.com/)
- **Code Editor** - VS Code recommended

---

## Step 1: Fork and Clone

**Fork the repository** on GitHub, then clone your fork:

```bash
git clone https://github.com/saleem189/synapse.git
cd synapse
```

**Add upstream remote:**

```bash
git remote add upstream https://github.com/saleem189/synapse.git
```

---

## Step 2: Install Dependencies

```bash
npm install
```

---

## Step 3: Set Up Database & Services

### Option 1: Quick Setup (Recommended)

**One command to rule them all:**

```bash
npm run setup
```

This automatically:
- Starts PostgreSQL and Redis via Docker Compose
- Waits for services to be ready
- Generates Prisma client
- Runs database migrations

### Option 2: Manual Setup

**Start Docker services:**

```bash
npm run docker:up
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- pgAdmin (port 8082, optional)

**Configure environment:**

```bash
cp env-example.txt .env
```

**Default Docker credentials (already in env-example.txt):**

```env
DATABASE_URL="postgresql://admin:password123@localhost:5432/chatapp?schema=public"
REDIS_URL="redis://:redis123@localhost:6379"
```

**Run migrations:**

```bash
npx prisma migrate dev
npx prisma generate
```

**Seed database (optional):**

```bash
npm run db:seed
```

---

## Step 4: Start Development Servers

### Option 1: All Services at Once (Recommended)

```bash
npm run dev:all
```

This runs all three services concurrently:
- Next.js app (port 3000)
- Socket.io server (port 3001)
- Background worker

### Option 2: Separate Terminals

If you prefer separate terminals for easier debugging:

**Terminal 1 - Next.js App:**
```bash
npm run dev
```

**Terminal 2 - Socket.io Server:**
```bash
npm run server
```

**Terminal 3 - Background Worker:**
```bash
npm run worker
```

---

## Step 5: Verify Setup

**Check Next.js:**
```bash
curl http://localhost:3000
```

**Check Socket.io:**
```bash
curl http://localhost:3001/health
```

**Open browser:**
```
http://localhost:3000
```

**Register a test user** and verify you can:
- ✅ Create an account
- ✅ Send a message
- ✅ See real-time updates

---

## Development Tools

### Prisma Studio

Visual database browser:

```bash
npx prisma studio
```

Opens: `http://localhost:5555`

### Redis CLI

Inspect Redis data:

```bash
redis-cli
> KEYS *
> GET user:123
```

### Sentry (Optional)

For error tracking, add to `.env`:

```env
NEXT_PUBLIC_SENTRY_DSN="your-sentry-dsn"
```

---

## VS Code Setup

**Recommended extensions:**

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "prisma.prisma",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

**Settings:**

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "non-relative"
}
```

---

## Environment Variables

**Required:**

```env
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
```

**Optional:**

```env
# Push notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."

# Error tracking
NEXT_PUBLIC_SENTRY_DSN="..."

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email"
SMTP_PASS="your-password"
```

---

## Common Commands

```bash
# Quick Setup
npm run setup            # Setup everything (Docker + DB + migrations)
npm run dev:all          # Start all services (Next.js + Socket.io + Worker)

# Development
npm run dev              # Next.js app only
npm run server           # Socket.io server only
npm run worker           # Background worker only

# Docker
npm run docker:up        # Start PostgreSQL + Redis + pgAdmin
npm run docker:down      # Stop Docker services

# Database
npm run db:migrate       # Create migration
npm run db:push          # Push schema changes
npm run db:studio        # Visual editor (Prisma Studio)
npm run db:generate      # Regenerate Prisma client
npm run db:seed          # Seed database
npm run db:status        # Check migration status

# Testing
npm run test             # Run tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report

# Code Quality
npm run lint             # ESLint
npm run type-check       # TypeScript

# Build & Analysis
npm run build            # Production build
npm run start            # Start production
npm run analyze          # Bundle size analysis
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

### Database Connection Failed

```bash
# Verify PostgreSQL is running
psql -U postgres -c "SELECT version();"

# Check DATABASE_URL in .env
```

### Redis Connection Failed

```bash
# Verify Redis is running
redis-cli ping

# Should return: PONG
```

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules
rm -rf node_modules
npm install

# Regenerate Prisma client
npx prisma generate
```

---

## Next Steps

- **[Architecture Overview](../development/01-ARCHITECTURE-OVERVIEW.md)** - Understand the system
- **[First Contribution](./getting-started/first-contribution.md)** - Make your first PR
- **[Coding Standards](../../CONTRIBUTING.md#coding-standards)** - Follow best practices

---

## Questions?

Open a discussion on GitHub or ask in our community channels!

