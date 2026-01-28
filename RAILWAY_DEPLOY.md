# Deploy Backend to Railway

## Quick Setup

1. **Go to Railway**: https://railway.app
2. **Sign up/Login** with GitHub
3. **New Project** → **Deploy from GitHub repo**
4. **Select your repository**
5. **Add Service** → **Empty Service** (or use the generated one)

## Configuration

### Environment Variables

Add these in Railway dashboard → Variables:

```
SUPABASE_URL=https://lzidxoqkwppsquohirxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6aWR4b3Frd3Bwc3F1b2hpcnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNDkzMTEsImV4cCI6MjA4MzcyNTMxMX0.g4L0x5k7SeweXNlfXB1zPr3KBAkGsgHVl8-hr88GAFg
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6aWR4b3Frd3Bwc3F1b2hpcnh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE0OTMxMSwiZXhwIjoyMDgzNzI1MzExfQ.UxfqIYzUpe4eEG2yCqt6Pc_T2DS612042YO8hHc7QPU
DATABASE_URL=postgresql://postgres.lzidxoqkwppsquohirxx:bojhik-qaKkyj-0kabtu@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
QDRANT_URL=https://57ad57fd-286c-4ae4-b403-331b468703b6.europe-west3-0.gcp.cloud.qdrant.io
QDRANT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.3TnRbTrx3toi4zk0PRBw1K00l41exmIaenFaBHpHPHo
OPENROUTER_API_KEY=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
USE_OPENROUTER=true
ADZUNA_APP_ID=31be7a2c
ADZUNA_API_KEY=3459b9128582eace485d9c4030e48861
ADZUNA_COUNTRY=us
ENVIRONMENT=production
```

### Build Settings

- **Root Directory**: `backend`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Or Use Dockerfile

If Railway detects the Dockerfile in `backend/`, it will use it automatically.

## After Deployment

1. Railway will give you a URL like: `https://your-app.railway.app`
2. Update `frontend/.env.production`:
   ```
   VITE_API_URL=https://your-app.railway.app
   ```
3. Rebuild and redeploy frontend:
   ```bash
   cd frontend
   npm run build
   firebase deploy --only hosting
   ```

## CORS Configuration

Make sure your backend CORS allows your Firebase domain. Update `backend/app/main.py`:

```python
allow_origins=[
    "http://localhost:3000",
    "http://localhost:3001",
    "https://your-firebase-app.web.app",  # Add your Firebase domain
    "https://your-firebase-app.firebaseapp.com"
]
```
