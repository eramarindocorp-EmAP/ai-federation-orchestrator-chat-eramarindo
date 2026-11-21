# Eramarindo AI Federation Orchestrator & Chat

> ONE GATE — ONE STANDARD — ONE COMMAND  
> ONE TEAM — MULTIPLE INTELLIGENCES — ONE COLLECTIVE MISSION

A human-governed multi-model workspace for orchestrating the Ferguson (OpenAI API), Gemini, and DeepSeek agents through the existing Eramarindo FM-001 authorization gateway.

## Current implementation status

**Development foundation implemented; provider activation and web deployment remain pending.**

- Next.js/TypeScript Federation workspace with Supabase Auth sign-in/sign-up.
- Chat API proxy to a Supabase Edge Function.
- Supabase Edge Function `ai-federation-chat` deployed to the Development project with JWT verification enabled.
- The OpenAI-backed Ferguson agent has a dedicated strategic-coordinator role prompt; it is an API agent, separate from the current ChatGPT application session.
- Existing `fm001-gateway` used for principal and scope authorization.
- Owner-scoped conversation/message/run tables with RLS and Realtime publication.
- Service-role-only RPC enforces Development agent and connection activation status.
- Provider adapters implemented for OpenAI Responses API, Gemini generateContent, and DeepSeek Chat Completions.
- Direct, parallel broadcast, and two-agent sequential review modes.
- No provider credentials have been added and no live provider call has been verified.
- No Vercel project or web deployment has been created.

The app intentionally fails closed until a human principal is provisioned, provider API secrets/model IDs are configured, and the corresponding FM-001 agent records are activated.

## Architecture

| Layer | Implementation |
|---|---|
| Web UI | Next.js / React / TypeScript |
| Human identity | Supabase Auth |
| Authorization | Existing FM-001 `fm001-gateway` |
| Orchestration | Supabase Edge Function `ai-federation-chat` |
| Chat persistence | Supabase PostgreSQL |
| Live transcript updates | Supabase Realtime |
| Provider adapters | OpenAI, Gemini, DeepSeek |
| CI | GitHub Actions: Node checks and Deno type check |
| Planned hosting | Vercel (project creation permission required) |

## Conversation modes

- **Direct:** one selected provider receives the message.
- **Broadcast:** two or three selected providers answer in parallel.
- **Sequential review:** exactly two selected providers; the second reviews the first response.
- Every run is bounded by provider timeouts, output limits, and a per-user request guard.

## Local development

See [docs/SETUP.md](docs/SETUP.md).

Required browser-safe variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Provider credentials belong only in Supabase Edge Function Secrets. Never commit secrets or expose them through `NEXT_PUBLIC_*` variables.

## Required activation steps

1. Create a permanent Supabase Auth account.
2. Provision its FM-001 Development principal and `chat:read` / `chat:write` scopes using [docs/FOUNDER-BOOTSTRAP.md](docs/FOUNDER-BOOTSTRAP.md).
3. Configure provider keys and exact model IDs using [docs/PROVIDER-ONBOARDING.md](docs/PROVIDER-ONBOARDING.md).
4. Test each provider with non-sensitive prompts and approved spending limits.
5. Activate the matching Development agent and REST connection records.
6. Configure the Vercel project and browser-safe Supabase environment variables.
7. Pass CI, security review, and an end-to-end test before enabling Production.

## Security and governance

- Provider calls execute server-side only.
- The existing FM-001 gateway remains the authorization authority.
- Chat records are owner-scoped; anonymous Auth sessions are explicitly excluded from reads.
- Client roles cannot insert, update, or delete chat records directly.
- Provider secrets are never stored in chat messages or database metadata.
- Model output and user-provided content are untrusted input.
- Production access and external side effects require separate approval.

## Project documents

- [Architecture](docs/ARCHITECTURE.md)
- [Messaging protocol](docs/PROTOCOL.md)
- [Implementation roadmap](docs/ROADMAP.md)
- [Local setup](docs/SETUP.md)
- [Founder account provisioning](docs/FOUNDER-BOOTSTRAP.md)
- [Provider onboarding](docs/PROVIDER-ONBOARDING.md)
- [Vercel deployment runbook](docs/VERCEL-DEPLOYMENT.md)
- [Security policy](SECURITY.md)
- [Contribution guide](CONTRIBUTING.md)
