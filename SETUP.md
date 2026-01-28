# CareerOS Setup Guide

## Prerequisites

1. **Node.js 18+** - [Download](https://nodejs.org/)
2. **Python 3.11+** - [Download](https://www.python.org/)
3. **Supabase Account** - [Sign up](https://supabase.com)
4. **OpenAI API Key** - [Get one](https://platform.openai.com/)
5. **Qdrant** - Use Docker or Qdrant Cloud

## Step 1: Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Go to Project Settings > API
3. Copy your:
   - Project URL
   - Anon (public) key
   - Service role key (keep this secret!)
4. Go to Authentication > Providers
   - Enable Email provider
   - Enable Google OAuth (optional)
   - Enable GitHub OAuth (optional)
5. Go to SQL Editor and run the SQL from `db/init.sql`

## Step 2: Environment Variables

### Backend (.env in backend/ directory)

```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
DATABASE_URL=postgresql://postgres:xxx@xxx.supabase.co:5432/postgres

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

# OpenAI
OPENAI_API_KEY=sk-xxx

# App
API_URL=http://localhost:8000
```

### Frontend (.env.local in frontend/ directory)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Step 3: Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install spaCy model
python -m spacy download en_core_web_sm

# Install Playwright browsers (for job crawling)
playwright install chromium

# Run database migrations
alembic upgrade head

# Start the server
python -m uvicorn app.main:app --reload
```

Backend will run on http://localhost:8000

## Step 4: Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run on http://localhost:3000

## Step 5: Qdrant Setup

### Option A: Docker (Recommended for development)

```bash
docker-compose up -d
```

### Option B: Qdrant Cloud

1. Sign up at https://cloud.qdrant.io
2. Create a cluster
3. Get your API key and URL
4. Update `QDRANT_URL` and `QDRANT_API_KEY` in backend `.env`

## Step 6: Verify Installation

1. Open http://localhost:3000
2. Sign up for an account
3. Verify your email
4. Upload a resume
5. Add a job
6. View matches and generate roadmaps

## Troubleshooting

### Backend Issues

- **Import errors**: Make sure you're in the virtual environment
- **Database connection**: Check your Supabase DATABASE_URL
- **spaCy model**: Run `python -m spacy download en_core_web_sm`
- **Qdrant connection**: Ensure Qdrant is running on port 6333

### Frontend Issues

- **Supabase errors**: Verify your environment variables
- **API errors**: Check that backend is running on port 8000
- **Build errors**: Delete `.next` folder and run `npm install` again

### Common Issues

- **CORS errors**: Backend CORS is configured for localhost:3000
- **Auth errors**: Check Supabase project settings and email templates
- **File upload errors**: Ensure `uploads/` directory exists in backend

## Production Deployment

### Backend

Deploy to Railway, Render, or Fly.io:
1. Set environment variables
2. Install dependencies
3. Run migrations: `alembic upgrade head`
4. Start with: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Frontend

Deploy to Vercel:
1. Connect your GitHub repo
2. Set environment variables
3. Deploy automatically

### Database

Use Supabase's managed PostgreSQL (already configured)

### Qdrant

Use Qdrant Cloud for production

## Support

For issues or questions, check the README.md or open an issue on GitHub.
