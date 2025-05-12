create table public.project_users (
  id uuid not null default gen_random_uuid (),
  project_id uuid not null,
  user_id uuid not null,
  invited_at timestamp with time zone not null default now(),
  activated_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  is_admin boolean null default false,
  access_level text null default 'member'::text,
  constraint project_users_pkey primary key (id),
  constraint project_users_project_id_user_id_key unique (project_id, user_id),
  constraint project_users_project_id_fkey foreign KEY (project_id) references projects (id) on delete CASCADE,
  constraint project_users_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_project_users_project_id on public.project_users using btree (project_id) TABLESPACE pg_default;

create index IF not exists idx_project_users_user_id on public.project_users using btree (user_id) TABLESPACE pg_default;