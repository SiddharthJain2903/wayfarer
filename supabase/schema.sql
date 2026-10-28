create extension if not exists "pgcrypto";

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  dest text not null,
  start_date date not null,
  end_date date not null,
  group_size int not null default 1,
  tier int not null default 1,
  pace text not null default 'balanced',
  interests jsonb not null default '[]',
  hotel jsonb,
  days jsonb not null default '[]',
  tips text,
  created_at timestamptz not null default now()
);
create index if not exists trips_client_idx on public.trips (client_id, created_at desc);
-- The backend uses the service-role key, which bypasses RLS.
alter table public.trips enable row level security;
