# CareerOS

An AI-powered resume → job matching → learning roadmap platform.

## Features

- 🔍 **Skill Gap Analysis:** Analyze your resume against job descriptions to identify missing skills
- 📚 **Personalized Upskilling:** Receive curated course recommendations to bridge your skill gaps
- ⚡ **Fast and Efficient:** Get results in seconds and take actionable steps towards your career goals
- 🎯 **ATS-Optimized Resumes:** Generate job-specific resume versions
- 🗺️ **Learning Roadmaps:** Interactive mind maps showing the path to unlock your dream job

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, Shadcn UI
- **Backend:** FastAPI, Python
- **Database:** PostgreSQL (Supabase), Qdrant (Vector DB)
- **Auth:** Supabase Auth
- **AI:** OpenAI GPT-4, Sentence Transformers

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Supabase account
- OpenAI API key
- Qdrant (local or cloud)

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd careeros
```

2. Set up environment variables:
```bash
cp .env.example .env
# Fill in your Supabase, OpenAI, and Qdrant credentials
```

3. Install frontend dependencies:
```bash
cd frontend
npm install
```

4. Install backend dependencies:
```bash
cd ../backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

5. Set up database:
```bash
# Run migrations
alembic upgrade head
```

6. Start the development servers:

Frontend:
```bash
cd frontend
npm run dev
```

Backend:
```bash
cd backend
python -m uvicorn app.main:app --reload
```

## Project Structure

```
careeros/
├── frontend/          # Next.js frontend
├── backend/           # FastAPI backend
├── ai/                # AI services
└── db/                # Database migrations
```

## License

MIT
