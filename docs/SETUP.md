# Local Setup and Provider Onboarding

## Prerequisites

- Node.js 22 or a version supported by the chosen Next.js release.
- npm.
- A Supabase project for authentication and persistence (not required to view the static shell).
- Provider API access for each model that will be activated.

## Run locally

1. Clone this repository and check out `feat/federation-foundation`.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Leave secrets empty until accounts and project environments are provisioned.
5. Run `npm run dev`.
6. Open `http://localhost:3000`.

The chat shell is a foundation UI. The API endpoint currently returns `not_configured` (HTTP 501) intentionally; it does not send prompts to any external model.

## Supabase

1. Provision a dedicated development project.
2. Review `supabase/migrations/0001_federation_core.sql`.
3. Apply the migration only after reviewing RLS with a database administrator.
4. Configure Supabase URL and public anon key in the application environment.
5. Configure the service role key only as a server-side secret. Never expose it with a `NEXT_PUBLIC_` prefix.
6. Test access using separate owner, member, and non-member accounts before enabling any room features.

## Provider onboarding

For each provider:
1. Confirm the official API product, data handling terms, allowed data classification, model ID, rate limits, and pricing.
2. Create a dedicated project/service credential with least privilege.
3. Store the key in Vercel or another secrets manager; do not put it in GitHub.
4. Implement and test a provider adapter on the server.
5. Set per-request timeout, output limit, retry policy, rate limit, and cost ceiling.
6. Run a synthetic test with non-sensitive content.
7. Enable the agent only after owner approval.

Consumer chatbot subscriptions are not equivalent to API access. Microsoft Copilot and GitHub Copilot require product-specific capability and licensing review rather than assumed generic chat endpoints.

## Production gate

Do not deploy as a production chat service until authentication, room-level authorization, database policies, provider adapters, spend controls, logging redaction, deletion/retention and recovery tests are complete.
