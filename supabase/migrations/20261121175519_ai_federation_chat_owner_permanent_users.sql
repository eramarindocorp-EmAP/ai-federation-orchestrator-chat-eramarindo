-- Keep authenticated chat reads owner-scoped and explicitly deny anonymous Auth users.
-- The separate restrictive policy is retained as defense in depth.
drop policy if exists "conversation owner reads own conversations" on public.ai_federation_conversations;
create policy "conversation owner reads own conversations"
on public.ai_federation_conversations for select to authenticated
using (
  created_by = (select auth.uid())
  and ((select (auth.jwt()->>'is_anonymous')::boolean) is false)
);

drop policy if exists "conversation owner reads own runs" on public.ai_federation_runs;
create policy "conversation owner reads own runs"
on public.ai_federation_runs for select to authenticated
using (
  exists (
    select 1 from public.ai_federation_conversations c
    where c.conversation_id = ai_federation_runs.conversation_id
      and c.created_by = (select auth.uid())
  )
  and ((select (auth.jwt()->>'is_anonymous')::boolean) is false)
);

drop policy if exists "conversation owner reads own messages" on public.ai_federation_messages;
create policy "conversation owner reads own messages"
on public.ai_federation_messages for select to authenticated
using (
  exists (
    select 1 from public.ai_federation_conversations c
    where c.conversation_id = ai_federation_messages.conversation_id
      and c.created_by = (select auth.uid())
  )
  and ((select (auth.jwt()->>'is_anonymous')::boolean) is false)
);

drop policy if exists "conversation owner reads own run steps" on public.ai_federation_run_steps;
create policy "conversation owner reads own run steps"
on public.ai_federation_run_steps for select to authenticated
using (
  exists (
    select 1
    from public.ai_federation_runs r
    join public.ai_federation_conversations c on c.conversation_id = r.conversation_id
    where r.run_id = ai_federation_run_steps.run_id
      and c.created_by = (select auth.uid())
  )
  and ((select (auth.jwt()->>'is_anonymous')::boolean) is false)
);
