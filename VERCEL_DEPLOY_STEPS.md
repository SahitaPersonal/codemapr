# Deploy Frontend to Vercel - Step by Step

## Quick Deploy via Vercel CLI

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```
This will open your browser to authenticate.

### Step 3: Deploy from Frontend Directory
```bash
cd packages/frontend
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N**
- What's your project's name? **codemapr** (or any name)
- In which directory is your code located? **./** (current directory)
- Want to override settings? **N**

### Step 4: Set Environment Variable
```bash
vercel env add NEXT_PUBLIC_API_URL
```
When prompted, enter: `https://codemapr-backend.onrender.com`
Select: **Production**

### Step 5: Deploy to Production
```bash
vercel --prod
```

## Or Use Vercel Website (Easier)

1. Go to https://vercel.com
2. Sign in with GitHub
3. Click "Add New" → "Project"
4. Import `codemapr` repository
5. Set Root Directory: `packages/frontend`
6. Add env var: `NEXT_PUBLIC_API_URL` = `https://codemapr-backend.onrender.com`
7. Click "Deploy"

Done! Your app will be live at `https://codemapr-[random].vercel.app`

## After Deployment

Your frontend will be available at:
- Production: `https://codemapr.vercel.app` (or similar)
- You can set a custom domain in Vercel settings

## Troubleshooting

### Build fails with "Cannot find module"
- Make sure Root Directory is set to `packages/frontend`
- Vercel should auto-detect Next.js

### API calls fail
- Check that `NEXT_PUBLIC_API_URL` environment variable is set
- Make sure backend is deployed and accessible
- Check browser console for CORS errors

### Need to redeploy?
```bash
cd packages/frontend
vercel --prod
```

Or just push to GitHub and Vercel auto-deploys!
