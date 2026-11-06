ALTER TABLE public.ceb_users
 ADD COLUMN IF NOT EXISTS phone text,
 ADD COLUMN IF NOT EXISTS sex text CHECK (sex IN ('female', 'male', 'unspecified')),
 ADD COLUMN IF NOT EXISTS is_primary_admin boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS ceb_one_primary_admin
 ON public.ceb_users (is_primary_admin) WHERE is_primary_admin;

-- Keep the account identifier in the immutable enrollment audit even if an
-- unlinked enrollment is deleted. Audit actor and academic links stay enforced.
ALTER TABLE public.ceb_student_audit DROP CONSTRAINT IF EXISTS ceb_student_audit_student_id_fkey;

ALTER TABLE public.ceb_student_audit
 DROP CONSTRAINT IF EXISTS ceb_student_audit_action_check,
 ADD CONSTRAINT ceb_student_audit_action_check
 CHECK (action IN ('create', 'update', 'password_reset', 'deactivate', 'delete'));

-- Existing student passwords are left untouched, including old formats.
UPDATE public.ceb_users
 SET password_admin_managed = true, must_change_password = false
 WHERE app_role = 'user' AND username IS NOT NULL
 AND (NOT password_admin_managed OR must_change_password);
CREATE OR REPLACE FUNCTION public.ceb_protect_primary_admin() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.is_primary_admin THEN
  IF TG_OP = 'DELETE' THEN
   RAISE EXCEPTION 'A conta administrativa principal é protegida.' USING ERRCODE = '23514';
  END IF;
  IF NEW.app_role IS DISTINCT FROM 'admin' OR NEW.is_active IS DISTINCT FROM true OR NOT NEW.is_primary_admin THEN
   RAISE EXCEPTION 'A conta administrativa principal é protegida.' USING ERRCODE = '23514';
  END IF;
 END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER ceb_protect_primary_admin
 BEFORE UPDATE OR DELETE ON public.ceb_users
 FOR EACH ROW EXECUTE FUNCTION public.ceb_protect_primary_admin();
