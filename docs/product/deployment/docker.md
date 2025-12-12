# Docker Deployment

Deploy Synapse using Docker Compose for easy setup and management.

---

## What You'll Get

- PostgreSQL database
- Redis cache
- pgAdmin (web interface)
- All services networked together
- Persistent data volumes
- Easy start/stop management

**Time:** ~10 minutes

---

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 2 GB free RAM
- 5 GB free disk space

---

## Quick Start

### Step 1: Clone Repository

```bash
git clone https://github.com/saleem189/synapse.git
cd synapse
```

---

### Step 2: Configure Environment

```bash
cp env-example.txt .env
```

**Edit `.env` for Docker setup:**

```env
# Database (matches docker-compose.yml)
DATABASE_URL="postgresql://admin:password123@localhost:5432/chatapp?schema=public"

# Redis (matches docker-compose.yml)
REDIS_URL="redis://:redis123@localhost:6379"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-random-secret-here"

# Socket.io
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
SOCKET_PORT=3001
```

**Generate NextAuth secret:**

```bash
openssl rand -base64 32
```

---

### Step 3: Start Services

**Automated setup (recommended):**

```bash
npm install
npm run setup
```

This will:
- Start Docker services (PostgreSQL, Redis, pgAdmin)
- Generate Prisma client
- Run database migrations

**Manual setup:**

```bash
# Start Docker services
npm run docker:up

# Install dependencies
npm install

# Run migrations
npx prisma migrate dev
npx prisma generate
```

---

### Step 4: Start Application

```bash
npm run dev:all
```

This starts:
- Next.js app (http://localhost:3000)
- Socket.io server (http://localhost:3001)
- Background worker

---

## Access Services

| Service | URL | Credentials |
|---------|-----|-------------|
| **Synapse Web** | http://localhost:3000 | Register new user |
| **Socket.io Health** | http://localhost:3001/health | - |
| **pgAdmin** | http://localhost:8082 | `admin@admin.com` / `admin123` |
| **PostgreSQL** | localhost:5432 | `admin` / `password123` |
| **Redis** | localhost:6379 | Password: `redis123` |

---

## Docker Services

### PostgreSQL

**Database for storing:**
- Users, rooms, messages
- Call sessions, reactions
- Push notification subscriptions

**Access via psql:**

```bash
docker exec -it chatapp-postgres psql -U admin -d chatapp
```

**Backup database:**

```bash
docker exec chatapp-postgres pg_dump -U admin chatapp > backup.sql
```

**Restore database:**

```bash
docker exec -i chatapp-postgres psql -U admin chatapp < backup.sql
```

---

### Redis

**Used for:**
- Socket.io adapter (horizontal scaling)
- Session caching
- Rate limiting
- Background job queues (BullMQ)

**Access Redis CLI:**

```bash
docker exec -it chatapp-redis redis-cli -a redis123
```

**Monitor Redis:**

```bash
docker exec -it chatapp-redis redis-cli -a redis123 MONITOR
```

---

### pgAdmin (Optional)

**Web-based PostgreSQL admin interface.**

1. Open http://localhost:8082
2. Login: `admin@admin.com` / `admin123`
3. Add server:
   - **Host:** `postgres` (Docker network name)
   - **Port:** 5432
   - **Username:** admin
   - **Password:** password123

---

## Docker Commands

### Start Services

```bash
npm run docker:up
```

Or directly:

```bash
docker-compose up -d
```

---

### Stop Services

```bash
npm run docker:down
```

Or directly:

```bash
docker-compose down
```

**Stop and remove volumes (⚠️ deletes data):**

```bash
docker-compose down -v
```

---

### View Logs

```bash
# All services
docker-compose logs -f

# PostgreSQL only
docker-compose logs -f postgres

# Redis only
docker-compose logs -f redis
```

---

### Check Status

```bash
docker-compose ps
```

---

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart postgres
```

---

## Customize Docker Setup

### Change Ports

Edit `docker-compose.yml`:

```yaml
services:
  postgres:
    ports:
      - "5433:5432"  # Use 5433 instead of 5432
```

Update `.env`:

```env
DATABASE_URL="postgresql://admin:password123@localhost:5433/chatapp?schema=public"
```

---

### Change Credentials

**Edit `docker-compose.yml`:**

```yaml
services:
  postgres:
    environment:
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: mypassword
      POSTGRES_DB: mydb
```

**Update `.env`:**

```env
DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/mydb?schema=public"
```

**Recreate services:**

```bash
docker-compose down -v
docker-compose up -d
```

---

### Remove pgAdmin

If you don't need pgAdmin (saves resources):

Edit `docker-compose.yml` and remove the `pgadmin` service section.

---

## Production Deployment

### Security Recommendations

**1. Change default passwords:**

```yaml
services:
  postgres:
    environment:
      POSTGRES_PASSWORD: strong-random-password

  redis:
    command: redis-server --appendonly yes --requirepass strong-redis-password
```

**2. Use environment variables:**

```yaml
services:
  postgres:
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
```

**3. Restrict ports:**

Remove port mappings and use Docker networks:

```yaml
services:
  postgres:
    # Don't expose to host
    # ports:
    #   - "5432:5432"
    networks:
      - synapse-network

networks:
  synapse-network:
    driver: bridge
```

**4. Enable SSL:**

Mount SSL certificates:

```yaml
services:
  postgres:
    volumes:
      - ./certs:/var/lib/postgresql/certs
    command: >
      postgres
      -c ssl=on
      -c ssl_cert_file=/var/lib/postgresql/certs/server.crt
      -c ssl_key_file=/var/lib/postgresql/certs/server.key
```

---

### Add Application to Docker

**Create `Dockerfile`:**

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000 3001

CMD ["npm", "run", "start"]
```

**Update `docker-compose.yml`:**

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
      - "3001:3001"
    environment:
      DATABASE_URL: "postgresql://admin:password123@postgres:5432/chatapp?schema=public"
      REDIS_URL: "redis://:redis123@redis:6379"
    depends_on:
      - postgres
      - redis

  postgres:
    # ... existing config

  redis:
    # ... existing config
```

---

## Troubleshooting

### Port Already in Use

**Problem:** `Error: port 5432 is already in use`

**Solution:**

```bash
# Check what's using the port
lsof -i :5432

# Option 1: Stop local PostgreSQL
sudo systemctl stop postgresql

# Option 2: Change Docker port
# Edit docker-compose.yml: "5433:5432"
```

---

### Services Won't Start

**Problem:** `docker-compose up` fails

**Solutions:**

```bash
# View logs
docker-compose logs

# Recreate services
docker-compose down
docker-compose up -d

# Rebuild images
docker-compose build --no-cache
docker-compose up -d
```

---

### Database Connection Failed

**Problem:** App can't connect to PostgreSQL

**Solutions:**

1. **Verify PostgreSQL is running:**
   ```bash
   docker-compose ps postgres
   ```

2. **Check connection from host:**
   ```bash
   psql -h localhost -U admin -d chatapp
   ```

3. **Verify DATABASE_URL in `.env`**

4. **Check Docker network:**
   ```bash
   docker network inspect synapse_default
   ```

---

### Redis Connection Failed

**Problem:** App can't connect to Redis

**Solutions:**

1. **Verify Redis is running:**
   ```bash
   docker-compose ps redis
   ```

2. **Test connection:**
   ```bash
   docker exec -it chatapp-redis redis-cli -a redis123 ping
   ```

3. **Check REDIS_URL in `.env`**

---

## Data Persistence

**Docker volumes store data permanently:**

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect synapse_postgres_data

# Backup volume
docker run --rm -v synapse_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data

# Restore volume
docker run --rm -v synapse_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /
```

---

## Next Steps

- **[Self-Hosting Guide](./self-hosting.md)** - Deploy without Docker
- **[Production Checklist](./production.md)** - Security & performance
- **[Environment Variables](./environment.md)** - Complete configuration

---

## Related

- **[Quickstart](../getting-started/quickstart.md)** - Local development
- **[Development Setup](../../contributors/getting-started/setup.md)** - Contributor guide

