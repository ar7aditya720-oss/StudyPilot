-- StudyPilot Database Schema Migration
-- Version: 20261015000000
-- Description: Complete initial schema for StudyPilot (Profiles, Tasks, Preferences, Weekly Plans, Plan Items, Files, RLS, Storage)

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. PROFILES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'Asia/Kolkata',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Trigger to create a profile automatically when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, avatar_url, timezone)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        'Asia/Kolkata'
    )
    ON CONFLICT (id) DO UPDATE SET
        display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = now();
    
    -- Also initialize default preferences
    INSERT INTO public.user_preferences (user_id, weekly_available_hours, timezone)
    VALUES (NEW.id, 20.0, 'Asia/Kolkata')
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 2. USER PREFERENCES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    weekly_available_hours NUMERIC(5,2) NOT NULL DEFAULT 20.00 CHECK (weekly_available_hours > 0),
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    planner_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
    ON public.user_preferences FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
    ON public.user_preferences FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
    ON public.user_preferences FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 3. TASKS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Assignment',
    due_date DATE,
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
    total_units INTEGER NOT NULL DEFAULT 1 CHECK (total_units > 0),
    completed_units INTEGER NOT NULL DEFAULT 0 CHECK (completed_units >= 0 AND completed_units <= total_units),
    unit_label TEXT NOT NULL DEFAULT 'questions',
    estimated_hours NUMERIC(6,2) NOT NULL DEFAULT 1.00 CHECK (estimated_hours > 0),
    recurring BOOLEAN NOT NULL DEFAULT false,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks"
    ON public.tasks FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
    ON public.tasks FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
    ON public.tasks FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
    ON public.tasks FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ==============================================================================
-- 4. WEEKLY PLANS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.weekly_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    total_available_hours NUMERIC(5,2) NOT NULL CHECK (total_available_hours >= 0),
    total_allocated_hours NUMERIC(5,2) NOT NULL CHECK (total_allocated_hours >= 0),
    warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weekly_plans_user_id ON public.weekly_plans(user_id);

ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly plans"
    ON public.weekly_plans FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly plans"
    ON public.weekly_plans FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weekly plans"
    ON public.weekly_plans FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ==============================================================================
-- 5. PLAN ITEMS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.weekly_plans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    type TEXT,
    priority TEXT,
    due_date DATE,
    recurring BOOLEAN DEFAULT false,
    allocated_hours NUMERIC(5,2) NOT NULL CHECK (allocated_hours >= 0),
    remaining_hours NUMERIC(5,2) NOT NULL CHECK (remaining_hours >= 0),
    rank INTEGER NOT NULL DEFAULT 1,
    rationale TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_items_plan_id ON public.plan_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_items_user_id ON public.plan_items(user_id);

ALTER TABLE public.plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plan items"
    ON public.plan_items FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.weekly_plans
            WHERE public.weekly_plans.id = public.plan_items.plan_id
            AND public.weekly_plans.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own plan items"
    ON public.plan_items FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.weekly_plans
            WHERE public.weekly_plans.id = public.plan_items.plan_id
            AND public.weekly_plans.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own plan items"
    ON public.plan_items FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ==============================================================================
-- 6. UPLOADED FILES TABLE (Storage Metadata)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.uploaded_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
    status TEXT NOT NULL DEFAULT 'uploaded',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON public.uploaded_files(user_id);

ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own uploaded files metadata"
    ON public.uploaded_files FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own uploaded files metadata"
    ON public.uploaded_files FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own uploaded files metadata"
    ON public.uploaded_files FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own uploaded files metadata"
    ON public.uploaded_files FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ==============================================================================
-- 7. STORAGE BUCKET & POLICIES (study-documents)
-- ==============================================================================
-- Create the private bucket 'study-documents' if not already created
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'study-documents',
    'study-documents',
    false,
    10485760, -- 10MB limit per file
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/png',
        'image/jpeg',
        'text/plain',
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/png',
        'image/jpeg',
        'text/plain',
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

-- Storage Row Level Security: Objects must be organized in folders by user ID: <user_id>/<file_name>
CREATE POLICY "Users can view own storage objects"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'study-documents' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can upload own storage objects"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'study-documents' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update own storage objects"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'study-documents' AND
        (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'study-documents' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete own storage objects"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'study-documents' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Helper function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_tasks_updated_at ON public.tasks;
CREATE TRIGGER set_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER set_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
