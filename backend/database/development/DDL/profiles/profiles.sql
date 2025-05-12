create table public.dev_profiles (
  id uuid not null,
  email text not null,
  name text not null,
  role text not null default 'user'::text,
  created_at timestamp with time zone not null default now(),
  constraint dev_profiles_pkey primary key (id),
  constraint dev_profiles_email_key unique (email),
  constraint dev_profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;