create table public.notifications (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  title text not null,
  message text not null,
  type public.notification_type not null,
  status public.notification_status not null default 'sent'::notification_status,
  created_at timestamp with time zone not null default now(),
  sent_at timestamp with time zone null,
  metadata jsonb null default '{}'::jsonb,
  project_id uuid null,
  constraint notifications_pkey primary key (id),
  constraint notifications_project_id_fkey foreign KEY (project_id) references projects (id),
  constraint notifications_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_notifications_user_id on public.notifications using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_notifications_type on public.notifications using btree (type) TABLESPACE pg_default