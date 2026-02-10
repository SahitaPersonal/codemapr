# Monorepo Build Fix for Render Deployment

## Problem
Render build was failing with error:
```
Cannot find module '@codemapr/shared' or its corresponding type declarations.
```

## Root Cause
The `@codemapr/shared` package is a **local monorepo package** (not an npm package). The backend depends on it via:
```json
"@codemapr/shared": "file:../shared"
```

The previous build command was trying to build packages individually without properly handling the monorepo workspace structure.

## Solution
Use npm workspaces to build the entire monorepo correctly:

### Updated Build Commands

**Backend (render.yaml):**
```bash
npm install --workspaces && npm run build --workspace=packages/shared && npm run build --workspace=packages/backend
```

**Frontend (render.yaml):**
```bash
npm install --workspaces && npm run build --workspace=packages/shared && npm run build --workspace=packages/frontend
```

### Why This Works

1. `npm install --workspaces` - Installs all dependencies for all packages in the monorepo, including linking local packages
2. `npm run build --workspace=packages/shared` - Builds the shared package first (creates dist/ folder)
3. `npm run build --workspace=packages/backend` - Builds the backend, which can now find the compiled shared package

## Files Updated
- `render.yaml` - Updated build commands for both services
- `GITHUB_DEPLOYMENT.md` - Updated setup instructions with correct build commands

## Testing the Fix

### Local Test
```bash
# Clean everything
rm -rf node_modules packages/*/node_modules packages/*/dist

# Test the build command
npm install --workspaces
npm run build --workspace=packages/shared
npm run build --workspace=packages/backend

# Should complete without errors
```

### Render Deployment
1. Push changes to GitHub
2. Render will automatically detect the changes and redeploy
3. Or manually trigger deploy from Render dashboard

## Verification
After deployment succeeds:
- Backend health check: `https://codemapr-backend.onrender.com/health`
- Should return: `{"status":"ok"}`

## Next Steps
1. Commit and push these changes
2. Monitor Render deployment in dashboard or GitHub Actions
3. Once backend deploys successfully, update frontend env var `NEXT_PUBLIC_API_URL`
4. Deploy frontend to Vercel
