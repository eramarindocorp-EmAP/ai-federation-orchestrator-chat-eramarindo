# Eramarindo AI Federation Orchestrator & Chat

> ONE GATE — ONE STANDARD — ONE COMMAND  
> ONE TEAM — MULTIPLE INTELLIGENCES — ONE COLLECTIVE MISSION

A centralized, human-governed multi-model workspace for routing tasks, coordinating AI-to-AI exchanges, and preserving approved shared knowledge.

## Project status

**Bootstrap / architecture phase.** This repository was verified as accessible, public, and empty before initialization. No provider integrations, running deployment, or live model-to-model chat are claimed at this stage.

## Objectives

- Provide one workspace for human-to-AI and orchestrated AI-to-AI conversations.
- Connect model providers through explicit, separately configured API credentials.
- Support direct, broadcast, sequential-review, and parallel-task orchestration patterns.
- Persist conversation events and approved knowledge with tenant and role boundaries.
- Add traceability, budgets, rate limits, redaction, and human approval gates.

## Proposed v1 stack

| Layer | Proposed technology | Responsibility |
|---|---|---|
| Web application | Next.js / React | Federation chat and administration UI |
| Orchestrator API | Node.js / TypeScript | Routing, runs, tool policy, provider adapters |
| Realtime | Supabase Realtime (or WebSocket gateway) | Live conversation updates |
| Database | Supabase PostgreSQL | Users, rooms, agents, messages, runs, audit events |
| Deployment | Vercel for web/API where suitable | Application hosting |
| Source control / CI | GitHub Actions | Checks, tests, deployment workflow |

The stack is a proposal, not a claim that services have already been provisioned.

## Initial architecture

1. **Human user** creates a room or task and selects participating agents.
2. **Orchestrator** validates permissions, policy, budget, and requested execution mode.
3. **Provider adapters** call each configured provider using server-side credentials.
4. **Message/event layer** records requests, responses, errors, and execution status.
5. **Workspace** streams events to authorized participants.
6. **Knowledge workflow** promotes only reviewed, approved outputs into shared knowledge.

AI models do not share hidden internal state. Each provider call receives only the context intentionally assembled and authorized by the orchestrator.

## v1 conversation modes

- **Direct:** one user message to one selected model.
- **Broadcast:** same prompt sent to several selected models.
- **Sequential review:** output from one model is passed to the next reviewer.
- **Parallel tasks:** specialized agents work concurrently; the orchestrator collects results.
- **Facilitated room:** orchestrator manages turns and prevents uncontrolled agent-to-agent loops.

## Security requirements

- Never commit API keys, access tokens, database passwords, or production secrets.
- Store provider credentials only in managed server-side environment variables or a secrets manager.
- Enforce authentication, room membership, role-based authorization, and server-side provider calls.
- Apply per-user/provider rate limits, usage budgets, request timeouts, and retry limits.
- Treat model outputs and retrieved documents as untrusted input; do not allow them to override system policy.
- Require explicit human approval for external side effects and consequential actions.
- Log actor, model/provider, request ID, timestamps, token/usage metadata when available, and approval status.
- Provide deletion/retention controls and avoid storing sensitive data unless necessary.

## Provider onboarding

Each provider must be integrated and tested independently. A consumer chat subscription does not automatically include API access. Required credentials, endpoints, model identifiers, terms, and pricing must be verified for each provider before activation.

Initial candidates: OpenAI, Google Gemini, DeepSeek, Anthropic Claude. Microsoft Copilot and GitHub Copilot require product-specific integration review; do not assume they expose the same generic chat API as model providers.

## Planned implementation milestones

1. Repository bootstrap, architecture decisions, linting, tests, and secret handling.
2. Authentication, users, rooms, messages, and event persistence.
3. Provider adapter contract and first provider integration.
4. Realtime group chat and controlled orchestration modes.
5. Additional provider integrations and capability registry.
6. Evaluation, audit, usage controls, and deployment hardening.

## Local development

Detailed setup instructions will be added as implementation files land. Do not deploy this project until required environment variables, authentication, database policies, and provider integrations have been configured and tested.

## Governance

The human executive owner retains control over provider credentials, data access, budgets, deployment, and consequential actions. Ferguson is a conversational coordination role; it is not an autonomous credential holder or a persistent process outside the applications and tools explicitly connected to this system.
