# Prisma Commands Explained - Complete Guide

**Date:** 2024  
**Purpose:** Understanding when and how to use each Prisma command

---

## 🎯 Quick Reference

| Command | When to Use | What It Does |
|---------|-------------|--------------|
| `prisma generate` | After schema changes | Generates TypeScript types |
| `prisma db push` | Development only | Syncs schema to DB (no migrations) |
| `prisma migrate dev` | Development | Creates & applies migration |
| `prisma migrate deploy` | Production | Applies existing migrations |
| `prisma migrate reset` | Development | Drops DB & reruns all migrations |
| `prisma studio` | Anytime | Opens database GUI |

---

## 📚 Detailed Explanation

### 1. `prisma generate` - Generate TypeScript Types

**Command:**
```bash
npx prisma generate
# or
npm run db:generate
```

**What It Does:**
- Reads `prisma/schema.prisma`
- Generates TypeScript types in `node_modules/@prisma/client`
- Creates type-safe Prisma Client

**When to Use:**
- ✅ **After changing `schema.prisma`**
- ✅ **After pulling new migrations**
- ✅ **After installing Prisma**
- ✅ **Before running your app** (if schema changed)

**What It Does NOT Do:**
- ❌ Does NOT change the database
- ❌ Does NOT create migrations
- ❌ Does NOT sync schema

**Example:**
```bash
# 1. You edit schema.prisma
# 2. Run generate to update TypeScript types
npx prisma generate

# 3. Now your TypeScript code has updated types
import { UserRole } from '@prisma/client';
// UserRole is now 'USER' | 'ADMIN'
```

**Frequency:** Run whenever schema changes

---

### 2. `prisma db push` - Quick Schema Sync (Development Only)

**Command:**
```bash
npx prisma db push
# or
npm run db:push
```

**What It Does:**
- **Directly syncs** `schema.prisma` to database
- **No migration files** created
- **Drops and recreates** tables if needed
- **Fast** - skips migration history

**When to Use:**
- ✅ **Development/Prototyping** - Quick iterations
- ✅ **Testing schema changes** - See if it works
- ✅ **Local development** - Fast feedback
- ❌ **NEVER in production**
- ❌ **NEVER when working with a team** (no migration history)

**What It Does NOT Do:**
- ❌ Does NOT create migration files
- ❌ Does NOT track changes in git
- ❌ Does NOT work well with teams

**Example:**
```bash
# Quick test - change schema and push
# Edit schema.prisma: add a new field
# Run:
npx prisma db push

# Database updated immediately!
# But no migration file created
```

**⚠️ Warning:**
- **Loses data** if you change column types
- **No rollback** - can't undo
- **Not for production** - use migrations instead

**Frequency:** Only in development, for quick testing

---

### 3. `prisma migrate dev` - Create & Apply Migration

**Command:**
```bash
npx prisma migrate dev
# or
npm run db:migrate

# With custom name:
npx prisma migrate dev --name add_user_avatar
```

**What It Does:**
1. **Compares** `schema.prisma` with current database
2. **Creates migration file** in `prisma/migrations/`
3. **Applies migration** to database
4. **Generates Prisma Client** automatically

**When to Use:**
- ✅ **Development** - Creating new migrations
- ✅ **Team collaboration** - Migration files in git
- ✅ **Production preparation** - Tracked changes
- ✅ **Schema changes** - Add fields, tables, indexes

**What It Creates:**
```
prisma/migrations/
  └─ 20241202123456_add_user_avatar/
      └─ migration.sql  ← SQL file with changes
```

**Example:**
```bash
# 1. Edit schema.prisma: add avatar field to User
# 2. Run:
npx prisma migrate dev --name add_user_avatar

# 3. Prisma:
#    - Creates migration file
#    - Applies it to database
#    - Generates Prisma Client
#    - Updates _prisma_migrations table
```

**Frequency:** Every time you change schema (in development)

---

### 4. `prisma migrate deploy` - Apply Migrations (Production)

**Command:**
```bash
npx prisma migrate deploy
```

**What It Does:**
- **Applies pending migrations** to database
- **Does NOT create new migrations**
- **Safe for production** - only applies existing migrations
- **Idempotent** - safe to run multiple times

**When to Use:**
- ✅ **Production deployments**
- ✅ **CI/CD pipelines**
- ✅ **Applying migrations** created in development
- ❌ **NOT for creating migrations**

**What It Does NOT Do:**
- ❌ Does NOT create migration files
- ❌ Does NOT generate Prisma Client
- ❌ Does NOT modify schema.prisma

**Example:**
```bash
# In production:
# 1. Code is deployed with migration files
# 2. Run:
npx prisma migrate deploy

# 3. All pending migrations are applied
# 4. Database is up to date
```

**Frequency:** Every deployment to production/staging

---

### 5. `prisma migrate reset` - Reset Database

**Command:**
```bash
npx prisma migrate reset
# or
npm run db:migrate:fresh
```

**What It Does:**
1. **Drops all tables** in database
2. **Deletes all data** ⚠️
3. **Reruns all migrations** from scratch
4. **Regenerates Prisma Client**

**When to Use:**
- ✅ **Development** - Start fresh
- ✅ **Testing migrations** - Verify they work
- ✅ **After major schema changes** - Clean slate
- ❌ **NEVER in production** - Deletes all data!

**What It Does NOT Do:**
- ❌ Does NOT create new migrations
- ❌ Does NOT preserve data

**Example:**
```bash
# Start fresh in development
npx prisma migrate reset

# Database is now empty
# All migrations rerun
# Ready for seeding
```

**Frequency:** Only in development, when you want a clean database

---

### 6. `prisma studio` - Database GUI

**Command:**
```bash
npx prisma studio
# or
npm run db:studio
```

**What It Does:**
- **Opens web interface** (usually http://localhost:5555)
- **Browse database** visually
- **Edit data** directly
- **View relationships**
- **No code needed**

**When to Use:**
- ✅ **Anytime** - View database contents
- ✅ **Debugging** - Check what's in DB
- ✅ **Testing** - Manually add/edit data
- ✅ **Development** - Quick data inspection

**What It Does NOT Do:**
- ❌ Does NOT change schema
- ❌ Does NOT create migrations
- ❌ Does NOT generate types

**Example:**
```bash
# Open database GUI
npx prisma studio

# Browser opens at http://localhost:5555
# Click on "User" table
# See all users, edit them, add new ones
```

**Frequency:** Anytime you want to view/edit database

---

## 🔄 Common Workflows

### Workflow 1: Development (Normal)

```bash
# 1. Edit schema.prisma
# 2. Create migration
npx prisma migrate dev --name my_change

# That's it! Prisma:
# - Creates migration file
# - Applies to database
# - Generates types
```

---

### Workflow 2: Quick Testing (Prototyping)

```bash
# 1. Edit schema.prisma
# 2. Push directly (no migration)
npx prisma db push

# Fast, but no migration file
# Good for testing ideas
```

---

### Workflow 3: Fresh Start

```bash
# 1. Reset database
npx prisma migrate reset

# 2. Seed data
npm run db:seed

# Database is fresh with test data
```

---

### Workflow 4: Production Deployment

```bash
# 1. Deploy code (with migration files)
# 2. Apply migrations
npx prisma migrate deploy

# Database is updated
```

---

## 📊 Comparison Table

| Feature | `db push` | `migrate dev` | `migrate deploy` | `migrate reset` |
|---------|-----------|---------------|------------------|-----------------|
| **Creates migration files** | ❌ | ✅ | ❌ | ❌ |
| **Applies to database** | ✅ | ✅ | ✅ | ✅ |
| **Generates types** | ✅ | ✅ | ❌ | ✅ |
| **Safe for production** | ❌ | ❌ | ✅ | ❌ |
| **Team-friendly** | ❌ | ✅ | ✅ | ❌ |
| **Tracks history** | ❌ | ✅ | ✅ | ❌ |
| **Speed** | ⚡ Fast | 🐢 Slower | 🐢 Slower | 🐢 Slowest |

---

## 🎯 When to Use Each Command

### Daily Development:

```bash
# 1. Change schema.prisma
# 2. Create migration
npx prisma migrate dev --name add_feature

# 3. View database
npx prisma studio
```

### Quick Testing:

```bash
# 1. Change schema.prisma
# 2. Push directly
npx prisma db push

# 3. Test quickly
# 4. If it works, create proper migration later
```

### Production:

```bash
# 1. Deploy code
# 2. Apply migrations
npx prisma migrate deploy
```

### Fresh Start:

```bash
# 1. Reset everything
npx prisma migrate reset

# 2. Seed data
npm run db:seed
```

---

## ⚠️ Important Differences

### `db push` vs `migrate dev`

**`db push`:**
- ⚡ Fast
- ❌ No migration files
- ❌ No history
- ❌ Development only

**`migrate dev`:**
- 🐢 Slower (creates files)
- ✅ Migration files
- ✅ History tracked
- ✅ Team-friendly

**Rule of Thumb:**
- Use `migrate dev` for real changes
- Use `db push` for quick prototyping

---

### `migrate dev` vs `migrate deploy`

**`migrate dev`:**
- Creates NEW migrations
- Development only
- Interactive (asks questions)

**`migrate deploy`:**
- Applies EXISTING migrations
- Production safe
- Non-interactive

**Rule of Thumb:**
- Use `migrate dev` in development
- Use `migrate deploy` in production

---

## 🔍 Your Package.json Commands

Looking at your `package.json`:

```json
{
  "db:push": "prisma db push",           // Quick sync (dev only)
  "db:generate": "prisma generate",      // Generate types
  "db:studio": "prisma studio",          // Open GUI
  "db:migrate": "prisma migrate dev",    // Create migration
  "db:migrate:fresh": "prisma migrate reset",  // Reset DB
  "db:migrate:fresh-seed": "prisma migrate reset --force && npx tsx prisma/seed.ts"  // Reset + seed
}
```

**Usage:**
- `npm run db:migrate` - Create new migration
- `npm run db:push` - Quick sync (dev only)
- `npm run db:generate` - Generate types
- `npm run db:studio` - Open database GUI
- `npm run db:migrate:fresh` - Reset database
- `npm run db:migrate:fresh-seed` - Reset + seed

---

## ✅ Best Practices

### Development:

1. **Edit schema.prisma**
2. **Run:** `npm run db:migrate --name descriptive_name`
3. **Commit migration file** to git
4. **Team pulls and runs:** `npm run db:migrate` (applies new migration)

### Production:

1. **Deploy code** (with migration files)
2. **Run:** `npx prisma migrate deploy`
3. **Database updated**

### Quick Testing:

1. **Edit schema.prisma**
2. **Run:** `npm run db:push`
3. **Test quickly**
4. **If it works, create proper migration**

---

## 🎓 Summary

| Command | Purpose | Use Case |
|---------|---------|----------|
| `generate` | Create TypeScript types | After schema changes |
| `db push` | Quick sync (no migrations) | Prototyping only |
| `migrate dev` | Create & apply migration | Normal development |
| `migrate deploy` | Apply existing migrations | Production |
| `migrate reset` | Drop DB & rerun migrations | Fresh start |
| `studio` | Open database GUI | View/edit data |

**Most Common:**
- Development: `prisma migrate dev`
- Production: `prisma migrate deploy`
- View data: `prisma studio`

---

*Understanding Prisma commands makes database management much easier!* 🚀

