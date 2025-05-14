create table public.dev_tasks (
  id uuid not null default gen_random_uuid (),
  title text not null,
  description text null,
  form_id uuid null,
  form_response_id uuid null,
  assigned_to uuid not null, 
  template_id uuid NULL,
  status public.task_status not null default 'Pendiente'::task_status,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  due_date timestamp with time zone null,
  project_id uuid null,
  source_form_id uuid null,
  priority text null default 'medium'::text,
  constraint dev_tasks_pkey primary key (id),
  constraint dev_tasks_assigned_to_fkey foreign KEY (assigned_to) references dev_profiles (id),
  constraint dev_tasks_form_id_fkey foreign KEY (form_id) references dev_forms (id) on delete set null,
  constraint dev_tasks_form_response_id_fkey foreign KEY (form_response_id) references dev_form_responses (id) on delete set null,
  constraint dev_tasks_project_id_fkey foreign KEY (project_id) references dev_projects (id),
  constraint dev_tasks_source_form_id_fkey foreign KEY (source_form_id) references dev_forms (id),
  constraint dev_tasks_template_id_fkey foreign KEY (template_id) references dev_task_templates (id) on delete set null
  ) TABLESPACE pg_default;

create index IF not exists idx_dev_tasks_assigned_to on public.dev_tasks using btree (assigned_to) TABLESPACE pg_default;

create index IF not exists idx_dev_tasks_status on public.dev_tasks using btree (status) TABLESPACE pg_default;

create index IF not exists idx_dev_tasks_form_id on public.dev_tasks using btree (form_id) TABLESPACE pg_default;