-- Additive enrollment fields on the existing accounts. No existing password,
-- role, account, study, permission, attempt or result is updated.
ALTER TABLE public.ceb_users
 ADD COLUMN IF NOT EXISTS given_name text,
 ADD COLUMN IF NOT EXISTS surname text,
 ADD COLUMN IF NOT EXISTS date_of_birth date,
 ADD COLUMN IF NOT EXISTS password_admin_managed boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS profile_revision integer NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS public.ceb_student_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 student_id uuid NOT NULL REFERENCES public.ceb_users(id),
 actor_id uuid NOT NULL REFERENCES public.ceb_users(id),
 action text NOT NULL CHECK(action IN ('create','update','password_reset','deactivate')),
 changed_fields jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ceb_quiz_ai_usage (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.ceb_users(id),
 study_id uuid NOT NULL REFERENCES public.ceb_studies(id),
 model text NOT NULL,
 status text NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','succeeded','failed')),
 prompt_tokens integer,
 completion_tokens integer,
 created_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS ceb_quiz_ai_usage_day ON public.ceb_quiz_ai_usage(created_at,user_id);
GRANT SELECT,INSERT ON public.ceb_student_audit TO ceb_api_user;
GRANT SELECT,INSERT,UPDATE ON public.ceb_quiz_ai_usage TO ceb_api_user;
CREATE OR REPLACE FUNCTION public.ceb_student_audit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Student audit is append-only'; END;
$$;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='ceb_student_audit_immutable' AND tgrelid='public.ceb_student_audit'::regclass) THEN
  CREATE TRIGGER ceb_student_audit_immutable BEFORE UPDATE OR DELETE ON public.ceb_student_audit FOR EACH ROW EXECUTE FUNCTION public.ceb_student_audit_immutable();
 END IF;
END $$;
