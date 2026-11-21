# Security Policy

## Scope

This repository is in bootstrap stage. Do not submit real credentials, production data, or sensitive conversation exports as issues or pull requests.

## Reporting

Report suspected vulnerabilities privately to the repository administrators using a trusted private channel. Include affected component, impact, reproduction steps, and suggested mitigation. Do not publish exploit details before a fix is available.

## Baseline requirements

- Keep API keys and database secrets out of source control.
- Rotate any credential accidentally committed; deleting a file is not sufficient.
- Use least-privilege service roles and row-level security.
- Validate authentication, room membership, and agent permissions server-side.
- Apply provider allowlists, rate limits, execution budgets, and bounded retries.
- Treat model output, uploaded documents, and retrieved content as untrusted.
- Require human approval before consequential external actions.
