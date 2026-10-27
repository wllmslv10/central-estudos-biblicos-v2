-- Additive only: preserve all existing studies, users, sessions and originals.
CREATE TABLE IF NOT EXISTS public.ceb_folders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_user_id uuid NOT NULL REFERENCES public.ceb_users(id),
 name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
 scope text NOT NULL DEFAULT 'private' CHECK (scope IN ('private','general')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(owner_user_id, name)
);
CREATE TABLE IF NOT EXISTS public.ceb_materials (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_user_id uuid NOT NULL REFERENCES public.ceb_users(id),
 folder_id uuid REFERENCES public.ceb_folders(id),
 title text NOT NULL CHECK (length(title) BETWEEN 1 AND 240),
 filename text NOT NULL,
 mime_type text NOT NULL,
 byte_size integer NOT NULL CHECK (byte_size > 0 AND byte_size <= 20971520),
 object_key text NOT NULL UNIQUE,
 sha256 text NOT NULL,
 extracted_text text NOT NULL DEFAULT '',
 kind text NOT NULL CHECK (kind IN ('estudo','esboco')),
 scope text NOT NULL DEFAULT 'private' CHECK (scope IN ('private','general')),
 applied boolean NOT NULL DEFAULT false,
 applied_date date,
 deleted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ceb_studies ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS ceb_materials_owner_updated_idx ON public.ceb_materials(owner_user_id,updated_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.ceb_folders, public.ceb_materials TO ceb_api_user;
