# Deploy from GitHub Only - Complete Guide

This guide shows you how to deploy CodeMapr using **only GitHub** - no need to visit other platforms' websites.

## How It Works

1. You push code to GitHub
2. GitHub Actions automatically deploys to hosting platforms
3. Everything is managed from GitHub

## Setup (One-Time Only)

### Step 1: Connect Hosting Platforms to GitHub

You need to do this **once** to get API tokens:

#### A. Render (Backend - Free Forever)

1. Go to https://render.com and sign in with GitHub
2. Create a new Web Service:
   - Click "New" → "Web Service"
   - Connect your `codemapr` repository
   - Name: `codemapr-backend`
   - Root Directory: Leave empty (uses repo root)
   - Build Command: `npm install --workspaces && npm run build --workspace=packages/shared && npm run build --workspace=packages/backend`
   - Start Command: `cd packages/backend && npm run start:prod`
   - Plan: **Free**
3. After creation, go to Settings → Deploy Hook
4. Copy the Deploy Hook URL
5. Add to GitHub Secrets (see Step 2)

#### B. Vercel (Frontend - Free Forever)

1. Go to https://vercel.com and sign in with GitHub
2. Import your `codemapr` repository
3. Get your tokens:
   - Go to Settings → Tokens
   - Create a new token
   - Copy the token
4. Get your IDs:
   - Go to Project Settings
   - Copy `Project ID` and `Org ID`
5. Add to GitHub Secrets (see Step 2)

### Step 2: Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these secrets:

```
RENDER_DEPLOY_HOOK = <your-render-deploy-hook-url>
VERCEL_TOKEN = <your-vercel-token>
VERCEL_ORG_ID = <your-vercel-org-id>
VERCEL_PROJECT_ID = <your-vercel-project-id>
```

## ✅ That's It! Now Everything is Automatic

### How to Deploy

Just push to GitHub:

```bash
git add .
git commit -m "your changes"
git push origin main
```

**GitHub Actions will automatically:**
1. Deploy backend to Render
2. Deploy frontend to Vercel
3. Show deployment status in GitHub

### View Deployment Status

1. Go to your GitHub repository
2. Click **Actions** tab
3. See deployment progress in real-time

### Manual Deployment (Optional)

If you want to deploy without pushing code:

1. Go to **Actions** tab
2. Click **Deploy CodeMapr** workflow
3. Click **Run workflow** → **Run workflow**

## Alternative: GitHub Pages (Frontend Only)

If you only want to deploy the frontend as a static site:

### Setup GitHub Pages

1. Build the frontend:
   ```bash
   cd packages/frontend
   npm run build
   npm run export  # Creates static HTML
   ```

2. Create `.github/workflows/pages.yml`:
   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: [main]

   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         
         - name: Setup Node
           uses: actions/setup-node@v3
           with:
             node-version: '20'
         
         - name: Install and Build
           run: |
             cd packages/frontend
             npm ci
             npm run build
             npm run export
         
         - name: Deploy to GitHub Pages
           uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./packages/frontend/out
   ```

3. Enable GitHub Pages:
   - Go to Settings → Pages
   - Source: Deploy from a branch
   - Branch: `gh-pages`

**Note:** This only works for frontend. Backend still needs a server.

## Comparison: GitHub-Only vs Manual

### GitHub Actions (Recommended)
- ✅ Push to GitHub → Auto-deploys
- ✅ No need to visit other platforms
- ✅ Deployment history in GitHub
- ✅ Can rollback from GitHub
- ⚠️ One-time setup required

### Manual Deployment
- ⚠️ Must visit Render/Vercel websites
- ⚠️ Manual clicks for each deployment
- ✅ No GitHub Actions setup needed

## Troubleshooting

### Deployment Failed

1. Check **Actions** tab for error logs
2. Verify secrets are set correctly
3. Check if hosting platforms are connected

### Update Secrets

1. Go to Settings → Secrets and variables → Actions
2. Click on the secret name
3. Update value
4. Re-run failed workflow

## Cost

- **GitHub Actions**: 2,000 minutes/month free
- **Render**: Free tier (permanent)
- **Vercel**: Free tier (permanent)
- **Total**: $0/month forever

## Summary

**One-time setup:**
1. Connect Render to GitHub (5 minutes)
2. Connect Vercel to GitHub (5 minutes)
3. Add secrets to GitHub (2 minutes)

**After setup:**
- Just `git push` and everything deploys automatically!
- Never visit Render or Vercel websites again
- Manage everything from GitHub

## Next Steps

After setup:
1. Push code to GitHub
2. Check Actions tab for deployment status
3. Visit your deployed URLs:
   - Frontend: `https://codemapr.vercel.app`
   - Backend: `https://codemapr-backend.onrender.com`

That's it! Your app is live and auto-deploys on every push! 🚀
