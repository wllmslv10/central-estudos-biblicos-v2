-- ONLY on the existing validation branch br-falling-thunder-b4saoifs.
-- Schema-only copies: no user, lesson, session, quiz or original rows are copied.
BEGIN;
CREATE SCHEMA IF NOT EXISTS ceb_lab_20261105;
DO $$
DECLARE t text; c record;
BEGIN
 FOREACH t IN ARRAY ARRAY['ceb_users','ceb_studies','ceb_sessions','ceb_login_attempts','ceb_folders','ceb_materials','ceb_quizzes','ceb_quiz_versions','ceb_quiz_attempts','ceb_quiz_grants'] LOOP
  EXECUTE format('CREATE TABLE IF NOT EXISTS ceb_lab_20261105.%I (LIKE public.%I INCLUDING ALL)',t,t);
 END LOOP;
 FOR c IN SELECT cl.relname,co.conname,pg_get_constraintdef(co.oid) AS definition FROM pg_constraint co JOIN pg_class cl ON cl.oid=co.conrelid JOIN pg_namespace n ON n.oid=cl.relnamespace WHERE n.nspname='public' AND co.contype='f' AND cl.relname IN ('ceb_studies','ceb_sessions','ceb_folders','ceb_materials','ceb_quizzes','ceb_quiz_versions','ceb_quiz_attempts','ceb_quiz_grants') LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_constraint co JOIN pg_class cl ON cl.oid=co.conrelid JOIN pg_namespace n ON n.oid=cl.relnamespace WHERE n.nspname='ceb_lab_20261105' AND cl.relname=c.relname AND co.conname=c.conname) THEN
   -- pg_get_constraintdef omits public when visible on search_path.
   EXECUTE format('SET LOCAL search_path TO ceb_lab_20261105');
   EXECUTE format('ALTER TABLE ceb_lab_20261105.%I ADD CONSTRAINT %I %s',c.relname,c.conname,replace(c.definition,'public.','ceb_lab_20261105.'));
  END IF;
 END LOOP;
END $$;
CREATE SEQUENCE IF NOT EXISTS ceb_lab_20261105.ceb_login_attempts_id_seq;
ALTER TABLE ceb_lab_20261105.ceb_login_attempts ALTER COLUMN id SET DEFAULT nextval('ceb_lab_20261105.ceb_login_attempts_id_seq');

-- Additive: no existing rows or tables are changed. No cascading deletes.
CREATE TABLE IF NOT EXISTS ceb_lab_20261105.ceb_quizzes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 study_id uuid NOT NULL UNIQUE REFERENCES ceb_lab_20261105.ceb_studies(id),
 revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
 definition jsonb NOT NULL DEFAULT '{}'::jsonb,
 reviewed boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ceb_lab_20261105.ceb_quiz_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 quiz_id uuid NOT NULL REFERENCES ceb_lab_20261105.ceb_quizzes(id),
 revision integer NOT NULL,
 definition jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(quiz_id, revision)
);
CREATE TABLE IF NOT EXISTS ceb_lab_20261105.ceb_quiz_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 quiz_id uuid NOT NULL REFERENCES ceb_lab_20261105.ceb_quizzes(id),
 version_id uuid NOT NULL REFERENCES ceb_lab_20261105.ceb_quiz_versions(id),
 user_id uuid NOT NULL REFERENCES ceb_lab_20261105.ceb_users(id),
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
CREATE UNIQUE INDEX IF NOT EXISTS ceb_quiz_one_open_attempt ON ceb_lab_20261105.ceb_quiz_attempts(quiz_id,user_id) WHERE submitted_at IS NULL;
CREATE INDEX IF NOT EXISTS ceb_quiz_attempt_history ON ceb_lab_20261105.ceb_quiz_attempts(quiz_id,user_id,started_at);
CREATE TABLE IF NOT EXISTS ceb_lab_20261105.ceb_quiz_grants (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 quiz_id uuid NOT NULL REFERENCES ceb_lab_20261105.ceb_quizzes(id),
 user_id uuid NOT NULL REFERENCES ceb_lab_20261105.ceb_users(id),
 granted_by uuid NOT NULL REFERENCES ceb_lab_20261105.ceb_users(id),
 attempt_id uuid UNIQUE REFERENCES ceb_lab_20261105.ceb_quiz_attempts(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ceb_quiz_one_unused_grant ON ceb_lab_20261105.ceb_quiz_grants(quiz_id,user_id) WHERE attempt_id IS NULL;
GRANT SELECT, INSERT, UPDATE ON ceb_lab_20261105.ceb_quizzes, ceb_lab_20261105.ceb_quiz_attempts, ceb_lab_20261105.ceb_quiz_grants TO ceb_api_user;
GRANT SELECT, INSERT ON ceb_lab_20261105.ceb_quiz_versions TO ceb_api_user;

-- The existing API role has inherited privileges. Preserve that role unchanged;
-- enforce history preservation on these new tables as well as in the API.
CREATE OR REPLACE FUNCTION ceb_lab_20261105.ceb_quiz_version_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'Quiz versions are append-only';
END;
$$;
CREATE OR REPLACE FUNCTION ceb_lab_20261105.ceb_quiz_attempt_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Quiz attempts cannot be deleted'; END IF;
 IF OLD.submitted_at IS NOT NULL THEN RAISE EXCEPTION 'Submitted quiz attempts are immutable'; END IF;
 RETURN NEW;
END;
$$;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='ceb_quiz_version_immutable' AND tgrelid='ceb_lab_20261105.ceb_quiz_versions'::regclass) THEN
  CREATE TRIGGER ceb_quiz_version_immutable BEFORE UPDATE OR DELETE ON ceb_lab_20261105.ceb_quiz_versions FOR EACH ROW EXECUTE FUNCTION ceb_lab_20261105.ceb_quiz_version_immutable();
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='ceb_quiz_attempt_history' AND tgrelid='ceb_lab_20261105.ceb_quiz_attempts'::regclass) THEN
  CREATE TRIGGER ceb_quiz_attempt_history BEFORE UPDATE OR DELETE ON ceb_lab_20261105.ceb_quiz_attempts FOR EACH ROW EXECUTE FUNCTION ceb_lab_20261105.ceb_quiz_attempt_history();
 END IF;
END $$;

-- Additive enrollment fields on the existing accounts. No existing password,
-- role, account, study, permission, attempt or result is updated.
ALTER TABLE ceb_lab_20261105.ceb_users
 ADD COLUMN IF NOT EXISTS given_name text,
 ADD COLUMN IF NOT EXISTS surname text,
 ADD COLUMN IF NOT EXISTS date_of_birth date,
 ADD COLUMN IF NOT EXISTS password_admin_managed boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS profile_revision integer NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS ceb_lab_20261105.ceb_student_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 student_id uuid NOT NULL REFERENCES ceb_lab_20261105.ceb_users(id),
 actor_id uuid NOT NULL REFERENCES ceb_lab_20261105.ceb_users(id),
 action text NOT NULL CHECK(action IN ('create','update','password_reset','deactivate')),
 changed_fields jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ceb_lab_20261105.ceb_quiz_ai_usage (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES ceb_lab_20261105.ceb_users(id),
 study_id uuid NOT NULL REFERENCES ceb_lab_20261105.ceb_studies(id),
 model text NOT NULL,
 status text NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','succeeded','failed')),
 prompt_tokens integer,
 completion_tokens integer,
 created_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS ceb_quiz_ai_usage_day ON ceb_lab_20261105.ceb_quiz_ai_usage(created_at,user_id);
GRANT SELECT,INSERT ON ceb_lab_20261105.ceb_student_audit TO ceb_api_user;
GRANT SELECT,INSERT,UPDATE ON ceb_lab_20261105.ceb_quiz_ai_usage TO ceb_api_user;
CREATE OR REPLACE FUNCTION ceb_lab_20261105.ceb_student_audit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Student audit is append-only'; END;
$$;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='ceb_student_audit_immutable' AND tgrelid='ceb_lab_20261105.ceb_student_audit'::regclass) THEN
  CREATE TRIGGER ceb_student_audit_immutable BEFORE UPDATE OR DELETE ON ceb_lab_20261105.ceb_student_audit FOR EACH ROW EXECUTE FUNCTION ceb_lab_20261105.ceb_student_audit_immutable();
 END IF;
END $$;

-- Release prerequisite: verified recovery backup and local validation before production.
-- Add metadata only. Existing kinds, originals, text, folders and rows remain untouched.

-- Abort instead of waiting indefinitely behind live Library traffic.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';
ALTER TABLE ceb_lab_20261105.ceb_materials ADD COLUMN IF NOT EXISTS category text
 CHECK (category IN ('estudo','esboco','ebd-licao','ebd-manual','ebd-apresentacao','ebd-apoio'));


GRANT USAGE ON SCHEMA ceb_lab_20261105 TO ceb_api_user;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA ceb_lab_20261105 TO ceb_api_user;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA ceb_lab_20261105 TO ceb_api_user;
COMMIT;
