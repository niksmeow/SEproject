# Deployment Checklist

## ✅ Completed Setup

- [x] Firebase CLI installed
- [x] `firebase.json` configured
- [x] Frontend build successful
- [x] `.env.production` created
- [x] Backend Dockerfile created
- [x] Railway deployment guide created

## 📋 Deployment Steps

### Frontend (Firebase Hosting)

1. **Login to Firebase:**
   ```bash
   firebase login
   ```

2. **Initialize Firebase project:**
   ```bash
   firebase init hosting
   ```
   - Select/create Firebase project
   - Public directory: `frontend/dist`
   - Single-page app: Yes

3. **Update `.env.production`** with your backend URL (after backend is deployed)

4. **Build and deploy:**
   ```bash
   cd frontend
   npm run build
   firebase deploy --only hosting
   ```

### Backend (Railway/Render/Cloud Run)

1. **Deploy backend** using Railway (see `RAILWAY_DEPLOY.md`)

2. **Get backend URL** (e.g., `https://your-app.railway.app`)

3. **Update frontend `.env.production`:**
   ```
   VITE_API_URL=https://your-app.railway.app
   ```

4. **Update backend CORS** in `backend/app/main.py`:
   ```python
   allow_origins=[
       "http://localhost:3000",
       "http://localhost:3001",
       "https://your-firebase-app.web.app",
       "https://your-firebase-app.firebaseapp.com",
   ]
   ```

5. **Rebuild and redeploy frontend**

## 🔧 Environment Variables

### Frontend (`.env.production`)
- `VITE_API_URL` - Your deployed backend URL
- `VITE_SUPABASE_URL` - Already set
- `VITE_SUPABASE_ANON_KEY` - Already set

### Backend (Railway/Render)
All variables from `backend/.env` - see `RAILWAY_DEPLOY.md`

## 🚀 Quick Deploy Commands

```bash
# Frontend
cd frontend
npm run build
firebase deploy --only hosting

# Backend (after Railway setup)
git push origin main  # Auto-deploys if connected
```
