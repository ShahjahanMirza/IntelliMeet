# MeetClone Deployment Guide

This guide covers deploying MeetClone to various cloud platforms and production environments.

## 🚀 Quick Deploy Options

### Option 1: Railway (Recommended)
Railway provides easy deployment with automatic SSL and database hosting.

### Option 2: Heroku
Popular platform with add-ons for PostgreSQL and Redis.

### Option 3: DigitalOcean App Platform
Simple deployment with managed databases.

### Option 4: Self-Hosted VPS
Full control over your deployment environment.

## 📋 Pre-Deployment Checklist

- [ ] Production environment variables configured
- [ ] Database migration scripts tested
- [ ] SSL certificates obtained (if self-hosting)
- [ ] Domain name configured
- [ ] CORS origins updated for production
- [ ] Rate limiting configured appropriately
- [ ] Error monitoring set up
- [ ] Backup strategy implemented

## 🛤️ Railway Deployment

Railway is the easiest option for beginners.

### 1. Prepare Your Repository

1. Push your code to GitHub/GitLab
2. Ensure your `package.json` has the correct scripts

### 2. Deploy Backend

1. Sign up at [railway.app](https://railway.app)
2. Create a new project
3. Connect your repository
4. Railway will auto-detect Node.js and deploy

### 3. Add Database

1. In Railway dashboard, click "Add Service"
2. Select "PostgreSQL"
3. Note the connection string provided

### 4. Configure Environment Variables

In Railway dashboard, go to your backend service and add:

```env
NODE_ENV=production
PORT=8001
DATABASE_URL=<your-postgresql-url-from-railway>
CORS_ORIGIN=https://your-frontend-domain.com
```

### 5. Deploy Frontend

You can deploy the frontend to:
- **Vercel**: Connect GitHub repo, builds automatically
- **Netlify**: Drag and drop `frontend/dist` folder
- **Railway**: Create another service for static files

### 6. Update Frontend API URL

In `frontend/client-new.ts`:
```typescript
const baseURL = process.env.NODE_ENV === 'production'
  ? 'https://your-railway-backend.up.railway.app'
  : 'http://localhost:8001';
```

## 🟪 Heroku Deployment

### 1. Prepare Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create app
heroku create your-meetclone-api
```

### 2. Add PostgreSQL

```bash
heroku addons:create heroku-postgresql:mini
```

### 3. Configure Environment

```bash
heroku config:set NODE_ENV=production
heroku config:set CORS_ORIGIN=https://your-frontend-domain.com
```

### 4. Deploy

```bash
# Add Procfile to backend-new directory
echo "web: npm start" > backend-new/Procfile

# Deploy
git subtree push --prefix=backend-new heroku main
```

### 5. Run Migrations

```bash
heroku run npm run db:migrate
```

## 🌊 DigitalOcean App Platform

### 1. Create App

1. Sign up at [DigitalOcean](https://www.digitalocean.com)
2. Go to App Platform
3. Create new app from GitHub

### 2. Configure Build Settings

**Backend Service:**
- Build Command: `npm run build`
- Run Command: `npm start`
- Environment: Node.js 18

**Frontend Service:**
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment: Static Site

### 3. Add Managed Database

1. In App settings, add "Managed Database"
2. Select PostgreSQL
3. Note the connection details

### 4. Environment Variables

Add to your backend service:
```env
NODE_ENV=production
DATABASE_URL=${db.DATABASE_URL}
CORS_ORIGIN=https://your-frontend-url
```

## 🖥️ Self-Hosted VPS Deployment

For Ubuntu/Debian servers.

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y
```

### 2. Database Setup

```bash
# Create database and user
sudo -u postgres psql

CREATE DATABASE meetclone;
CREATE USER meetclone_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE meetclone TO meetclone_user;
\q
```

### 3. Application Setup

```bash
# Clone your repository
git clone https://github.com/yourusername/meetclone.git
cd meetclone

# Install dependencies
npm install

# Build applications
npm run build

# Set up environment
cp backend-new/env.sample backend-new/.env
# Edit .env with your production settings
```

### 4. PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'meetclone-api',
    cwd: './backend-new',
    script: 'dist/server.js',
    instances: 2,
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 8001,
      DATABASE_URL: 'postgresql://meetclone_user:your_secure_password@localhost:5432/meetclone'
    }
  }]
};
```

### 5. Start Application

```bash
# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

### 6. Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/meetclone/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

### 7. SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🏗️ Docker Deployment

### 1. Backend Dockerfile

Create `backend-new/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 8001

CMD ["npm", "start"]
```

### 2. Frontend Dockerfile

Create `frontend/Dockerfile`:

```dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
```

### 3. Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  database:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: meetclone
      POSTGRES_USER: meetclone_user
      POSTGRES_PASSWORD: your_secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend-new
    environment:
      NODE_ENV: production
      PORT: 8001
      DATABASE_URL: postgresql://meetclone_user:your_secure_password@database:5432/meetclone
      CORS_ORIGIN: http://localhost:3000
    depends_on:
      - database
    ports:
      - "8001:8001"

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### 4. Deploy with Docker

```bash
# Build and start
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop
docker-compose down
```

## 🔧 Production Configuration

### Environment Variables

**Backend (.env):**
```env
NODE_ENV=production
PORT=8001
DATABASE_URL=postgresql://user:password@host:port/database
CORS_ORIGIN=https://yourdomain.com
LOG_LEVEL=info
MAX_PARTICIPANTS_PER_ROOM=10
SESSION_TIMEOUT_MINUTES=30
```

### Database Migration

```bash
# Run migrations in production
npm run db:migrate
```

### Security Headers

Add to your server/nginx configuration:

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
```

## 📊 Monitoring

### 1. Application Monitoring

**PM2 Monitoring:**
```bash
pm2 monit
pm2 logs
```

**Health Checks:**
```bash
# Add to crontab
*/5 * * * * curl -f http://localhost:8001/api/health || systemctl restart meetclone
```

### 2. Database Monitoring

```sql
-- Monitor active connections
SELECT count(*) FROM pg_stat_activity;

-- Monitor database size
SELECT pg_size_pretty(pg_database_size('meetclone'));
```

### 3. Log Management

```bash
# Rotate logs with logrotate
sudo nano /etc/logrotate.d/meetclone

/var/log/meetclone/*.log {
    daily
    missingok
    rotate 52
    compress
    notifempty
    create 644 ubuntu ubuntu
    postrotate
        pm2 reload meetclone-api
    endscript
}
```

## 🛡️ Security

### 1. Firewall Configuration

```bash
# UFW setup
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 2. Database Security

```sql
-- Create read-only user for monitoring
CREATE USER meetclone_readonly WITH ENCRYPTED PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE meetclone TO meetclone_readonly;
GRANT USAGE ON SCHEMA public TO meetclone_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO meetclone_readonly;
```

### 3. Rate Limiting

Configure nginx rate limiting:

```nginx
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    server {
        location /api {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://localhost:8001;
        }
    }
}
```

## 📦 Backup Strategy

### 1. Database Backups

```bash
#!/bin/bash
# backup-db.sh
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U meetclone_user -h localhost meetclone > /backups/meetclone_$DATE.sql
find /backups -name "meetclone_*.sql" -mtime +7 -delete
```

### 2. Application Backups

```bash
#!/bin/bash
# backup-app.sh
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf /backups/meetclone-app_$DATE.tar.gz /path/to/meetclone
find /backups -name "meetclone-app_*.tar.gz" -mtime +30 -delete
```

### 3. Automated Backups

```bash
# Add to crontab
0 2 * * * /usr/local/bin/backup-db.sh
0 3 * * 0 /usr/local/bin/backup-app.sh
```

## 🔄 Updates and Maintenance

### 1. Application Updates

```bash
#!/bin/bash
# update-app.sh
cd /path/to/meetclone
git pull origin main
npm install
npm run build
pm2 reload ecosystem.config.js
```

### 2. Database Migrations

```bash
# Before updating application
npm run db:migrate
```

### 3. Zero-Downtime Deployment

```bash
# Using PM2 cluster mode
pm2 reload ecosystem.config.js --update-env
```

## 🚨 Troubleshooting

### Common Issues

**502 Bad Gateway:**
- Check if backend is running: `pm2 status`
- Check nginx configuration: `nginx -t`
- Check firewall rules: `sudo ufw status`

**Database Connection Issues:**
- Verify DATABASE_URL
- Check PostgreSQL service: `sudo systemctl status postgresql`
- Test connection: `psql $DATABASE_URL`

**WebSocket Issues:**
- Ensure nginx proxy configuration includes WebSocket support
- Check CORS configuration
- Verify no blocking firewalls

### Performance Monitoring

```bash
# Monitor system resources
htop
iostat -x 1
free -h

# Monitor application
pm2 monit
curl http://localhost:8001/api/health
```

## 📞 Support

For deployment issues:

1. Check application logs: `pm2 logs`
2. Check system logs: `sudo journalctl -u nginx`
3. Test API endpoints: `curl http://localhost:8001/api/health`
4. Monitor database: `psql -c "SELECT count(*) FROM rooms;"`

---

**Happy deploying! 🚀**
