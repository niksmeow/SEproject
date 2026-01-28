# Environment Variables Setup

## Backend `.env` file

Create `backend/.env` with the following content:

```env
# Supabase (Authentication + Database)
SUPABASE_URL=https://lzidxoqkwppsquohirxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6aWR4b3Frd3Bwc3F1b2hpcnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNDkzMTEsImV4cCI6MjA4MzcyNTMxMX0.g4L0x5k7SeweXNlfXB1zPr3KBAkGsgHVl8-hr88GAFg
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6aWR4b3Frd3Bwc3F1b2hpcnh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE0OTMxMSwiZXhwIjoyMDgzNzI1MzExfQ.UxfqIYzUpe4eEG2yCqt6Pc_T2DS612042YO8hHc7QPU

# Database (Supabase PostgreSQL)
# Get your database password from Supabase Dashboard > Settings > Database
# Replace [YOUR-PASSWORD] with your actual database password
DATABASE_URL=postgresql://postgres:bojhik-qaKkyj-0kabtu@db.lzidxoqkwppsquohirxx.supabase.co:5432/postgres

# Qdrant (Vector Database - Cloud)
QDRANT_URL=https://lzidxoqkwppsquohirxx.qdrant.io
QDRANT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.3TnRbTrx3toi4zk0PRBw1K00l41exmIaenFaBHpHPHo

# OpenRouter (AI API - OpenAI compatible)
OPENROUTER_API_KEY=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
USE_OPENROUTER=true

# Adzuna (Job Search)
ADZUNA_APP_ID=31be7a2c
ADZUNA_API_KEY=3459b9128582eace485d9c4030e48861
ADZUNA_COUNTRY=us

# App
API_URL=http://localhost:8000
ENVIRONMENT=development
```

**Important:** Replace `[YOUR-PASSWORD]` in `DATABASE_URL` with your actual Supabase database password.

## Frontend `.env.local` file

Create `frontend/.env.local` with the following content:

```env
# Supabase (Public keys only)
NEXT_PUBLIC_SUPABASE_URL=https://lzidxoqkwppsquohirxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6aWR4b3Frd3Bwc3F1b2hpcnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNDkzMTEsImV4cCI6MjA4MzcyNTMxMX0.g4L0x5k7SeweXNlfXB1zPr3KBAkGsgHVl8-hr88GAFg

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Quick Setup Commands

```bash
# Create backend .env
cat > backend/.env << 'EOF'
SUPABASE_URL=https://lzidxoqkwppsquohirxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6aWR4b3Frd3Bwc3F1b2hpcnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNDkzMTEsImV4cCI6MjA4MzcyNTMxMX0.g4L0x5k7SeweXNlfXB1zPr3KBAkGsgHVl8-hr88GAFg
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6aWR4b3Frd3Bwc3F1b2hpcnh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE0OTMxMSwiZXhwIjoyMDgzNzI1MzExfQ.UxfqIYzUpe4eEG2yCqt6Pc_T2DS612042YO8hHc7QPU
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.lzidxoqkwppsquohirxx.supabase.co:5432/postgres
QDRANT_URL=https://lzidxoqkwppsquohirxx.qdrant.io
QDRANT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.3TnRbTrx3toi4zk0PRBw1K00l41exmIaenFaBHpHPHo
OPENROUTER_API_KEY=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
USE_OPENROUTER=true
ADZUNA_APP_ID=31be7a2c
ADZUNA_API_KEY=3459b9128582eace485d9c4030e48861
ADZUNA_COUNTRY=us
API_URL=http://localhost:8000
ENVIRONMENT=development
EOF

# Create frontend .env.local
cat > frontend/.env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://lzidxoqkwppsquohirxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6aWR4b3Frd3Bwc3F1b2hpcnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNDkzMTEsImV4cCI6MjA4MzcyNTMxMX0.g4L0x5k7SeweXNlfXB1zPr3KBAkGsgHVl8-hr88GAFg
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF
```

## Next Steps

1. **Get your Supabase database password:**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project
   - Go to Settings → Database
   - Copy your database password
   - Replace `[YOUR-PASSWORD]` in `backend/.env`

2. **Set up Qdrant URL:**
   - If using Qdrant Cloud, the URL should be `https://[your-cluster-id].qdrant.io`
   - If you're not sure, check your Qdrant Cloud dashboard
   - For local development, use `http://localhost:6333` and remove the API key

3. **Run database migrations:**
   - In Supabase Dashboard → SQL Editor
   - Run the SQL from `db/init.sql`

4. **Start the application:**
   ```bash
   # Backend
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   python -m uvicorn app.main:app --reload
   
   # Frontend (in another terminal)
   cd frontend
   npm install
   npm run dev
   ```
