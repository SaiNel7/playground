-- ============================================================
-- 001_initial_schema.sql
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-creates a user_profile row when a new auth user signs up.
-- Also enforces the .edu email restriction at the DB layer (defense in depth).
-- Primary enforcement is in the app layer (auth/actions.ts + OAuth callback).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email NOT LIKE '%.edu' THEN
    RAISE EXCEPTION 'Only .edu email addresses are allowed.';
  END IF;

  INSERT INTO public.user_profiles (id, email)
  VALUES (NEW.id, NEW.email);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TABLES
-- ============================================================

-- Extends auth.users with subscription/trial info
CREATE TABLE public.user_profiles (
  id                  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT        NOT NULL,
  subscription_status TEXT        NOT NULL DEFAULT 'free_trial'
                                  CHECK (subscription_status IN ('free_trial', 'active', 'cancelled', 'expired')),
  trial_ends_at       TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  stripe_customer_id  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.documents (
  id         UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT    NOT NULL DEFAULT 'Untitled',
  content    JSONB   NOT NULL DEFAULT '{"type": "doc", "content": [{"type": "paragraph"}]}',
  starred    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One brain per document (enforced by UNIQUE on document_id)
CREATE TABLE public.project_brains (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL UNIQUE REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal        TEXT NOT NULL DEFAULT '',
  constraints JSONB NOT NULL DEFAULT '[]',
  glossary    JSONB NOT NULL DEFAULT '[]',
  decisions   JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.comment_threads (
  id               UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id      UUID    NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id          UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  highlighted_text TEXT    NOT NULL DEFAULT '',
  resolved         BOOLEAN NOT NULL DEFAULT FALSE,
  is_ai_thread     BOOLEAN NOT NULL DEFAULT FALSE,
  ai_mode          TEXT    CHECK (ai_mode IN ('critique', 'synthesize')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.comment_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id   UUID NOT NULL REFERENCES public.comment_threads(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  author      TEXT NOT NULL CHECK (author IN ('user', 'ai')),
  status      TEXT CHECK (status IN ('pending', 'complete', 'error')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.ai_patches (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id   UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anchor_id     TEXT NOT NULL,
  original_text TEXT NOT NULL,
  proposed_text TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'rejected')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.user_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_brains   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_threads  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_patches       ENABLE ROW LEVEL SECURITY;

-- user_profiles
CREATE POLICY "Users can view own profile"   ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);

-- documents
CREATE POLICY "Users can view own documents"   ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON public.documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON public.documents FOR DELETE USING (auth.uid() = user_id);

-- project_brains
CREATE POLICY "Users can view own brains"   ON public.project_brains FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own brains" ON public.project_brains FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own brains" ON public.project_brains FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own brains" ON public.project_brains FOR DELETE USING (auth.uid() = user_id);

-- comment_threads
CREATE POLICY "Users can view own threads"   ON public.comment_threads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own threads" ON public.comment_threads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own threads" ON public.comment_threads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own threads" ON public.comment_threads FOR DELETE USING (auth.uid() = user_id);

-- comment_messages
CREATE POLICY "Users can view own messages"   ON public.comment_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own messages" ON public.comment_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own messages" ON public.comment_messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own messages" ON public.comment_messages FOR DELETE USING (auth.uid() = user_id);

-- ai_patches
CREATE POLICY "Users can view own patches"   ON public.ai_patches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own patches" ON public.ai_patches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own patches" ON public.ai_patches FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own patches" ON public.ai_patches FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_documents_user_id    ON public.documents(user_id);
CREATE INDEX idx_documents_updated_at ON public.documents(updated_at DESC);
CREATE INDEX idx_project_brains_document_id   ON public.project_brains(document_id);
CREATE INDEX idx_comment_threads_document_id  ON public.comment_threads(document_id);
CREATE INDEX idx_comment_messages_thread_id   ON public.comment_messages(thread_id);
CREATE INDEX idx_ai_patches_document_id ON public.ai_patches(document_id);
CREATE INDEX idx_ai_patches_anchor_id   ON public.ai_patches(anchor_id);
