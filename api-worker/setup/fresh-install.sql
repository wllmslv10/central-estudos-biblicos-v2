-- Fresh independent installation only; never run against an existing CEB database.
CREATE ROLE ceb_api_user NOLOGIN;
CREATE TABLE public.ceb_users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 display_name text NOT NULL,
 app_role text NOT NULL DEFAULT 'user' CHECK(app_role IN ('admin','user')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.ceb_studies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_user_id uuid NOT NULL REFERENCES public.ceb_users(id),
 title text NOT NULL,
 content jsonb NOT NULL DEFAULT '{}'::jsonb,
 visibility text NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','shared')),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT USAGE ON SCHEMA public TO ceb_api_user;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.ceb_users,public.ceb_studies TO ceb_api_user;
