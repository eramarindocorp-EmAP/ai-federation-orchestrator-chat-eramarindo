-- ERAMARINDO AI FEDERATION — initial relational schema
-- Apply only to a dedicated Supabase project after reviewing policies.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'member' check (role in ('owner','admin','member','viewer')),
  created_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  created_by uuid not null references auth.users(id),
  visibility text not null default 'private' check (visibility in ('private','organization')),
  created_at timestamptz not null default now()
);

create table if not exists public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member','viewer')),
  created_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.agents (
  id text primary key check (id ~ '^[a-z0-9_-]{2,80}$'),
  provider text not null,
  display_name text not null,
  model_id text,
  capabilities jsonb not null default '[]'::jsonb,
  enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.room_agents (
  room_id uuid not null references public.rooms(id) on delete cascade,
  agent_id text not null references public.agents(id) on delete cascade,
  enabled boolean not null default true,
  primary key (room_id, agent_id)
);

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  mode text not null check (mode in ('direct','broadcast','sequential_review','parallel_tasks','facilitated_room')),
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed','cancelled')),
  correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  run_id uuid references public.runs(id) on delete set null,
  sender_type text not null check (sender_type in ('human','orchestrator','agent','system')),
  sender_id text not null,
  content text not null check (char_length(content) <= 50000),
  message_type text not null default 'response' check (message_type in ('task','response','review','status','error')),
  classification text not null default 'internal' check (classification in ('public','internal','confidential')),
  created_at timestamptz not null default now()
);

create table if not exists public.run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  agent_id text not null references public.agents(id),
  step_no integer not null check (step_no between 1 and 20),
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed','cancelled','timeout')),
  input_message_id uuid references public.messages(id) on delete set null,
  output_message_id uuid references public.messages(id) on delete set null,
  error_code text,
  started_at timestamptz,
  completed_at timestamptz,
  unique (run_id, step_no)
);

create table if not exists public.usage_records (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  agent_id text not null references public.agents(id),
  input_tokens bigint check (input_tokens is null or input_tokens >= 0),
  output_tokens bigint check (output_tokens is null or output_tokens >= 0),
  estimated_cost numeric(14,6) check (estimated_cost is null or estimated_cost >= 0),
  currency char(3),
  recorded_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists messages_room_created_idx on public.messages(room_id, created_at);
create index if not exists runs_room_created_idx on public.runs(room_id, created_at desc);
create index if not exists run_steps_run_idx on public.run_steps(run_id, step_no);
create index if not exists audit_events_created_idx on public.audit_events(created_at desc);

-- Helper function checks membership without exposing profile data.
create or replace function public.is_room_member(target_room uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.room_members rm
    where rm.room_id = target_room and rm.user_id = auth.uid()
  );
$$;

revoke all on function public.is_room_member(uuid) from public;
grant execute on function public.is_room_member(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.agents enable row level security;
alter table public.room_agents enable row level security;
alter table public.runs enable row level security;
alter table public.messages enable row level security;
alter table public.run_steps enable row level security;
alter table public.usage_records enable row level security;
alter table public.audit_events enable row level security;

create policy "profiles read self" on public.profiles
for select to authenticated using (id = auth.uid());
create policy "profiles update self" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "room members read rooms" on public.rooms
for select to authenticated using (public.is_room_member(id));
create policy "authenticated users create rooms" on public.rooms
for insert to authenticated with check (created_by = auth.uid());
create policy "room owners update rooms" on public.rooms
for update to authenticated using (
  exists (select 1 from public.room_members rm where rm.room_id = id and rm.user_id = auth.uid() and rm.role in ('owner','admin'))
) with check (
  exists (select 1 from public.room_members rm where rm.room_id = id and rm.user_id = auth.uid() and rm.role in ('owner','admin'))
);

create policy "members read room membership" on public.room_members
for select to authenticated using (public.is_room_member(room_id));
create policy "room owners manage membership" on public.room_members
for all to authenticated using (
  exists (select 1 from public.room_members rm where rm.room_id = room_id and rm.user_id = auth.uid() and rm.role in ('owner','admin'))
) with check (
  exists (select 1 from public.room_members rm where rm.room_id = room_id and rm.user_id = auth.uid() and rm.role in ('owner','admin'))
);

create policy "authenticated read enabled agents" on public.agents
for select to authenticated using (enabled = true);
create policy "room members read enabled room agents" on public.room_agents
for select to authenticated using (public.is_room_member(room_id));

create policy "members read runs" on public.runs
for select to authenticated using (public.is_room_member(room_id));
create policy "members create own runs" on public.runs
for insert to authenticated with check (requested_by = auth.uid() and public.is_room_member(room_id));

create policy "members read messages" on public.messages
for select to authenticated using (public.is_room_member(room_id));
create policy "members create human messages" on public.messages
for insert to authenticated with check (
  sender_type = 'human' and sender_id = auth.uid()::text and public.is_room_member(room_id)
);

create policy "members read run steps" on public.run_steps
for select to authenticated using (
  exists (select 1 from public.runs r where r.id = run_id and public.is_room_member(r.room_id))
);
create policy "members read usage" on public.usage_records
for select to authenticated using (
  exists (select 1 from public.runs r where r.id = run_id and public.is_room_member(r.room_id))
);
create policy "admins read audit events" on public.audit_events
for select to authenticated using (
  exists (
    select 1 from public.room_members rm
    where rm.user_id = auth.uid() and rm.role in ('owner','admin')
  )
);

-- Intentionally no client-side write policies for agent registry, orchestration outputs,
-- run steps, usage, or audit. Those writes belong to a trusted server/worker role.
