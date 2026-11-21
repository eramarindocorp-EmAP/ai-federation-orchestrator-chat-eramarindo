# Vercel Deployment Runbook

## Verified Development state — 22 November 2026

This runbook reflects the verified state of the connected Development resources:

| Layer | Verified state |
|---|---|
| GitHub | `main` contains commit `69cf76ee01e852f0772537a41bac6fd5528a86d9`; the Federation v2 task-classification change is merged. |
| Supabase project | `rlpkhatlemuhmmzeuzqf` (Development) |
| `ai-federation-chat` | ACTIVE, version 6, JWT verification enabled |
| `fm001-gateway` | ACTIVE, version 2, JWT verification enabled |
| FM-001 founder principal | ACTIVE for Development with `chat:read` and `chat:write` |
| Provider registry | ChatGPT, Gemini, and DeepSeek records are still `pending`; no successful handshake is recorded. |
| Vercel workspace | `eramarindo-trinity` has no project or deployment for this repository. |

The Vercel project-creation request previously returned HTTP 403 (insufficient permission). A fresh project/deployment has therefore **not** been created. The founder principal's database provisioning is complete, but end-to-end browser sign-in has not yet been verified.

Do not describe the application as live or RUN until a Preview deployment is READY and the authenticated runtime checks below pass.

## Create the Preview project

A workspace owner or an account with project-creation permission must complete this step:

1. In the **Eramarindo Trinity** Vercel workspace, choose **Add New → Project**.
2. Import `eramarindocorp-EmAP/ai-federation-orchestrator-chat-eramarindo`.
3. Select **Next.js** and set the root directory to `.`.
4. Keep the production branch as `main`; do not promote or release Production as part of this setup.
5. Configure these browser-safe environment variables for **Development** and **Preview only**:
   - `NEXT_PUBLIC_SUPABASE_URL=https://rlpkhatlemuhmmzeuzqf.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Supabase project publishable key>`
6. Deploy a Preview from the reviewed repository branch.

If project creation is still denied, have the workspace owner create the project or grant the connected account the required project-creation permission. Do not repeatedly retry the same denied API operation.

## Preview validation checklist

After the deployment reaches `READY`:

- Open the Preview URL and confirm the application renders without missing environment configuration.
- Sign in with the already-provisioned Development Supabase Auth account.
- Confirm FM-001 status returns Development authorization with `chat:read` and `chat:write`.
- Confirm the provider status endpoint reports each adapter's configuration and registry state accurately.
- After provider onboarding, send a non-sensitive synthetic prompt to one provider in Direct mode.
- Verify the provider response, message persistence, history reload, and run status.
- Verify broadcast and sequential review only after at least two providers have individually passed their tests.

## Provider secret boundary

Provider credentials belong in **Supabase Dashboard → Edge Functions → Secrets** for the Development project:

- `OPENAI_API_KEY`, `OPENAI_MODEL`
- `GEMINI_API_KEY`, `GEMINI_MODEL`
- `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`

Do not configure Supabase service-role/secret keys or provider API keys in Vercel. Do not place them in `NEXT_PUBLIC_*` variables, source files, GitHub, or browser storage. Never reuse Production credentials in Development.

## Release gates

Production remains out of scope and must stay untouched until separately approved. Before any Production release:

- Preview is READY and authenticated end-to-end tests pass.
- GitHub CI checks pass for the exact release commit.
- FM-001 permissions are reviewed for the target environment.
- Each enabled provider has a verified credential, model ID, successful live request, and matching registry status.
- RLS, Realtime, retention, rate limits, provider budgets, and data classification are reviewed.
- An authorized owner explicitly approves the Production deployment.
