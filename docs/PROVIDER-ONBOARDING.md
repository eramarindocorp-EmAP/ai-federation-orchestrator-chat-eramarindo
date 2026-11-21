# Provider API Onboarding — Development

## Current adapters

The `ai-federation-chat` Supabase Edge Function has server-side adapters for:

| Federation agent | Provider API | Required secrets |
|---|---|---|
| `chatgpt-primary` | OpenAI Responses API | `OPENAI_API_KEY`, `OPENAI_MODEL` |
| `gemini-primary` | Google Gemini Interactions API | `GEMINI_API_KEY`, `GEMINI_MODEL` |
| `deepseek-primary` | DeepSeek Chat Completions | `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL` |

Claude, Microsoft Copilot, and GitHub Copilot remain future integrations. They are not selectable in the first release. A ChatGPT conversation or a public discussion URL is not itself a provider API connection; each adapter requires an authorized API integration.

## Verified registry baseline — 22 November 2026

The Development database currently contains these three provider adapters:

| Agent ID | Agent status | REST connection status | Last handshake |
|---|---|---|---|
| `chatgpt-primary` | `pending` | `pending` | Not recorded |
| `gemini-primary` | `pending` | `pending` | Not recorded |
| `deepseek-primary` | `pending` | `pending` | Not recorded |

The FM-001 Development Operator principal has already been provisioned with `chat:read` and `chat:write`. This human authorization does not activate provider adapters. Do not change a provider's registry state until that specific provider has passed a live Development request.

## Configure credentials

In the Supabase Dashboard for the Development project, open **Edge Functions → Secrets** and add the required key/model pair for each provider you intend to test.

Use exact model identifiers enabled for the company's provider account. Model IDs are intentionally not hard-coded because account availability and provider catalogs can change.

Do not:
- Commit API keys to GitHub.
- Put provider keys in `.env.local`, browser environment variables, or Vercel public variables.
- Paste credentials into ChatGPT or the Federation chat.
- Reuse Production keys in Development.
- Overwrite or delete the existing Supabase keyring secrets used by `fm001-gateway`.

## Verify and activate one provider at a time

For each provider independently:

1. Add its API key and model ID directly in the Supabase Dashboard.
2. Confirm the provider credential and billing status in the provider console.
3. Run a low-cost synthetic request with non-sensitive content after Preview and authenticated sign-in are available.
4. Verify the Federation status action reports `configured: true` for that adapter.
5. Confirm the direct request succeeds and the response is persisted.
6. Review usage and spending limits.
7. Only then update that provider's Development registry records.

Example SQL for **one verified provider only**. Replace the example ID with exactly one provider ID whose live request has succeeded:

```sql
-- Run only after a successful live Development request for this exact agent.
update federation.agents
set status = 'active', updated_at = now()
where environment = 'development'
  and agent_id = '<verified-agent-id>';

update federation.agent_connections
set status = 'active', last_handshake_at = now(), updated_at = now()
where environment = 'development'
  and protocol = 'rest'
  and agent_id = '<verified-agent-id>';
```

Verify that both statements affect exactly the intended provider. Never activate all adapters with one bulk update after testing only one provider. If the live request fails, leave the records pending and investigate the failure.

## Status contract

The authenticated `action: "status"` response reports:

- `configured`: provider API key and model ID are available to the Edge Function.
- `registered`: the agent and its Development connection are both active in the registry.
- `enabled`: both conditions above are true.

A provider is selectable for chat only when `enabled` is true. Registry activation is an auditable operational fact, not a substitute for a provider request.

## Request limits

The first release applies:
- Maximum three selected agents per run.
- Direct mode: exactly one agent.
- Broadcast mode: two or three agents in parallel.
- Sequential review: exactly two agents in sequence.
- Maximum five chat runs per user per minute (best-effort request guard).
- Maximum 1,600 output tokens per provider request.
- Provider request timeout: 20 seconds.

Provider-side budgets and hard spending limits should also be configured in each provider account. The application request guard is not a substitute for provider billing controls.

## Data handling

Prompts and selected conversation history are sent to the selected provider. Do not submit confidential, regulated, or personal data until the company has reviewed each provider's data-processing terms, retention settings, and approved data classification. OpenAI requests use `store: false`; provider-specific retention and training terms must still be reviewed separately.
