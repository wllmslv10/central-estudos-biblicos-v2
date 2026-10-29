-- Release prerequisite: verified recovery backup and local validation before production.
-- Add metadata only. Existing kinds, originals, text, folders and rows remain untouched.
BEGIN;
-- Abort instead of waiting indefinitely behind live Library traffic.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';
ALTER TABLE public.ceb_materials ADD COLUMN IF NOT EXISTS category text
 CHECK (category IN ('estudo','esboco','ebd-licao','ebd-manual','ebd-apresentacao','ebd-apoio'));
COMMIT;
