-- Seed the first Development provider so the chat migration can create its REST connection.
-- Keep the adapter pending until its API secret and live handshake have been verified.
insert into federation.agents
  (agent_id,display_name,platform,status,environment,capability_tags,metadata)
values
  ('chatgpt-primary','ChatGPT Federation Adapter','chatgpt','pending','development',
   array['strategy','reasoning','coordination']::text[],
   jsonb_build_object('integration','OpenAI Responses API','secret_reference','OPENAI_API_KEY'))
on conflict (agent_id) do update set
  display_name=excluded.display_name,
  platform=excluded.platform,
  status='pending',
  environment=excluded.environment,
  capability_tags=excluded.capability_tags,
  metadata=excluded.metadata,
  updated_at=now();
