# How to Apply Full-Text Search Index

**File:** `prisma/migrations/add_fulltext_search_index.sql`

---

## 🪟 Windows Instructions

### Option 1: PowerShell (Recommended)

Open **PowerShell** in your project folder and run:

```powershell
# If DATABASE_URL is set as environment variable
psql $env:DATABASE_URL -f prisma/migrations/add_fulltext_search_index.sql
```

**Or with full connection string:**
```powershell
psql "postgresql://username:password@localhost:5432/chatapp" -f prisma/migrations/add_fulltext_search_index.sql
```

---

### Option 2: Command Prompt (CMD)

Open **Command Prompt** in your project folder and run:

```cmd
# If DATABASE_URL is set
psql %DATABASE_URL% -f prisma/migrations/add_fulltext_search_index.sql
```

**Or with full connection string:**
```cmd
psql "postgresql://username:password@localhost:5432/chatapp" -f prisma/migrations/add_fulltext_search_index.sql
```

---

### Option 3: Using pgAdmin (GUI - Easiest)

1. **Open pgAdmin** (PostgreSQL GUI tool)
2. **Connect** to your database
3. **Right-click** on your database → **Query Tool**
4. **Open** the file: `prisma/migrations/add_fulltext_search_index.sql`
5. **Copy** all the SQL content
6. **Paste** into Query Tool
7. **Click Execute** (F5)

---

### Option 4: Using DBeaver (GUI)

1. **Open DBeaver**
2. **Connect** to your PostgreSQL database
3. **Right-click** on your database → **SQL Editor** → **New SQL Script**
4. **Open** the file: `prisma/migrations/add_fulltext_search_index.sql`
5. **Copy** all the SQL content
6. **Paste** into SQL Editor
7. **Click Execute** (Ctrl+Enter)

---

### Option 5: Using VS Code Extension

1. **Install** "PostgreSQL" extension in VS Code
2. **Connect** to your database
3. **Open** `prisma/migrations/add_fulltext_search_index.sql`
4. **Right-click** → **Execute Query**

---

## 🔍 Check if psql is Installed

**In PowerShell:**
```powershell
psql --version
```

**If you get an error**, psql is not in your PATH. You have two options:

### A. Add PostgreSQL to PATH

1. Find PostgreSQL installation (usually `C:\Program Files\PostgreSQL\15\bin` or similar)
2. Add to Windows PATH environment variable
3. Restart terminal

### B. Use Full Path

```powershell
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" $env:DATABASE_URL -f prisma/migrations/add_fulltext_search_index.sql
```

---

## 📋 Step-by-Step (Easiest Method)

### Using pgAdmin (No Command Line Needed):

1. **Open pgAdmin**
2. **Connect to your database** (localhost:5432)
3. **Select your database** (`chatapp`)
4. **Right-click** → **Query Tool**
5. **Open file:** `prisma/migrations/add_fulltext_search_index.sql`
6. **Copy all SQL** from the file
7. **Paste into Query Tool**
8. **Press F5** or click **Execute**

**That's it!** ✅

---

## ✅ Verify Index Was Created

After applying, verify the index exists:

**In pgAdmin Query Tool:**
```sql
-- Check if extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_trgm';

-- Check if index exists
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'messages' 
AND indexname = 'idx_message_content_search';
```

**In PowerShell:**
```powershell
psql $env:DATABASE_URL -c "SELECT indexname FROM pg_indexes WHERE tablename = 'messages' AND indexname = 'idx_message_content_search';"
```

---

## 🐳 If Using Docker

If your database is in Docker:

```powershell
# Find your postgres container name
docker ps

# Execute SQL file in container
docker exec -i <container-name> psql -U <username> -d <database> < prisma/migrations/add_fulltext_search_index.sql

# Example:
docker exec -i postgres psql -U postgres -d chatapp < prisma/migrations/add_fulltext_search_index.sql
```

---

## 📝 What the SQL Does

The SQL file:
1. ✅ Enables `pg_trgm` extension (PostgreSQL trigram extension)
2. ✅ Creates GIN index on `messages.content` for fast text search
3. ✅ Makes message search queries 10-100x faster

---

## ⚠️ Important Notes

- **Must be run AFTER migrations** (after `npm run db:migrate:fresh`)
- **Requires database admin privileges** (to create extension)
- **One-time setup** - only needs to be run once per database

---

*Choose the method that works best for you!* 🚀

