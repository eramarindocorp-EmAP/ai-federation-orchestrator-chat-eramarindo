# Local Setup and Provider Onboarding

## Prerequisites

- Node.js 22 and npm.
- Supabase Development project.
- A permanent Supabase Auth account for each human operator.
- API access and separately billed credentials for each provider that will be activated.

## Application environment

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The publishable key is safe for browser use. Never put a Supabase secret/service-role key or provider API key in a `NEXT_PUBLIC_*` variable.

## Run locally

1. Clone the repository and check out `feat/live-ai-federation-chat` while it is under review.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and configure the two public Supabase values.
4. Run `npm run dev`.
5. Open `http://localhost:3000`.
6. Register or sign in with a permanent Supabase Auth account.
7. Have an administrator provision the user as an FM-001 Development principal using `docs/FOUNDER-BOOTSTRAP.md`.

The chat UI authenticates users through Supabase Auth. All chat requests pass through the existing FM-001 authorization gateway before provider calls are permitted.

## Supabase database

The Development project already contains the FM-001 `federation` schema and the existing gateway foundation. The AI Federation migration adds owner-scoped chat persistence in the public schema, registers Gemini/DeepSeek as pending Development agents, and creates a service-role-only registry-status RPC.

The current Development project has received the initial chat schema, anonymous-user RLS hardening, and registry-status RPC. Review and apply any future migration in Development before Production.

## Edge Function

The server-side chat adapter is `supabase/functions/ai-federation-chat/index.ts`. It is deployed to the Development project with JWT verification enabled. It delegates identity and scope checks to the existing `fm001-gateway`; it does not replace or weaken that gateway.

The function checks both provider credentials/model IDs and FM-001 agent/connection activation state before sending prompts to a provider.

Configure provider secrets in **Supabase Dashboard → Edge Functions → Secrets** as described in `docs/PROVIDER-ONBOARDING.md`. Keep all provider credentials out of GitHub and Vercel public environment variables.

## Access provisioning

Supabase Auth registration does not grant FM-001 privileges automatically. An administrator must create an active `federation.principals` record and a Development role binding with `chat:read` and `chat:write`. See `docs/FOUNDER-BOOTSTRAP.md`.

## Production gate

Do not enable Production until:
- Security and performance advisors are reviewed.
- Human principals and provider connections are provisioned and tested.
- Provider terms, model IDs, costs, and data classifications are approved.
- Rate limits, budgets, retention, deletion, monitoring, and backup/restore are tested.
- The Vercel project and deployment permissions are approved.
