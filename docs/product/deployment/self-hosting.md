# Self-Hosting Guide

Deploy Synapse on your own infrastructure.

---

## System Requirements

**Minimum:**
- 2 CPU cores
- 4 GB RAM
- 20 GB storage
- Ubuntu 20.04+ or similar

**Recommended (Production):**
- 4 CPU cores
- 8 GB RAM
- 50 GB storage
- PostgreSQL 14+
- Redis 6+

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Domain name (for HTTPS)
- Email service (SMTP)

---

## Step 1: Server Setup

**Update system:**

```bash
sudo apt update && sudo apt upgrade -y
```

**Install Node.js:**

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

**Install PostgreSQL:**

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Install Redis:**

```bash
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

---

## Step 2: Create Database

```bash
sudo -u postgres psql

CREATE DATABASE synapse;
CREATE USER synapseuser WITH PASSWORD 'secure-password';
GRANT ALL PRIVILEGES ON DATABASE synapse TO synapseuser;
\q
```

---

## Step 3: Clone Repository

```bash
cd /var/www
sudo git clone https://github.com/saleem189/synapse.git
cd synapse
sudo npm install
```

---

## Step 4: Environment Configuration

```bash
sudo cp env-example.txt .env
sudo nano .env
```

**Configure variables:**

```env
# Database
DATABASE_URL="postgresql://synapseuser:secure-password@localhost:5432/synapse?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# NextAuth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="generate-random-secret-here"

# Sockets
NEXT_PUBLIC_SOCKET_URL="https://your-domain.com:3001"
SOCKET_PORT=3001

# VAPID Keys (for push notifications)
NEXT_PUBLIC_VAPID_PUBLIC_KEY="your-public-key"
VAPID_PRIVATE_KEY="your-private-key"
```

**Generate secrets:**

```bash
# NextAuth secret
openssl rand -base64 32

# VAPID keys
npx web-push generate-vapid-keys
```

---

## Step 5: Database Migration

```bash
npx prisma migrate deploy
npx prisma generate
```

---

## Step 6: Build Application

```bash
npm run build
```

---

## Step 7: Process Management (PM2)

**Install PM2:**

```bash
sudo npm install -g pm2
```

**Create ecosystem file:**

```bash
sudo nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'synapse-web',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'synapse-socket',
      script: 'npm',
      args: 'run server',
      env: {
        NODE_ENV: 'production',
        SOCKET_PORT: 3001
      }
    },
    {
      name: 'synapse-worker',
      script: 'npm',
      args: 'run worker',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

**Start services:**

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## Step 8: Nginx Configuration

**Install Nginx:**

```bash
sudo apt install -y nginx
```

**Configure Nginx:**

```bash
sudo nano /etc/nginx/sites-available/synapse
```

```nginx
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

# Main application (HTTPS)
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Next.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.io server
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

**Enable site:**

```bash
sudo ln -s /etc/nginx/sites-available/synapse /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Step 9: SSL Certificate (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Step 10: Firewall

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

---

## Verification

1. **Check services:**
   ```bash
   pm2 status
   ```

2. **Test web app:**
   ```bash
   curl https://your-domain.com
   ```

3. **Test Socket.io:**
   ```bash
   curl https://your-domain.com:3001/health
   ```

---

## Maintenance

### Update Application

```bash
cd /var/www/synapse
sudo git pull
sudo npm install
sudo npm run build
npx prisma migrate deploy
pm2 restart all
```

### View Logs

```bash
pm2 logs synapse-web
pm2 logs synapse-socket
pm2 logs synapse-worker
```

### Restart Services

```bash
pm2 restart all
```

---

## Backup

### Database Backup

```bash
pg_dump -U synapseuser synapse > backup.sql
```

### Automated Backups

```bash
# Create backup script
sudo nano /usr/local/bin/backup-synapse.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/synapse"

mkdir -p $BACKUP_DIR
pg_dump -U synapseuser synapse | gzip > $BACKUP_DIR/synapse_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "synapse_*.sql.gz" -mtime +7 -delete
```

```bash
sudo chmod +x /usr/local/bin/backup-synapse.sh
```

**Add cron job:**

```bash
sudo crontab -e

# Daily backup at 2 AM
0 2 * * * /usr/local/bin/backup-synapse.sh
```

---

## Monitoring

### PM2 Monitoring

```bash
pm2 monit
```

### System Resources

```bash
htop
```

### Disk Usage

```bash
df -h
```

---

## Troubleshooting

### Services Won't Start

```bash
pm2 logs
```

### Database Connection Failed

```bash
psql -U synapseuser -d synapse
```

### High Memory Usage

```bash
pm2 restart all
```

---

## Next Steps

- **[Docker Setup](./docker.md)** - Use Docker Compose
- **[Environment Variables](./environment.md)** - Complete configuration
- **[Production Checklist](./production.md)** - Security & performance

