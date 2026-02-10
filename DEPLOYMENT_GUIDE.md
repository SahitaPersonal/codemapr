# CodeMapr Deployment Guide

This guide covers deploying CodeMapr to various platforms.

## Architecture

- **Frontend**: Next.js application (packages/frontend)
- **Backend**: NestJS API (packages/backend)
- **Shared**: Common types and utilities (packages/shared)

## Deployment Options

### Option 1: Vercel (Frontend) + Railway (Backend) - Recommended

#### Backend Deployment (Railway)

1. **Sign up for Railway**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `codemapr` repository

3. **Configure Backend Service**
   - Railway will auto-detect the Dockerfile
   - Set environment variables:
     ```
     NODE_ENV=production
     PORT=3001
     ```

4. **Deploy**
   - Railway will automatically build and deploy
   - Note the public URL (e.g., `https://codemapr-backend.up.railway.app`)

#### Frontend Deployment (Vercel)

1. **Sign up for Vercel**
   - Go to https://vercel.com
   - Sign up with GitHub

2. **Import Project**
   - Click "Add New" → "Project"
   - Import your `codemapr` repository

3. **Configure Build Settings**
   - Framework Preset: Next.js
   - Root Directory: `packages/frontend`
   - Build Command: `npm run build`
   - Output Directory: `.next`

4. **Set Environment Variables**
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.up.railway.app
   ```

5. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy automatically

### Option 2: Render (Full Stack)

1. **Sign up for Render**
   - Go to https://render.com
   - Sign up with GitHub

2. **Create Blueprint**
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Render will use `render.yaml` configuration

3. **Configure Environment Variables**
   - Backend:
     ```
     NODE_ENV=production
     PORT=3001
     ```
   - Frontend:
     ```
     NEXT_PUBLIC_API_URL=https://codemapr-backend.onrender.com
     ```

4. **Deploy**
   - Render will deploy both services automatically

### Option 3: Docker Compose (Self-Hosted)

1. **Create docker-compose.yml**
   ```yaml
   version: '3.8'
   
   services:
     backend:
       build:
         context: .
         dockerfile: packages/backend/Dockerfile
       ports:
         - "3001:3001"
       environment:
         - NODE_ENV=production
         - PORT=3001
       restart: unless-stopped
   
     frontend:
       build:
         context: ./packages/frontend
         dockerfile: Dockerfile
       ports:
         - "3000:3000"
       environment:
         - NEXT_PUBLIC_API_URL=http://localhost:3001
       depends_on:
         - backend
       restart: unless-stopped
   ```

2. **Deploy**
   ```bash
   docker-compose up -d
   ```

## Environment Variables

### Backend (.env)
```env
NODE_ENV=production
PORT=3001

# Optional: Redis for caching
REDIS_HOST=localhost
REDIS_PORT=6379

# Optional: Database
DATABASE_URL=postgresql://user:password@host:5432/codemapr
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

## Post-Deployment Checklist

- [ ] Backend health check: `https://your-backend-url/health`
- [ ] Frontend loads correctly
- [ ] File upload works
- [ ] Analysis functionality works
- [ ] Flowchart generation works
- [ ] CORS is configured correctly
- [ ] Environment variables are set

## Troubleshooting

### CORS Issues
If you get CORS errors, update backend CORS configuration in `packages/backend/src/main.ts`:

```typescript
app.enableCors({
  origin: ['https://your-frontend-url.vercel.app'],
  credentials: true,
});
```

### Build Failures

**Frontend:**
- Ensure all dependencies are in `package.json`
- Check Node.js version (requires 18+)
- Verify build command: `npm run build`

**Backend:**
- Ensure shared package builds first
- Check TypeScript compilation
- Verify all imports are correct

### Performance Issues

- Enable Redis caching for better performance
- Consider upgrading to paid plans for more resources
- Optimize file upload size limits

## Monitoring

### Railway
- View logs in Railway dashboard
- Set up health checks
- Configure alerts

### Vercel
- View deployment logs
- Monitor analytics
- Set up error tracking

### Render
- View service logs
- Monitor metrics
- Configure health checks

## Scaling

### Horizontal Scaling
- Railway: Increase replicas in settings
- Render: Upgrade to paid plan for auto-scaling
- Vercel: Automatically scales

### Vertical Scaling
- Upgrade to higher-tier plans
- Increase memory/CPU allocation
- Add Redis for caching

## Security

- [ ] Enable HTTPS (automatic on Vercel/Railway/Render)
- [ ] Set secure environment variables
- [ ] Configure rate limiting
- [ ] Enable CORS only for your domain
- [ ] Keep dependencies updated

## Cost Estimates

### Free Tier (Hobby Projects)
- **Vercel**: Free (100GB bandwidth/month)
- **Railway**: $5 credit/month (enough for small projects)
- **Render**: Free tier available (limited resources)

### Paid Plans (Production)
- **Vercel Pro**: $20/month
- **Railway**: Pay-as-you-go (~$10-30/month)
- **Render**: $7-25/month per service

## Support

For deployment issues:
1. Check platform documentation
2. Review deployment logs
3. Verify environment variables
4. Test locally with production build

## Quick Deploy Commands

### Local Production Build
```bash
# Backend
cd packages/backend
npm run build
npm run start:prod

# Frontend
cd packages/frontend
npm run build
npm start
```

### Docker Build
```bash
# Backend
docker build -f packages/backend/Dockerfile -t codemapr-backend .
docker run -p 3001:3001 codemapr-backend

# Frontend
cd packages/frontend
docker build -t codemapr-frontend .
docker run -p 3000:3000 codemapr-frontend
```

## Next Steps

After deployment:
1. Test all features thoroughly
2. Set up monitoring and alerts
3. Configure custom domain (optional)
4. Enable analytics
5. Set up CI/CD for automatic deployments
