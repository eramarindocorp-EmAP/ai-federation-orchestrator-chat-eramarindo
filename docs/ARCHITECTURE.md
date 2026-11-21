# System Architecture — ERAMARINDO AI FEDERATION v1

## 1. Design principles

- Central orchestration with explicit, auditable delegation.
- Provider-neutral agent contract; provider-specific adapters.
- Human control over access, spend, data disclosure, and external actions.
- Durable event history with bounded context assembly.
- Fail closed on missing credentials, authorization, policy, or budget.

## 2. Logical components

### Web workspace
Authenticated users create rooms, invite configured agents, select execution mode, inspect run status, and review outputs.

### API boundary
All browser requests are authenticated and authorized server-side. The browser never receives provider API credentials. The API validates payloads and assigns request/run identifiers.

### Orchestrator
The orchestrator:
1. validates room membership and agent availability;
2. checks model allowlists, policies, and budgets;
3. builds a bounded context from permitted room messages;
4. executes a direct, broadcast, sequential, or parallel plan;
5. records each transition and provider result;
6. publishes events to authorized room subscribers;
7. applies cancellation, timeout, retry, and loop limits.

### Provider adapters
Each adapter implements a common interface but preserves provider-specific request/response semantics. Provider names and model IDs are configuration, not hard-coded assumptions.

### Persistence
PostgreSQL stores users/profiles, rooms, membership, agent configurations (never raw secrets), messages, runs, run steps, usage records, and audit events. Provider secrets live in a secrets manager or server environment.

### Realtime
Realtime transport delivers persisted events. The database is the durable source of truth; clients can reconnect and resume from an event cursor.

## 3. Conceptual data model

- `profiles(id, display_name, role)`
- `rooms(id, name, created_by, visibility, created_at)`
- `room_members(room_id, user_id, role)`
- `agents(id, provider, display_name, model_id, capabilities, enabled)`
- `room_agents(room_id, agent_id, enabled)`
- `messages(id, room_id, run_id, sender_type, sender_id, content, created_at)`
- `runs(id, room_id, requested_by, mode, status, correlation_id, created_at, completed_at)`
- `run_steps(id, run_id, agent_id, step_no, status, input_message_id, output_message_id, error_code)`
- `usage_records(id, run_id, agent_id, input_units, output_units, estimated_cost, currency, recorded_at)`
- `audit_events(id, actor_id, action, resource_type, resource_id, metadata, created_at)`

This is a logical model; migrations and row-level security policies must be implemented and reviewed before production use.

## 4. Orchestration modes

| Mode | Behaviour | Guardrail |
|---|---|---|
| direct | One selected agent responds | One provider execution |
| broadcast | Several agents receive one bounded prompt | Concurrency and spend cap |
| sequential_review | Output passes through an ordered reviewer chain | Max steps and context budget |
| parallel_tasks | Specialized agents receive separately scoped tasks | Per-agent timeout and cancellation |
| facilitated_room | Orchestrator selects/requests turns | Max turns, max rounds, stop condition |

Unbounded autonomous loops are prohibited. The orchestrator owns turn scheduling; agents cannot independently create unlimited runs.

## 5. Message lifecycle

`received → authorized → queued → running → succeeded / failed / cancelled`

Every transition is recorded. Provider retries use idempotency/correlation identifiers where supported. A failed provider call must not be represented as a successful assistant response.

## 6. Security boundaries

- Authenticate every user and verify room membership for every read/write.
- Apply least-privilege service roles and database row-level security.
- Keep provider calls server-side.
- Redact secrets and sensitive headers from logs.
- Restrict outbound network targets to approved provider endpoints.
- Validate provider output as untrusted content.
- Do not execute code, tools, or external actions from model text without policy checks and, where required, human approval.
- Add per-user and per-room usage quotas.
- Define retention, export, and deletion policies before production.

## 7. Operational requirements

- Structured logs with request_id, correlation_id, room_id, run_id, provider, model, duration, status.
- Metrics for success/error rate, latency, token usage, cost, queue depth, and cancellations.
- Alerts for repeated failures, runaway usage, and unexpected provider/model configuration changes.
- Health checks must distinguish application health from provider credential/connectivity health.

## 8. Deployment topology

Proposed: Next.js workspace and API on Vercel; Supabase Auth/Postgres/Realtime for identity, persistence, and event delivery. If long-running orchestration exceeds serverless execution limits, use a separately managed worker/queue. This choice must be validated against deployment limits and workload tests before production.
