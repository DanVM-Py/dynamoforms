create table public.dev_projects (
  id uuid not null default gen_random_uuid (),
  name text not null,
  description text null,
  created_at timestamp with time zone not null default now(),
  created_by uuid not null,
  constraint dev_projects_pkey primary key (id),
  constraint dev_projects_created_by_fkey foreign KEY (created_by) references dev_profiles (id)
) TABLESPACE pg_default;