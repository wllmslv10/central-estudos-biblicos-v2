-- CEB cloud authentication migration
-- Apply only to the CEB Neon database after reviewing this migration.
-- Existing user and study records are preserved.

ALTER TABLE public.ceb_users
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Usernames are case-insensitive and cannot be blank.
CREATE UNIQUE INDEX IF NOT EXISTS ceb_users_username_lower_uidx
  ON public.ceb_users (LOWER(username))
  WHERE username IS NOT NULL;

ALTER TABLE public.ceb_users
  DROP CONSTRAINT IF EXISTS ceb_users_username_format_check;

ALTER TABLE public.ceb_users
  ADD CONSTRAINT ceb_users_username_format_check
  CHECK (username IS NULL OR username ~ '^[A-Za-z0-9._-]{3,32}$');

-- Passwords are stored only as a derived hash, never as plaintext.
-- password_hash is nullable during transition for existing records;
-- accounts without a password cannot authenticate until an admin provisions them.
