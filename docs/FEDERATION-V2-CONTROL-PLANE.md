# Eramarindo AI Federation v2.0 — Control Plane Upgrade

**Status:** Architecture baseline / implementation specification  
**Target environment:** Development first  
**Repository:** `ai-federation-orchestrator-chat-eramarindo`  
**Governance doctrine:** ONE GATE — ONE STANDARD — ONE COMMAND

> This document defines the next upgrade boundary. It does not claim that capabilities described as target-state are already deployed.

## 1. Executive objective

Evolve the existing authenticated multi-provider chat into a governed AI control plane that can classify work, select agents, execute bounded workflows, evaluate outputs, preserve provenance, and report cost and reliability.

The control plane must remain provider-neutral. Provider APIs are adapters; identity, authorization, policy, orchestration, audit, and user experience remain under Eramarindo control.

## 2. Current verified baseline

- Next.js application with Supabase Auth sign-in.
- Supabase Edge Function `ai-federation-chat` with `verify_jwt=true`.
- FM-001 gateway authorization for `chat:read` and `chat:write`.
- Direct, Broadcast, and Sequential Review modes.
- OpenAI Responses, Gemini Interactions, and DeepSeek Chat Completions adapters.
- Owner-scoped conversation persistence, run/step records, Realtime updates, and client-message deduplication.
- Provider registry and secret-reference checks fail closed.
- CI includes typecheck, unit tests, lint, production build, and Deno typecheck.

**Activation blockers:** no confirmed FM-001 operator principal/role binding; provider secrets and model IDs are not configured/activated; Vercel project deployment is not verified. No live provider execution is claimed.

## 3. Target control-plane architecture

```text
Web Workspace
  └─ Supabase Auth session
      └─ Next.js API boundary
          └─ Supabase Edge Function: Federation Gateway
              ├─ FM-001 identity + scope authorization
              ├─ Request validation + idempotency
              ├─ Policy / risk / budget guard
              ├─ Task Classifier
              ├─ Agent Registry + Capability Resolver
              ├─ Workflow Orchestrator
              │   ├─ Direct execution
              │   ├─ Parallel fan-out / fan-in
              │   ├─ Sequential review
              │   └─ Bounded tool delegation (future)
              ├─ Provider Adapter Interface
              │   ├─ OpenAI
              │   ├─ Gemini
              │   ├─ DeepSeek
              │   └─ Future: Claude / other approved providers
              ├─ Output evaluator + synthesis
              ├─ Audit / usage / telemetry
              └─ Supabase persistence + Realtime
```

The browser must never receive service-role credentials or provider API keys. Provider credentials stay in server-side secret storage. FM-001 remains the authorization authority; the Federation service must not invent a parallel identity system.

## 4. Canonical agent contract

Every provider adapter should implement the same internal contract:

- `capabilities()`: stable capability descriptors, modality, context limit, supported response modes, and tool support.
- `health()`: configuration and reachability state without exposing secrets.
- `execute(request, context)`: normalized request to normalized response.
- `normalizeError(error)`: safe error class, retryability, provider request ID where available.
- `usage(response)`: input/output token counts and provider-reported usage where available.

Normalized request fields:
- `task_id`, `correlation_id`, `agent_id`
- `system_instruction`, `input`, `response_format`
- `max_output_tokens`, `timeout_ms`
- `metadata` with non-secret trace attributes

Normalized response fields:
- `content`, `provider`, `model`, `finish_reason`
- `usage`, `latency_ms`, `provider_request_id`
- `safety_status`, `warnings`

Never normalize away meaningful provider safety refusals or fabricate usage numbers.

## 5. Task classification and routing

The classifier should produce a validated structured decision, not an unconstrained free-form instruction:

- task category: research, strategy, coding, data analysis, writing, operations, or mixed
- risk tier: low, moderate, high, restricted
- required capabilities: text, vision, files, structured output, code, or other approved modality
- workflow: direct, broadcast, sequential review
- output contract and acceptance criteria
- data sensitivity label
- budget ceiling and deadline

Routing rules:
1. Enforce FM-001 authorization before any provider call.
2. Reject unsupported modalities and restricted tasks.
3. Select only registry-enabled agents with active secret references and compatible capabilities.
4. Use explicit user selection when supplied; otherwise choose the smallest capable set.
5. Do not send confidential data to a provider unless the relevant data policy explicitly permits it.
6. If no eligible agent exists, return a clear blocked status; never silently route to an unapproved provider.

## 6. Workflow semantics

### Direct
One eligible agent produces the response. Persist request, execution step, normalized response, usage, and final status.

### Broadcast
Two or more eligible agents execute in parallel. Each result is preserved independently. Synthesis must distinguish agreement, disagreement, missing evidence, and uncertainty; it must not average incompatible claims.

### Sequential Review
Agent A drafts; Agent B critiques against the declared acceptance criteria; the orchestrator returns the reviewed result and preserves both stages. Review is not proof of correctness.

### Future delegated workflows
Tool execution, external side effects, autonomous loops, and agent-to-agent messaging require a separate permission model, per-tool allowlists, approval gates, replay protection, and bounded step/depth limits. They are not implicitly authorized by chat access.

## 7. Reliability and resilience requirements

- Per-provider timeout and bounded retry with exponential backoff + jitter.
- Retry only transient, idempotent provider failures; do not retry validation, authorization, or policy denials.
- Circuit breaker per provider/model and concurrency limits.
- Partial-success semantics for Broadcast; preserve successful outputs when another provider fails.
- Idempotency key scoped to authenticated principal and operation.
- Correlation ID propagated through gateway, run, step, provider request, and audit event.
- Explicit cancellation and terminal states for long-running workflows.
- No unbounded agent loops; enforce maximum agents, steps, tokens, wall-clock duration, and spend.

## 8. Governance, security, and data handling

- FM-001 is the single authority for principal identity, environment, roles, and scopes.
- Least privilege: Development operator access only after explicit owner confirmation; no automatic Production or administrator grants.
- Secrets: server-side only; secret references in registry, never secret values.
- RLS: owner/team membership checks for every read; server-only writes for privileged workflow state.
- Audit: record actor, action, policy decision, correlation ID, provider/model, timestamps, status, and usage. Do not log API keys, bearer tokens, or unnecessary prompt content.
- Data minimization: provider-specific routing based on data classification and retention configuration.
- Human approval required before external side effects, financial commitments, publication, or changes to production infrastructure.
- Prompt injection and tool-output content are untrusted data; never treat retrieved content as policy or system instruction.

## 9. Observability and scorecard

Capture per run and per step:
- success / partial / failure rate
- latency p50 / p95
- timeout and retry rate
- input/output tokens and estimated cost (only where pricing metadata is configured)
- provider/model availability
- policy blocks and authorization denials
- evaluator scores and human feedback

Dashboard views:
- Federation health by provider
- Agent activation and capability matrix
- Run volume and workflow outcomes
- Cost and token trends
- Error taxonomy and latency
- Audit trail and access reviews

Cost must be labelled estimated unless provider billing data is directly reconciled.

## 10. Evaluation and quality controls

Build a versioned evaluation suite before enabling autonomous routing:
- golden task set per task category
- factuality and citation checks for research
- test coverage and executable checks for code
- schema validation for structured output
- consistency and disagreement checks for multi-agent synthesis
- refusal and policy regression tests
- prompt-injection resistance tests
- latency and cost budgets

Track evaluator version, prompt version, model identifier, and dataset version. Do not present model self-evaluation as independent verification.

## 11. Data model evolution (proposed)

Retain existing conversation/run/message/step entities. Add migrations only when a concrete implementation requires them:
- `ai_federation_agent_capabilities`: versioned capability descriptors
- `ai_federation_policies`: environment-scoped routing and data policies
- `ai_federation_usage`: normalized usage and pricing provenance
- `ai_federation_evaluations`: evaluator results and rubric version
- `ai_federation_audit_events`: security-relevant decisions and actions

All new tables require RLS, explicit grants, owner/team scoping, and tests. Avoid storing duplicate provider secrets or raw credentials.

## 12. Implementation sequence and exit criteria

### Phase A — Baseline synchronization
- Confirm repository, migration, Edge Function, and deployment versions.
- Keep current chat fail-closed while activation dependencies are absent.
- Review and merge the existing deployment-safeguard PR only after human review.

### Phase B — Contract and policy layer
- Implement typed provider adapter interface and capability registry.
- Add request schema/versioning, policy decision object, and structured errors.
- Unit-test adapter normalization and policy denial paths.

### Phase C — Orchestration engine
- Separate workflow planning from provider execution.
- Implement bounded parallel fan-out/fan-in and sequential review.
- Persist every step and support partial failure/cancellation.

### Phase D — Evaluation and observability
- Add versioned evaluation fixtures, audit events, usage accounting, and health metrics.
- Add dashboards only after event definitions and data quality are tested.

### Phase E — Team workspace and production readiness
- Add explicit team membership and workspace-level RLS before shared rooms.
- Deploy Preview first, run security and acceptance tests, then require an explicit Production release approval.

Exit criteria for each phase: automated tests pass, migration rollback strategy documented, threat-model review complete, no secret leakage, and operator acceptance recorded.

## 13. Immediate activation checklist

- [ ] Owner confirms which existing Supabase Auth account is theirs.
- [ ] FM-001 grants only Development `operator` with `chat:read` and `chat:write`.
- [ ] Owner configures provider API keys and valid model IDs in Supabase Edge Function Secrets.
- [ ] Provider registry rows are activated only after a credential-backed smoke test.
- [ ] Vercel project is imported and Preview deployment verified.
- [ ] PR #3 is reviewed and merged by an authorized repository maintainer.
- [ ] Live provider test and end-to-end audit verification pass.

## 14. Non-goals and explicit boundaries

- No direct connection to the current ChatGPT web session; the OpenAI agent is an API-backed runtime agent.
- No automatic access to Gemini, DeepSeek, Claude, Microsoft Copilot, or GitHub Copilot accounts through chat URLs.
- Public share links are reference material, not a secure machine-to-machine federation protocol.
- No Production access, external side effects, or autonomous execution without separate authorization and approval.

---
**Decision principle:** centralize governance and orchestration; decentralize specialist execution; preserve provenance; require evidence before declaring readiness.
