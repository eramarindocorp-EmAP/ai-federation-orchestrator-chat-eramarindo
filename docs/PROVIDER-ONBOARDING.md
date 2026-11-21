# Provider API Onboarding — Development

## Current adapters

The `ai-federation-chat` Supabase Edge Function has server-side adapters for:

| Federation agent | Provider API | Required secrets |
|---|---|---|
| `chatgpt-primary` | OpenAI Responses API | `OPENAI_API_KEY`, `OPENAI_MODEL` |
| `gemini-primary` | Google Gemini generateContent | `GEMINI_API_KEY`, `GEMINI_MODEL` |
| `deepseek-primary` | DeepSeek Chat Completions | `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL` |

Claude, Microsoft Copilot, and GitHub Copilot remain future integrations. They are not selectable in the first release.

## Configure credentials

In the Supabase Dashboard for the Development project, open **Edge Functions → Secrets** and add the required key/model pairs.

Use the exact model identifiers enabled for the company's provider account. Model IDs are intentionally not hard-coded because account availability and provider catalogs can change.

Do not:
- Commit API keys to GitHub.
- Put provider keys in `.env.local`, browser environment variables, or Vercel public variables.
- Paste credentials into ChatGPT or the Federation chat.
- Reuse production keys in Development.

The existing Supabase project-level secrets used by `fm001-gateway` must remain intact. Do not overwrite or delete the Supabase keyring secrets.

## Activate an agent after verification

After adding its provider key and model ID:

1. Test the provider credential and billing status directly in the provider console.
2. Run a low-cost synthetic test with non-sensitive content.
3. Confirm the Federation status endpoint reports the provider as configured.
4. Review provider usage and spending limits.
5. Only then activate the matching Development registry records.

Example SQL for an administrator after a successful handshake (replace only the intended agent IDs):

```sql
update federation.agents
set status = 'active', updated_at = now()
where environment = 'development'
  and agent_id in ('chatgpt-primary', 'gemini-primary', 'deepseek-primary');

update federation.agent_connections
set status = 'active', last_handshake_at = now(), updated_at = now()
where environment = 'development'
  and protocol = 'rest'
  and agent_id in ('chatgpt-primary', 'gemini-primary', 'deepseek-primary');
```

Do not run the activation SQL until the corresponding provider is actually configured and tested. The registry status is an operational record and must reflect reality.

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

Prompts and selected conversation history are sent to the selected provider. Do not submit confidential, regulated, or personal data until the company has reviewed each provider's data processing terms, retention settings, and approved data classification. OpenAI requests use `store: false`; provider-specific retention and training terms must still be reviewed separately.
