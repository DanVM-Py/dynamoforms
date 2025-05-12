create table public.projects (
  id uuid not null default gen_random_uuid (),
  name text not null,
  description text null,
  created_at timestamp with time zone not null default now(),
  created_by uuid not null,
  constraint projects_pkey primary key (id),
  constraint projects_created_by_fkey foreign KEY (created_by) references profiles (id)
) TABLESPACE pg_default;