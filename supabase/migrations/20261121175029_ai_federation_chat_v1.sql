-- ERAMARINDO AI FEDERATION chat persistence
-- Additive migration for the existing FM-001 Development project.
-- Provider credentials are never stored in these tables.
-- Only trusted server/Edge Function service-role code may write.

create extension if not exists pgcrypto;

create table if not exists public.ai_federation_conversations (
  conversation_id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New Federation Conversation'
    check (char_length(title) between 1 and 160),
  status text not null default 'active'
    check (status in ('active','archived','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_federation_runs (
  run_id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_federation_conversations(conversation_id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  mode text not null check (mode in ('direct','broadcast','sequential_review')),
  status text not null default 'queued'
    check (status in ('queued','running','succeeded','partial','failed','cancelled')),
  correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.ai_federation_messages (
  message_id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_federation_conversations(conversation_id) on delete cascade,
  run_id uuid references public.ai_federation_runs(run_id) on delete set null,
  sender_type text not null check (sender_type in ('human','agent','orchestrator','system')),
  sender_id text not null,
  provider text,
  model text,
  content text not null check (char_length(content) between 1 and 50000),
  status text not null default 'complete' check (status in ('pending','streaming','complete','failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_federation_run_steps (
  step_id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ai_federation_runs(run_id) on delete cascade,
  agent_id text not null,
  provider text not null,
  model text,
  step_no integer not null check (step_no between 1 and 10),
  status text not null default 'queued'
    check (status in ('queued','running','succeeded','failed','timeout','cancelled')),
  output_message_id uuid references public.ai_federation_messages(message_id) on delete set null,
  input_tokens bigint check (input_tokens is null or input_tokens >= 0),
  output_tokens bigint check (output_tokens is null or output_tokens >= 0),
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (run_id, step_no)
);

create index if not exists ai_fed_conversations_owner_updated_idx
  on public.ai_federation_conversations(created_by, updated_at desc);
create index if not exists ai_fed_runs_conversation_created_idx
  on public.ai_federation_runs(conversation_id, created_at desc);
create index if not exists ai_fed_messages_conversation_created_idx
  on public.ai_federation_messages(conversation_id, created_at asc);
create index if not exists ai_fed_steps_run_step_idx
  on public.ai_federation_run_steps(run_id, step_no);

alter table public.ai_federation_conversations enable row level security;
alter table public.ai_federation_runs enable row level security;
alter table public.ai_federation_messages enable row level security;
alter table public.ai_federation_run_steps enable row level security;

revoke all on public.ai_federation_conversations from anon;
revoke all on public.ai_federation_runs from anon;
revoke all on public.ai_federation_messages from anon;
revoke all on public.ai_federation_run_steps from anon;

revoke insert, update, delete on public.ai_federation_conversations from authenticated;
revoke insert, update, delete on public.ai_federation_runs from authenticated;
revoke insert, update, delete on public.ai_federation_messages from authenticated;
revoke insert, update, delete on public.ai_federation_run_steps from authenticated;

grant select on public.ai_federation_conversations to authenticated;
grant select on public.ai_federation_runs to authenticated;
grant select on public.ai_federation_messages to authenticated;
grant select on public.ai_federation_run_steps to authenticated;

grant all on public.ai_federation_conversations to service_role;
grant all on public.ai_federation_runs to service_role;
grant all on public.ai_federation_messages to service_role;
grant all on public.ai_federation_run_steps to service_role;

drop policy if exists "conversation owner reads own conversations" on public.ai_federation_conversations;
create policy "conversation owner reads own conversations"
  on public.ai_federation_conversations
  for select to authenticated
  using (created_by = (select auth.uid()));

drop policy if exists "conversation owner reads own runs" on public.ai_federation_runs;
create policy "conversation owner reads own runs"
  on public.ai_federation_runs
  for select to authenticated
  using (exists (
    select 1 from public.ai_federation_conversations c
    where c.conversation_id = ai_federation_runs.conversation_id
      and c.created_by = (select auth.uid())
  ));

drop policy if exists "conversation owner reads own messages" on public.ai_federation_messages;
create policy "conversation owner reads own messages"
  on public.ai_federation_messages
  for select to authenticated
  using (exists (
    select 1 from public.ai_federation_conversations c
    where c.conversation_id = ai_federation_messages.conversation_id
      and c.created_by = (select auth.uid())
  ));

drop policy if exists "conversation owner reads own run steps" on public.ai_federation_run_steps;
create policy "conversation owner reads own run steps"
  on public.ai_federation_run_steps
  for select to authenticated
  using (exists (
    select 1
    from public.ai_federation_runs r
    join public.ai_federation_conversations c
      on c.conversation_id = r.conversation_id
    where r.run_id = ai_federation_run_steps.run_id
      and c.created_by = (select auth.uid())
  ));

-- Enable Realtime for authorized conversation message/run subscribers.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'ai_federation_messages'
    ) then
      alter publication supabase_realtime add table public.ai_federation_messages;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'ai_federation_runs'
    ) then
      alter publication supabase_realtime add table public.ai_federation_runs;
    end if;
  end if;
end $$;

-- Extend the existing FM-001 agent registry without changing current agent records.
alter table federation.agents drop constraint if exists agents_platform_check;
alter table federation.agents add constraint agents_platform_check
  check (platform = any (array[
    'chatgpt','gemini','deepseek','claude',
    'github_copilot','microsoft_365_copilot','copilot_studio','internal'
  ]::text[]));

insert into federation.agents
  (agent_id, display_name, platform, status, environment, capability_tags, metadata)
values
  ('gemini-primary','Gemini Federation Adapter','gemini','pending','development',
   array['research','multimodal','analysis']::text[],
   jsonb_build_object('integration','Google Gemini API','secret_reference','GEMINI_API_KEY')),
  ('deepseek-primary','DeepSeek Federation Adapter','deepseek','pending','development',
   array['reasoning','technical-analysis','coding']::text[],
   jsonb_build_object('integration','DeepSeek API','secret_reference','DEEPSEEK_API_KEY'))
on conflict (agent_id) do update set
  display_name = excluded.display_name,
  platform = excluded.platform,
  capability_tags = excluded.capability_tags,
  metadata = excluded.metadata,
  updated_at = now();

insert into federation.agent_connections
  (agent_id, environment, protocol, endpoint_label, status, granted_scopes, secret_reference)
select v.agent_id, 'development', 'rest', v.endpoint_label, 'pending',
       array['chat:generate']::text[], v.secret_reference
from (values
  ('chatgpt-primary','OpenAI Responses API','OPENAI_API_KEY'),
  ('gemini-primary','Google Gemini Interactions API','GEMINI_API_KEY'),
  ('deepseek-primary','DeepSeek Chat Completions API','DEEPSEEK_API_KEY')
) as v(agent_id, endpoint_label, secret_reference)
where not exists (
  select 1 from federation.agent_connections c
  where c.agent_id = v.agent_id
    and c.environment = 'development'
    and c.protocol = 'rest'
);

comment on table public.ai_federation_conversations is
  'Owner-scoped AI Federation chat conversations; writes are server-side only.';
comment on table public.ai_federation_messages is
  'AI Federation chat transcript; RLS limits reads to the conversation owner.';
