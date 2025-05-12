create table public.dev_task_templates (
  id uuid not null default gen_random_uuid (),
  title text not null,
  description text null,
  source_form_id uuid not null,
  target_form_id uuid not null,
  assignment_type text not null,
  assignee_static uuid null,
  assignee_dynamic text null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  inheritance_mapping jsonb null,
  project_id uuid null,
  due_days integer null,
  min_days integer null default 0,
  constraint dev_task_templates_pkey primary key (id),
  constraint dev_task_templates_default_assignee_fkey foreign KEY (assignee_static) references dev_profiles (id),
  constraint dev_task_templates_project_id_fkey foreign KEY (project_id) references dev_projects (id) on delete CASCADE,
  constraint dev_task_templates_source_form_id_fkey foreign KEY (source_form_id) references dev_forms (id) on delete CASCADE,
  constraint dev_task_templates_target_form_id_fkey foreign KEY (target_form_id) references dev_forms (id) on delete CASCADE,
  constraint dev_task_templates_assignment_type_check check (
    (
      assignment_type = any (array['static'::text, 'dynamic'::text])
    )
  ),
  constraint dev_min_days_less_than_due_days check ((min_days <= due_days))
) TABLESPACE pg_default;