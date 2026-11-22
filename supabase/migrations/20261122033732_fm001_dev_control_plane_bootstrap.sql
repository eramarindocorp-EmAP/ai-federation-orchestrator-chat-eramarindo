-- FM-001 Development control-plane bootstrap for the legacy secondary project.
-- Additive only: preserve existing federation.members, registry, messages and audit_events.
-- Sensitive authorization tables are service-role-only; RLS is enabled with no client policies.

create extension if not exists pgcrypto;

create table if not exists federation.principals (
  principal_id uuid primary key default gen_random_uuid(),
  issuer text not null check (length(btrim(issuer)) > 0),
  subject text not null check (length(btrim(subject)) > 0),
  principal_type text not null check (principal_type = any (array['human','service','ai_agent']::text[])),
  display_name text not null check (length(btrim(display_name)) > 0),
  status text not null default 'pending' check (status = any (array['pending','active','suspended','revoked']::text[])),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint principals_issuer_subject_key unique (issuer, subject)
);

create table if not exists federation.principal_roles (
  role_binding_id uuid primary key default gen_random_uuid(),
  principal_id uuid not null references federation.principals(principal_id) on delete restrict,
  role_name text not null check (role_name = any (array['founder_approver','federation_admin','operator','auditor','agent_runtime']::text[])),
  environment text not null check (environment = any (array['development','production']::text[])),
  scopes text[] not null default '{}'::text[],
  granted_by uuid references federation.principals(principal_id) on delete restrict,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  constraint principal_roles_check check (valid_until is null or valid_until > valid_from),
  constraint principal_roles_principal_id_role_name_environment_key unique (principal_id, role_name, environment)
);

create table if not exists federation.agents (
  agent_id text primary key check (length(btrim(agent_id)) > 0),
  display_name text not null check (length(btrim(display_name)) > 0),
  platform text not null check (platform = any (array[
    'chatgpt','gemini','deepseek','claude',
    'github_copilot','microsoft_365_copilot','copilot_studio','internal'
  ]::text[])),
  status text not null default 'pending' check (status = any (array['pending','active','suspended','revoked']::text[])),
  environment text not null check (environment = any (array['development','production']::text[])),
  capability_tags text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agents_agent_id_environment_key unique (agent_id, environment)
);

create table if not exists federation.agent_connections (
  connection_id uuid primary key default gen_random_uuid(),
  agent_id text not null,
  environment text not null check (environment = any (array['development','production']::text[])),
  protocol text not null check (protocol = any (array['mcp','rest','webhook','graph_connector','copilot_studio']::text[])),
  endpoint_label text not null check (length(btrim(endpoint_label)) > 0),
  status text not null default 'pending' check (status = any (array['pending','active','disabled','revoked']::text[])),
  granted_scopes text[] not null default '{}'::text[],
  secret_reference text,
  last_handshake_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_connections_agent_id_environment_fkey
    foreign key (agent_id, environment)
    references federation.agents(agent_id, environment)
    on delete restrict,
  constraint agent_connections_agent_id_protocol_endpoint_label_environment_key
    unique (agent_id, protocol, endpoint_label, environment)
);

create index if not exists principal_roles_lookup_idx
  on federation.principal_roles (principal_id, environment, valid_from, valid_until);
create index if not exists agents_environment_status_idx
  on federation.agents (environment, status);
create index if not exists agent_connections_environment_status_idx
  on federation.agent_connections (environment, status);

alter table federation.principals enable row level security;
alter table federation.principal_roles enable row level security;
alter table federation.agents enable row level security;
alter table federation.agent_connections enable row level security;

revoke all on table federation.principals, federation.principal_roles, federation.agents, federation.agent_connections
  from public, anon, authenticated;
grant usage on schema federation to service_role;
grant all on table federation.principals, federation.principal_roles, federation.agents, federation.agent_connections
  to service_role;

create or replace function public.fm001_authorize_principal(
  p_issuer text,
  p_subject text,
  p_environment text,
  p_required_scopes text[] default '{}'::text[]
)
returns table (
  principal_id uuid,
  principal_type text,
  display_name text,
  roles text[],
  scopes text[]
)
language sql
stable
security definer
set search_path to 'pg_catalog'
as $function$
  with active_grants as (
    select
      r.principal_id,
      array_agg(distinct r.role_name order by r.role_name) as role_names,
      coalesce(
        array_agg(distinct s.scope_value order by s.scope_value)
          filter (where s.scope_value is not null),
        array[]::text[]
      ) as granted_scopes
    from federation.principal_roles as r
    left join lateral unnest(r.scopes) as s(scope_value) on true
    where r.environment = p_environment
      and r.valid_from <= statement_timestamp()
      and (r.valid_until is null or r.valid_until > statement_timestamp())
    group by r.principal_id
  )
  select
    p.principal_id,
    p.principal_type,
    p.display_name,
    g.role_names,
    g.granted_scopes
  from federation.principals as p
  join active_grants as g on g.principal_id = p.principal_id
  where p.issuer = p_issuer
    and p.subject = p_subject
    and p.status = 'active'
    and p_environment in ('development','production')
    and coalesce(p_required_scopes, array[]::text[]) <@ g.granted_scopes;
$function$;

revoke all on function public.fm001_authorize_principal(text,text,text,text[]) from public, anon, authenticated;
grant execute on function public.fm001_authorize_principal(text,text,text,text[]) to service_role;

comment on function public.fm001_authorize_principal(text,text,text,text[]) is
  'Service-role-only FM-001 authorization check for a verified Auth identity, environment and required scopes.';
