create table public.dev_form_responses (
  id uuid not null default gen_random_uuid (),
  form_id uuid not null,
  user_id uuid null,
  response_data jsonb not null default '{}'::jsonb,
  submitted_at timestamp with time zone not null default now(),
  is_anonymous boolean not null default false,
  constraint dev_form_responses_pkey primary key (id),
  constraint dev_form_responses_form_id_fkey foreign KEY (form_id) references dev_forms (id) on delete CASCADE,
  constraint dev_form_responses_user_id_fkey foreign KEY (user_id) references dev_profiles (id) on delete CASCADE deferrable initially DEFERRED
) TABLESPACE pg_default;

create index IF not exists idx_dev_form_responses_form_id on public.dev_form_responses using btree (form_id) TABLESPACE pg_default;

create index IF not exists idx_dev_form_responses_user_id on public.dev_form_responses using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_dev_form_responses_is_anonymous on public.dev_form_responses using btree (is_anonymous) TABLESPACE pg_default;