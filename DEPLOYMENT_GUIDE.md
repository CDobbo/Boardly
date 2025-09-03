# Boardly Deployment Guide

## Current Status
- ✅ Project is ready for deployment
- ✅ Delete confirmation dialogs implemented
- ✅ ESLint configured
- ✅ GitHub Actions CI/CD set up
- ✅ Deployment files created

## Files Created for Deployment
- `render.yaml` - Render backend configuration
- `frontend/vercel.json` - Vercel frontend configuration  
- `frontend/.env.production` - Production environment variables
- Backend database path updated for Render persistent disk

## 🚀 Deployment Instructions

### Step 1: Deploy Backend to Render.com

1. **Sign up at [render.com](https://render.com)** (free account)

2. **Connect your GitHub repository:**
   - Click "New +" → "Web Service"
   - Connect GitHub account
   - Select the "Boardly" repository

3. **Configure the backend service:**
   - **Name:** boardly-backend (or your choice)
   - **Root Directory:** `backend`
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   
4. **Add environment variables:**
   ```
   NODE_ENV=production
   JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
   PORT=10000
   ```

5. **Add persistent disk (for SQLite):**
   - Click "Add Disk"
   - Mount Path: `/var/data`
   - Size: 1GB (free tier)

6. **Deploy and wait** for the service to be live
   - Copy your backend URL (e.g., `https://boardly-backend.onrender.com`)

### Step 2: Deploy Frontend to Vercel

1. **Sign up at [vercel.com](https://vercel.com)** (free account)

2. **Import your GitHub repository:**
   - Click "Add New..." → "Project"
   - Import the Boardly repository

3. **Configure the deployment:**
   - **Framework Preset:** Create React App
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`

4. **Add environment variable:**
   ```
   REACT_APP_API_URL=https://YOUR-BACKEND-URL.onrender.com/api
   ```
   ⚠️ Replace with your actual Render backend URL from Step 1

5. **Deploy!**
   - Your frontend will be available at `https://your-app.vercel.app`

### Step 3: Update Frontend with Backend URL

1. After backend is deployed, go to Vercel dashboard
2. Settings → Environment Variables
3. Update `REACT_APP_API_URL` with your actual backend URL
4. Trigger a redeploy (Deployments → Redeploy)

## 📝 Important Notes

### Database Persistence
- Render free tier spins down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds
- SQLite data persists on the mounted disk at `/var/data`

### Free Tier Limits
- **Render:** 750 hours/month, auto-sleeps when inactive
- **Vercel:** Unlimited for personal projects
- Both are perfect for single-user applications

### After Deployment

1. **Test your live app:**
   - Go to your Vercel URL
   - Login with your credentials
   - All features should work as in local development

2. **Monitor:**
   - Render dashboard shows logs and metrics
   - Vercel dashboard shows deployment status

3. **Updates:**
   - Push to GitHub main branch
   - Both services auto-deploy on push

## 🔧 Troubleshooting

### Backend Issues
- Check Render logs for errors
- Ensure environment variables are set
- Verify persistent disk is mounted

### Frontend Issues  
- Check browser console for API errors
- Verify REACT_APP_API_URL is correct
- Check Vercel function logs

### CORS Issues
- Backend already has CORS configured
- Should work with any Vercel domain

## 🎯 Next Steps After Restart

1. Commit and push all changes:
   ```bash
   git add .
   git commit -m "Add deployment configuration"
   git push origin main
   ```

2. Follow the deployment steps above
3. Your app will be live in ~15-20 minutes!

## 💡 Alternative Deployment Options

If Render/Vercel doesn't work for you:

1. **Railway.app** - All-in-one platform
2. **Netlify + Supabase** - If you want PostgreSQL
3. **GitHub Pages + Render** - GitHub Pages for frontend
4. **Fly.io** - More technical but very flexible

## 📚 Relevant Files to Check

- `backend/src/db/init.js` - Database path configuration
- `frontend/src/lib/api.ts` - API URL configuration  
- `render.yaml` - Render configuration
- `frontend/vercel.json` - Vercel configuration
- `.github/workflows/` - CI/CD pipelines

---

**Created:** ${new Date().toLocaleString()}
**Status:** Ready for deployment after system restart
**Contact:** All code and configuration committed to GitHub