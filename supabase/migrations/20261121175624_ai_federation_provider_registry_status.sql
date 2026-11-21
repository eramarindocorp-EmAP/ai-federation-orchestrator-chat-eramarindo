create or replace function public.ai_federation_provider_status(p_agent_ids text[])
returns table (
  agent_id text,
  provider text,
  agent_active boolean,
  connection_active boolean
)
language sql
stable
security definer
set search_path = pg_catalog, federation
as $$
  select
    a.agent_id,
    a.platform as provider,
    (a.status = 'active') as agent_active,
    coalesce(bool_or(c.status = 'active'), false) as connection_active
  from federation.agents a
  left join federation.agent_connections c
    on c.agent_id = a.agent_id
   and c.environment = a.environment
   and c.protocol = 'rest'
  where a.environment = 'development'
    and a.agent_id = any(p_agent_ids)
  group by a.agent_id, a.platform, a.status;
$$;

revoke all on function public.ai_federation_provider_status(text[]) from public, anon, authenticated;
grant execute on function public.ai_federation_provider_status(text[]) to service_role;
comment on function public.ai_federation_provider_status(text[]) is
  'Service-role-only read of Development agent and REST connection activation state for AI Federation.';
