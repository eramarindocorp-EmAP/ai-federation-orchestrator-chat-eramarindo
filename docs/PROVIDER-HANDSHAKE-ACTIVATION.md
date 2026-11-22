# Provider Handshake and Activation

## Scope and environment

This workflow is only for Supabase project `httfqmypknfwcbgpkrkw`, which the project owner explicitly designated as the AI Federation Development backend. It always writes the `development` environment. It does not modify project `rlpkhatlemuhmmzeuzqf`.

## Authorization

The signed-in user must be authorized by FM-001 with the dedicated `providers:activate` scope. The application must never accept provider credentials or model API keys from the browser.

## Handshake

The UI sends `{ action: "provider_test", agentId }` through the authenticated Next.js route to the `ai-federation-chat` Edge Function.

The Edge Function:
1. Validates the user's Supabase Auth session.
2. Requests FM-001 authorization for `providers:activate` in Development.
3. Validates the selected agent against the fixed agent allowlist.
4. Reads that provider's API key and model ID only from Edge Function Secrets.
5. Runs a small, non-persistent API request using the provider's existing adapter.
6. If a non-empty model response is received, activates both the `federation.agents` row and matching `federation.agent_connections` row for Development.
7. Re-reads the provider-status RPC and returns success only when both records are active.
8. If registry activation cannot be confirmed, it attempts to restore both rows to `pending`.

The API response exposes the provider, model identifier, latency, and a status code only. It never returns API keys, raw provider responses, tokens, or prompts.

## Provider endpoints

- OpenAI: Responses API; registry endpoint label `OpenAI Responses API`.
- Google Gemini: Interactions API; registry endpoint label `Google Gemini Interactions API`.
- DeepSeek: Chat Completions API; registry endpoint label `DeepSeek Chat Completions API`.

## Operator procedure

1. In Supabase Development Secrets, verify the six names exist: `OPENAI_API_KEY`, `OPENAI_MODEL`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`.
2. Sign in to the Orchestrator Chat using the Development Auth user.
3. Select one provider and click **Uji & Aktifkan**.
4. Confirm the UI reports a successful handshake and the provider becomes `READY`.
5. Repeat one provider at a time.
6. Only then run a direct chat test, followed by multi-provider Broadcast.

A non-empty secret/configuration state is not proof of successful connectivity. Never set the registry to active manually before a successful handshake.
