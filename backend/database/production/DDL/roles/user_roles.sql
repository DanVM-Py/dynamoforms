create table public.user_roles (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  role_id uuid not null,
  created_at timestamp with time zone not null default now(),
  project_id uuid not null,
  constraint pk_user_roles primary key (id),
  constraint user_roles_role_id_user_id_key unique (user_id, role_id),
  constraint user_roles_role_id_fkey foreign key (role_id) references public.roles (id) on delete CASCADE,
  constraint user_roles_user_id_fkey foreign key (user_id) references public.profiles (id) on delete CASCADE,
  constraint user_roles_project_id_fkey foreign key (project_id) references public.projects (id) on delete CASCADE
) TABLESPACE pg_default;