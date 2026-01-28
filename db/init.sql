-- CareerOS Database Schema
-- Note: Supabase manages auth.users table automatically

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    job_search_preferences JSONB,
    notification_settings JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resumes
CREATE TABLE IF NOT EXISTS resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    original_file_path TEXT NOT NULL,
    parsed_data JSONB,
    skills TEXT[],
    experience JSONB,
    projects JSONB,
    embedding_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    description TEXT NOT NULL,
    source TEXT NOT NULL,
    url TEXT,
    location TEXT,
    required_skills TEXT[],
    embedding_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job matches
CREATE TABLE IF NOT EXISTS job_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    job_id UUID NOT NULL REFERENCES jobs(id),
    resume_id UUID NOT NULL REFERENCES resumes(id),
    match_score TEXT NOT NULL,
    classification TEXT NOT NULL,
    missing_skills TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optimized resumes
CREATE TABLE IF NOT EXISTS optimized_resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    job_id UUID NOT NULL REFERENCES jobs(id),
    resume_id UUID NOT NULL REFERENCES resumes(id),
    content TEXT NOT NULL,
    file_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roadmaps
CREATE TABLE IF NOT EXISTS roadmaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    job_id UUID NOT NULL REFERENCES jobs(id),
    roadmap_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applications
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    job_id UUID NOT NULL REFERENCES jobs(id),
    resume_id UUID NOT NULL REFERENCES resumes(id),
    application_type TEXT NOT NULL, -- 'external' or 'easy_apply'
    status TEXT NOT NULL DEFAULT 'submitted', -- 'submitted', 'viewed', 'shortlisted', 'rejected'
    external_url TEXT, -- For external apply, the ATS URL
    answers JSONB, -- For easy apply, form answers
    resume_snapshot JSONB, -- Snapshot of resume used
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_user_id ON job_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_job_id ON job_matches(job_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_resume_id ON job_matches(resume_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);

-- Row Level Security (RLS) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimized_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own resumes" ON resumes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resumes" ON resumes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own resumes" ON resumes
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own jobs" ON jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs" ON jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own jobs" ON jobs
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own job matches" ON job_matches
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own optimized resumes" ON optimized_resumes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own roadmaps" ON roadmaps
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own applications" ON applications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own applications" ON applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);
