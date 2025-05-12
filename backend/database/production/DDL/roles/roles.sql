create table public.roles (
  id uuid not null default gen_random_uuid (),
  project_id uuid not null,
  name text not null,
  created_by uuid not null,
  created_at timestamp with time zone not null default now(),
  constraint roles_pkey primary key (id),
  constraint roles_project_id_name_key unique (project_id, name),
  constraint roles_created_by_fkey foreign KEY (created_by) references profiles (id),
  constraint roles_project_id_fkey foreign KEY (project_id) references projects (id) on delete CASCADE
) TABLESPACE pg_default;