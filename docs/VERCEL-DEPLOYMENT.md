# Vercel Deployment Runbook

## Current state

No Vercel project is currently linked to this repository in the connected Vercel workspace. Project creation must be performed by an account with permission to create projects in the Eramarindo team.

Do not deploy the current draft as Production. The application is still waiting for FM-001 principal provisioning and provider activation.

## Create the project

After PR #2 is reviewed and merged (or when an authorized administrator explicitly approves a preview deployment):

1. In Vercel, choose **Add New → Project**.
2. Import `eramarindocorp-EmAP/ai-federation-orchestrator-chat-eramarindo`.
3. Set framework preset to **Next.js** and root directory to `.`.
4. Keep production branch as `main` after the application code is merged.
5. Configure the two browser-safe variables for Development and Preview:
   - `NEXT_PUBLIC_SUPABASE_URL=https://rlpkhatlemuhmmzeuzqf.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<project publishable key>`
6. Deploy a Preview first and validate sign-in, FM-001 authorization, provider status, and chat persistence.

## Secret boundary

Do not configure these in Vercel:
- Supabase service-role or secret API keys
- OpenAI API key
- Gemini API key
- DeepSeek API key

Provider credentials belong in Supabase Edge Function Secrets. The browser only receives the Supabase publishable key.

## Release gates

Before Production:
- PR is reviewed and merged.
- GitHub Actions Node and Deno checks pass on the merge commit.
- FM-001 principal and least-privilege Development scopes are provisioned.
- Provider credentials and model IDs are configured and tested.
- The three agent/REST connection records reflect actual activation status.
- RLS, Realtime, rate limits, retention, and budget controls are reviewed.
- An owner approves Production deployment.
