create table public.dev_form_roles (
  id uuid not null default gen_random_uuid (),
  form_id uuid not null,
  role_id uuid not null,
  created_at timestamp with time zone not null default now(),
  created_by uuid not null,
  constraint dev_form_roles_pkey primary key (id),
  constraint dev_form_roles_form_id_role_id_key unique (form_id, role_id),
  constraint dev_form_roles_created_by_fkey foreign KEY (created_by) references dev_profiles (id),
  constraint dev_form_roles_form_id_fkey foreign KEY (form_id) references dev_forms (id) on delete CASCADE,
  constraint dev_form_roles_role_id_fkey foreign KEY (role_id) references dev_roles (id) on delete CASCADE
) TABLESPACE pg_default;