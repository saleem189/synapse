# Fresh Database Setup Guide

**Date:** 2024  
**Purpose:** Complete guide to recreate database from scratch with all improvements

---

## 🎯 Quick Start

### Option 1: One Command (Recommended)

```bash
npm run db:migrate:fresh-seed
```

This command will:
1. ✅ Drop all existing tables
2. ✅ Recreate database schema
3. ✅ Run all migrations
4. ✅ Seed the database with test data

---

## 📋 Step-by-Step Guide

### Step 1: Reset Database and Run Migrations

```bash
# This will drop all tables and recreate them
npm run db:migrate:fresh
```

**What this does:**
- Drops all existing tables
- Creates fresh database schema
- Applies all Prisma migrations
- Generates Prisma Client

**Note:** This will **DELETE ALL DATA**. Make sure you have backups if needed.

---

### Step 2: Apply Full-Text Search Index (Manual)

After migrations, apply the full-text search index:

```bash
# Option 1: Via psql command line
psql $DATABASE_URL -f prisma/migrations/add_fulltext_search_index.sql

# Option 2: If DATABASE_URL is not set, use full connection string
psql "postgresql://user:password@localhost:5432/dbname" -f prisma/migrations/add_fulltext_search_index.sql

# Option 3: Via database client (pgAdmin, DBeaver, etc.)
# Open the SQL file: prisma/migrations/add_fulltext_search_index.sql
# Copy and paste into your database client and execute
```

**Verify the index was created:**
```sql
-- Check if extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_trgm';

-- Check if index exists
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'messages' AND indexname = 'idx_message_content_search';
```

---

### Step 3: Seed the Database

```bash
npm run db:seed
```

**What this does:**
- Creates test users (admin and regular users)
- Creates sample rooms and messages
- Sets up initial data for testing

**Default Login Credentials:**
- **Admin:** `admin@example.com` / `Password123`
- **User:** `john@example.com` / `Password123`

---

## 🔄 Complete Fresh Setup (All-in-One)

If you want to do everything in one go:

```bash
# Step 1: Reset and migrate
npm run db:migrate:fresh

# Step 2: Apply full-text search index
psql $DATABASE_URL -f prisma/migrations/add_fulltext_search_index.sql

# Step 3: Seed data
npm run db:seed
```

---

## 🐳 Docker Setup

If you're using Docker:

```bash
# Make sure Docker containers are running
npm run docker:up

# Wait a few seconds for database to be ready
# Then run migrations
npm run db:migrate:fresh

# Apply full-text search index
docker exec -i <postgres-container-name> psql -U <username> -d <database> < prisma/migrations/add_fulltext_search_index.sql

# Or if you have DATABASE_URL set
psql $DATABASE_URL -f prisma/migrations/add_fulltext_search_index.sql

# Seed data
npm run db:seed
```

---

## 📝 Available Commands

### Database Commands:

```bash
# Reset database and run migrations (NO seed)
npm run db:migrate:fresh

# Reset database, run migrations, AND seed
npm run db:migrate:fresh-seed

# Create new migration (after schema changes)
npm run db:migrate

# Generate Prisma Client (after schema changes)
npm run db:generate

# Seed database only
npm run db:seed

# Push schema without migrations (development only)
npm run db:push

# Open Prisma Studio (database GUI)
npm run db:studio
```

---

## ⚠️ Important Notes

### 1. Full-Text Search Index

**MUST be applied manually** after migrations because:
- Prisma doesn't support GIN indexes directly
- Requires PostgreSQL extension (`pg_trgm`)
- Must be created via raw SQL

**File:** `prisma/migrations/add_fulltext_search_index.sql`

### 2. Connection Pooling

After setup, update your `DATABASE_URL` for better performance:

```
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10&connect_timeout=10&statement_timeout=5000"
```

### 3. Environment Variables

Make sure your `.env` file has:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/chatflow"
```

---

## 🔍 Verification Checklist

After setup, verify everything:

```bash
# 1. Check tables exist
npm run db:studio
# Should see: users, chat_rooms, messages, etc.

# 2. Check full-text search index
psql $DATABASE_URL -c "SELECT indexname FROM pg_indexes WHERE tablename = 'messages' AND indexname = 'idx_message_content_search';"

# 3. Check seeded data
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
# Should return count > 0

# 4. Test login
# Try logging in with: admin@example.com / Password123
```

---

## 🚨 Troubleshooting

### Issue: "Extension pg_trgm does not exist"

**Solution:**
```sql
-- Run this first
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Issue: "Permission denied" when creating extension

**Solution:**
- Make sure you're using a superuser account
- Or grant necessary permissions:
```sql
GRANT CREATE ON DATABASE your_database TO your_user;
```

### Issue: Migration fails

**Solution:**
```bash
# Check migration status
npm run db:status

# If stuck, reset completely
npm run db:migrate:fresh
```

### Issue: Seed fails

**Solution:**
```bash
# Make sure migrations ran successfully first
npm run db:migrate:fresh

# Then try seeding again
npm run db:seed
```

---

## ✅ Complete Setup Script

Create a file `setup-database.sh` (or `setup-database.bat` for Windows):

**Linux/Mac:**
```bash
#!/bin/bash
echo "🔄 Resetting database..."
npm run db:migrate:fresh

echo "📊 Applying full-text search index..."
psql $DATABASE_URL -f prisma/migrations/add_fulltext_search_index.sql

echo "🌱 Seeding database..."
npm run db:seed

echo "✅ Database setup complete!"
echo ""
echo "Login credentials:"
echo "  Admin: admin@example.com / Password123"
echo "  User:  john@example.com / Password123"
```

**Windows (PowerShell):**
```powershell
Write-Host "🔄 Resetting database..." -ForegroundColor Cyan
npm run db:migrate:fresh

Write-Host "📊 Applying full-text search index..." -ForegroundColor Cyan
psql $env:DATABASE_URL -f prisma/migrations/add_fulltext_search_index.sql

Write-Host "🌱 Seeding database..." -ForegroundColor Cyan
npm run db:seed

Write-Host "✅ Database setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Login credentials:" -ForegroundColor Yellow
Write-Host "  Admin: admin@example.com / Password123"
Write-Host "  User:  john@example.com / Password123"
```

---

## 🎯 Recommended Workflow

1. **Stop your application** (if running)

2. **Reset database:**
   ```bash
   npm run db:migrate:fresh
   ```

3. **Apply full-text search index:**
   ```bash
   psql $DATABASE_URL -f prisma/migrations/add_fulltext_search_index.sql
   ```

4. **Seed data:**
   ```bash
   npm run db:seed
   ```

5. **Verify:**
   ```bash
   npm run db:studio
   # Check that tables exist and have data
   ```

6. **Start application:**
   ```bash
   npm run dev
   ```

---

## 📊 What Gets Created

### Tables:
- ✅ `users` - User accounts
- ✅ `chat_rooms` - Chat rooms (DMs and groups)
- ✅ `room_participants` - Room membership
- ✅ `messages` - Chat messages
- ✅ `message_reactions` - Message reactions
- ✅ `message_reads` - Read receipts
- ✅ `push_subscriptions` - Push notification subscriptions
- ✅ `configs` - Application configuration

### Indexes:
- ✅ All Prisma indexes (from schema)
- ✅ Full-text search index (GIN) on messages.content
- ✅ Composite index on users (status, lastSeen)

### Seed Data:
- ✅ Admin user
- ✅ Regular users
- ✅ Sample rooms
- ✅ Sample messages

---

*Database setup complete!* ✅

