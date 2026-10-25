-- CEB authentication support: sessions and login rate limiting.
-- Apply manually to the CEB Neon database after reviewing.
-- This migration does not delete or rewrite existing users or studies.

CREATE TABLE IF NOT EXISTS public.ceb_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.ceb_users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ceb_sessions_user_active_idx
    ON public.ceb_sessions (user_id, expires_at)
    WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.ceb_login_attempts (
    id BIGSERIAL PRIMARY KEY,
    username_normalized TEXT NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    succeeded BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS ceb_login_attempts_username_time_idx
    ON public.ceb_login_attempts (username_normalized, attempted_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE
    ON public.ceb_sessions, public.ceb_login_attempts TO ceb_api_user;
GRANT USAGE, SELECT
    ON SEQUENCE public.ceb_login_attempts_id_seq TO ceb_api_user;
