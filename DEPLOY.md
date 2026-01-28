# Deployment Guide

## Frontend Deployment (Firebase Hosting)

### Prerequisites
1. Firebase CLI installed: `npm install -g firebase-tools`
2. Firebase account: https://firebase.google.com

### Steps

1. **Login to Firebase:**
   ```bash
   firebase login
   ```

2. **Create a Firebase project** (if you don't have one):
   - Go to https://console.firebase.google.com
   - Click "Add project"
   - Follow the setup wizard

3. **Initialize Firebase in your project:**
   ```bash
   cd frontend
   firebase init hosting
   ```
   
   When prompted:
   - Select your Firebase project
   - Public directory: `dist` (Vite build output)
   - Single-page app: Yes
   - Set up automatic builds: No (we'll build manually)

4. **Update environment variables for production:**
   
   Create `frontend/.env.production`:
   ```env
   VITE_API_URL=https://your-backend-url.com
   VITE_SUPABASE_URL=https://lzidxoqkwppsquohirxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6aWR4b3Frd3Bwc3F1b2hpcnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNDkzMTEsImV4cCI6MjA4MzcyNTMxMX0.g4L0x5k7SeweXNlfXB1zPr3KBAkGsgHVl8-hr88GAFg
   ```

5. **Build and deploy:**
   ```bash
   cd frontend
   npm run build
   firebase deploy --only hosting
   ```

## Backend Deployment

Firebase Hosting is for static sites only. Your FastAPI backend needs separate hosting.

### Recommended Options:

#### Option 1: Railway (Easiest)
1. Go to https://railway.app
2. Create new project
3. Connect your GitHub repo
4. Add PostgreSQL service (or use Supabase)
5. Set environment variables
6. Deploy

#### Option 2: Render
1. Go to https://render.com
2. Create new Web Service
3. Connect GitHub repo
4. Build command: `cd backend && pip install -r requirements.txt`
5. Start command: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Set environment variables

#### Option 3: Google Cloud Run
1. Go to https://cloud.google.com/run
2. Create Dockerfile for backend
3. Deploy container
4. Set environment variables

### Backend Environment Variables Needed:
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- DATABASE_URL (with pooler connection string)
- QDRANT_URL
- QDRANT_API_KEY
- OPENROUTER_API_KEY
- USE_OPENROUTER=true
- ADZUNA_APP_ID
- ADZUNA_API_KEY

## Quick Deploy Commands

### Frontend (Firebase):
```bash
cd frontend
npm run build
firebase deploy --only hosting
```

### Backend (Example for Railway):
```bash
# After setting up Railway, just push to GitHub
git push origin main
```

## Post-Deployment

1. Update frontend `.env.production` with your backend URL
2. Rebuild and redeploy frontend
3. Test all features
4. Set up custom domain (optional)
