# IntelliMeet - Vercel Deployment Guide

This guide will help you deploy your IntelliMeet video meeting application to Vercel.

## Prerequisites

- [Vercel CLI](https://vercel.com/cli) installed (`npm i -g vercel`)
- [Git](https://git-scm.com/) installed
- A [Vercel account](https://vercel.com/signup)
- Node.js 18+ installed

## Deployment Steps

### 1. Prepare Your Repository

First, make sure your project is in a Git repository:

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit changes
git commit -m "Initial commit for deployment"

# Push to GitHub/GitLab (recommended)
git remote add origin https://github.com/yourusername/intellimeet.git
git push -u origin main
```

### 2. Install Dependencies

Make sure all dependencies are installed:

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend-new
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..
```

### 3. Environment Variables

Create environment variables in Vercel:

#### Via Vercel Dashboard:
1. Go to your project settings in Vercel
2. Navigate to "Environment Variables"
3. Add the following variables:

```env
NODE_ENV=production
CORS_ORIGIN=https://your-app-name.vercel.app
DATABASE_URL=sqlite://./database.sqlite
```

#### Via Vercel CLI:
```bash
vercel env add NODE_ENV production
vercel env add CORS_ORIGIN https://your-app-name.vercel.app
```

### 4. Deploy to Vercel

#### Option A: Deploy via CLI

```bash
# Login to Vercel
vercel login

# Deploy (first time)
vercel

# Follow the prompts:
# - Link to existing project? No
# - Project name: intellimeet (or your preferred name)
# - Directory: ./
# - Override settings? No

# For subsequent deployments
vercel --prod
```

#### Option B: Deploy via GitHub Integration

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "New Project"
4. Import your GitHub repository
5. Configure build settings:
   - **Build Command**: `cd frontend && npm run build`
   - **Output Directory**: `frontend/dist`
   - **Install Command**: `npm install && cd backend-new && npm install && cd ../frontend && npm install`

### 5. Configure Custom Domain (Optional)

1. Go to your project settings in Vercel
2. Navigate to "Domains"
3. Add your custom domain
4. Update DNS records as instructed

## Project Structure

```
├── api/
│   └── index.ts          # Serverless API handler
├── backend-new/          # Express backend
├── frontend/             # React frontend
├── vercel.json           # Vercel configuration
├── .env.example          # Environment variables template
└── VERCEL_DEPLOYMENT.md  # This file
```

## Important Notes

### Database Considerations

**⚠️ SQLite Limitations on Vercel:**
- SQLite files are not persistent in serverless environments
- Each function invocation creates a fresh database
- For production, consider using:
  - [Vercel Postgres](https://vercel.com/storage/postgres)
  - [PlanetScale](https://planetscale.com/)
  - [Supabase](https://supabase.com/)
  - [Railway](https://railway.app/)

### WebSocket Limitations

**⚠️ WebSocket Support:**
- Vercel serverless functions don't support persistent WebSocket connections
- Real-time features will fall back to polling
- For WebSocket support, consider:
  - [Railway](https://railway.app/)
  - [Render](https://render.com/)
  - [DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform)

### Performance Optimization

1. **Cold Starts**: First requests may be slower due to serverless cold starts
2. **Function Duration**: API functions have a maximum execution time
3. **Memory Limits**: Monitor function memory usage

## Troubleshooting

### Common Issues

#### 1. Build Failures
```bash
# Check build logs
vercel logs

# Test build locally
cd frontend && npm run build
```

#### 2. API Not Working
- Verify environment variables are set
- Check function logs in Vercel dashboard
- Ensure CORS origins include your domain

#### 3. Database Issues
- SQLite won't persist data in serverless environment
- Consider migrating to a hosted database service

#### 4. Import/Export Issues
- Ensure all imports use `.js` extensions for compiled files
- Check TypeScript compilation settings

### Debugging Commands

```bash
# View deployment logs
vercel logs

# Test locally with Vercel dev server
vercel dev

# Check function output
vercel functions list

# View environment variables
vercel env ls
```

## Alternative Deployment Options

If Vercel limitations are problematic, consider these alternatives:

### 1. Railway (Recommended for WebSocket support)
- Full Docker support
- Persistent storage
- WebSocket support
- PostgreSQL integration

### 2. Render
- Free tier available
- Full-stack applications
- Persistent disks
- Auto-scaling

### 3. DigitalOcean App Platform
- Container-based deployment
- Managed databases
- Global CDN

## Production Checklist

- [ ] Environment variables configured
- [ ] Custom domain setup (if applicable)
- [ ] Database migrated to hosted service
- [ ] CORS origins updated
- [ ] Error monitoring setup
- [ ] Performance monitoring enabled
- [ ] SSL certificate verified
- [ ] API rate limits tested
- [ ] User authentication tested
- [ ] Video/audio permissions tested in production

## Support

If you encounter issues:

1. Check [Vercel Documentation](https://vercel.com/docs)
2. Review deployment logs
3. Test locally with `vercel dev`
4. Check the [IntelliMeet GitHub Issues](https://github.com/yourusername/intellimeet/issues)

## Next Steps

After deployment:

1. Test all features in production
2. Set up monitoring and analytics
3. Configure error tracking (Sentry, Bugsnag)
4. Set up CI/CD pipeline
5. Add automated testing
6. Consider database migration for persistence
7. Set up backup strategies

---

**Happy Deploying! 🚀**

Your IntelliMeet application should now be live and accessible via your Vercel URL.
