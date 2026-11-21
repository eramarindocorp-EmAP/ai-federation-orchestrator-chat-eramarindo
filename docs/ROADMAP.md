# Implementation Roadmap

## Phase 0 — Repository foundation (current)
- [x] Verify repository access and empty initial state
- [x] Add project charter and initial architecture
- [ ] Add messaging protocol, contribution guide, and security policy
- [ ] Add application skeleton and automated checks

**Exit criteria:** reproducible local setup, static checks and tests run in CI, no secrets committed.

## Phase 1 — Identity and workspace
- Authentication and profile management
- Create/list rooms
- Room membership and roles
- Persist messages and audit events
- Row-level security and authorization tests

**Exit criteria:** users can only access rooms where they are members; all writes are attributable.

## Phase 2 — First provider adapter
- Provider-neutral adapter interface
- One provider configured through server-side secret
- Health/connectivity diagnostic without exposing secrets
- Bounded input/output tokens, timeout, and cost controls
- Unit tests with mocked provider responses

**Exit criteria:** authenticated user can send a message to one configured provider and receive a persisted response.

## Phase 3 — Group chat and realtime
- Multi-agent room selection
- Realtime event delivery with reconnect
- Direct and broadcast modes
- Run cancellation and status display

**Exit criteria:** two or more configured providers can respond in one room; failures are visible and attributed.

## Phase 4 — Collaboration workflows
- Sequential review and parallel tasks
- Context selection and redaction
- Human approval workflow
- Loop/hop limits and concurrency caps

**Exit criteria:** bounded multi-agent workflow completes and produces traceable run history.

## Phase 5 — Governance and production readiness
- Usage ledger and budgets
- Retention/export/deletion
- Monitoring, alerts, and operational runbooks
- Security review and load tests
- Deployment and rollback procedure

**Exit criteria:** documented owner, incident process, spend limits, backup/restore test, and security approval.

## Initial acceptance tests

1. Unauthenticated API calls are rejected.
2. A non-member cannot read or write a room.
3. Provider credentials never appear in browser bundles or logs.
4. Disabled or unconfigured providers fail with an explicit status.
5. A run cannot exceed configured agent, turn, time, or budget limits.
6. Realtime clients cannot subscribe to unauthorized rooms.
7. Provider timeout/error is stored as a failed step, not a successful response.
8. Duplicate submission with the same idempotency key does not create duplicate runs.
