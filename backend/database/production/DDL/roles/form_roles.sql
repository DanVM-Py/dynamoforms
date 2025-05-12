create table public.form_roles (
  id uuid not null default gen_random_uuid (),
  form_id uuid not null,
  role_id uuid not null,
  created_at timestamp with time zone not null default now(),
  created_by uuid not null,
  constraint form_roles_pkey primary key (id),
  constraint form_roles_form_id_role_id_key unique (form_id, role_id),
  constraint form_roles_created_by_fkey foreign KEY (created_by) references profiles (id),
  constraint form_roles_form_id_fkey foreign KEY (form_id) references forms (id) on delete CASCADE,
  constraint form_roles_role_id_fkey foreign KEY (role_id) references roles (id) on delete CASCADE
) TABLESPACE pg_default;