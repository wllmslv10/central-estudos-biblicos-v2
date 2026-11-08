-- Additive migration. Rollback the application without dropping this table;
-- retained notes remain available when the feature is restored.
CREATE TABLE IF NOT EXISTS public.ceb_teacher_notes (
  user_id uuid NOT NULL REFERENCES public.ceb_users(id),
  resource_key text NOT NULL CHECK (length(resource_key) <= 180),
  notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  revision integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, resource_key)
);
