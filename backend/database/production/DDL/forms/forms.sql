create table public.forms (
  id uuid not null default gen_random_uuid (),
  title text not null,
  description text null,
  schema jsonb not null default '{}'::jsonb,
  created_by uuid not null,
  status public.form_status not null default 'draft'::form_status,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  project_id uuid null,
  is_public boolean not null default false,
  constraint forms_pkey primary key (id),
  constraint forms_created_by_fkey foreign KEY (created_by) references profiles (id) on delete CASCADE,
  constraint forms_project_id_fkey foreign KEY (project_id) references projects (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_forms_created_by on public.forms using btree (created_by) TABLESPACE pg_default;

create index IF not exists idx_forms_status on public.forms using btree (status) TABLESPACE pg_default;