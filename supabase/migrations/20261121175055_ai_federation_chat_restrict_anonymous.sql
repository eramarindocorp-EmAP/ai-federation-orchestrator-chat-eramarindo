-- Anonymous Supabase Auth users share the authenticated database role.
-- Keep chat transcript access limited to permanent app accounts.
do $$
declare
  t text;
begin
  foreach t in array array[
    'ai_federation_conversations',
    'ai_federation_runs',
    'ai_federation_messages',
    'ai_federation_run_steps'
  ] loop
    execute format('drop policy if exists %I on public.%I', 'exclude anonymous auth users', t);
    execute format(
      'create policy %I on public.%I as restrictive for select to authenticated using ((select (auth.jwt()->>''is_anonymous'')::boolean) is false)',
      'exclude anonymous auth users', t
    );
  end loop;
end $$;
