-- Additive: no existing rows or tables are changed. No cascading deletes.
CREATE TABLE IF NOT EXISTS public.ceb_quizzes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 study_id uuid NOT NULL UNIQUE REFERENCES public.ceb_studies(id),
 revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
 definition jsonb NOT NULL DEFAULT '{}'::jsonb,
 reviewed boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ceb_quiz_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 quiz_id uuid NOT NULL REFERENCES public.ceb_quizzes(id),
 revision integer NOT NULL,
 definition jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(quiz_id, revision)
);
CREATE TABLE IF NOT EXISTS public.ceb_quiz_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 quiz_id uuid NOT NULL REFERENCES public.ceb_quizzes(id),
 version_id uuid NOT NULL REFERENCES public.ceb_quiz_versions(id),
 user_id uuid NOT NULL REFERENCES public.ceb_users(id),
 answers jsonb NOT NULL DEFAULT '[]'::jsonb,
 started_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 submitted_at timestamptz,
 correct integer,
 score numeric(10,2),
 maximum numeric(10,2),
 percent numeric(6,2),
 draft_revision integer NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS ceb_quiz_one_open_attempt ON public.ceb_quiz_attempts(quiz_id,user_id) WHERE submitted_at IS NULL;
CREATE INDEX IF NOT EXISTS ceb_quiz_attempt_history ON public.ceb_quiz_attempts(quiz_id,user_id,started_at);
CREATE TABLE IF NOT EXISTS public.ceb_quiz_grants (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 quiz_id uuid NOT NULL REFERENCES public.ceb_quizzes(id),
 user_id uuid NOT NULL REFERENCES public.ceb_users(id),
 granted_by uuid NOT NULL REFERENCES public.ceb_users(id),
 attempt_id uuid UNIQUE REFERENCES public.ceb_quiz_attempts(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ceb_quiz_one_unused_grant ON public.ceb_quiz_grants(quiz_id,user_id) WHERE attempt_id IS NULL;
GRANT SELECT, INSERT, UPDATE ON public.ceb_quizzes, public.ceb_quiz_attempts, public.ceb_quiz_grants TO ceb_api_user;
GRANT SELECT, INSERT ON public.ceb_quiz_versions TO ceb_api_user;

-- The existing API role has inherited privileges. Preserve that role unchanged;
-- enforce history preservation on these new tables as well as in the API.
CREATE OR REPLACE FUNCTION public.ceb_quiz_version_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Quiz versions are append-only';
END;
$$;
CREATE OR REPLACE FUNCTION public.ceb_quiz_attempt_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Quiz attempts cannot be deleted'; END IF;
 IF OLD.submitted_at IS NOT NULL THEN RAISE EXCEPTION 'Submitted quiz attempts are immutable'; END IF;
 RETURN NEW;
END;
$$;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='ceb_quiz_version_immutable' AND tgrelid='public.ceb_quiz_versions'::regclass) THEN
  CREATE TRIGGER ceb_quiz_version_immutable BEFORE UPDATE OR DELETE ON public.ceb_quiz_versions FOR EACH ROW EXECUTE FUNCTION public.ceb_quiz_version_immutable();
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='ceb_quiz_attempt_history' AND tgrelid='public.ceb_quiz_attempts'::regclass) THEN
  CREATE TRIGGER ceb_quiz_attempt_history BEFORE UPDATE OR DELETE ON public.ceb_quiz_attempts FOR EACH ROW EXECUTE FUNCTION public.ceb_quiz_attempt_history();
 END IF;
END $$;
