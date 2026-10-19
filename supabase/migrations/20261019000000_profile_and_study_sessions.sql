-- StudyPilot Schema Migration: Compact Profile Details, Task Completed Timestamp, & Study Sessions
-- Version: 20261019000000
-- Description: Adds course/academic_year to profiles, completed_at to tasks, and creates study_sessions table with RLS

-- 1. Extend profiles table with course and academic_year
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS course TEXT,
ADD COLUMN IF NOT EXISTS academic_year TEXT;

-- 2. Extend tasks table with completed_at timestamp for accurate weekly completion tracking
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 3. Create study_sessions table for tracking recorded study time
CREATE TABLE IF NOT EXISTS public.study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT 'Study Session',
    duration_minutes NUMERIC(6,2) NOT NULL CHECK (duration_minutes > 0),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security on study_sessions
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for study_sessions: owner-only access
DROP POLICY IF EXISTS "Users can view own study sessions" ON public.study_sessions;
CREATE POLICY "Users can view own study sessions"
    ON public.study_sessions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own study sessions" ON public.study_sessions;
CREATE POLICY "Users can insert own study sessions"
    ON public.study_sessions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own study sessions" ON public.study_sessions;
CREATE POLICY "Users can delete own study sessions"
    ON public.study_sessions FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON public.study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_started_at ON public.study_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON public.tasks(completed_at);
