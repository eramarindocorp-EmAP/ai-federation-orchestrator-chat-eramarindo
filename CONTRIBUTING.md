# Contributing

## Working agreements

- Keep changes small, reviewable, and tied to an issue or milestone.
- Use TypeScript strict mode when application code is introduced.
- Add tests for routing, authorization, limits, and provider failure paths.
- Never commit credentials, personal access tokens, service-role keys, or production data.
- Do not add provider integrations until their official API contract and data terms have been reviewed.
- Document configuration with placeholder names only; do not include real values.
- Require review for database migrations, security policy changes, and deployment configuration.

## Suggested branch naming

- `feat/<short-description>`
- `fix/<short-description>`
- `docs/<short-description>`
- `chore/<short-description>`

## Pull request checklist

- [ ] Scope and risk described
- [ ] Tests added/updated
- [ ] Authorization and data exposure reviewed
- [ ] Secrets scan passes
- [ ] Logs contain no credentials or sensitive prompts
- [ ] Documentation updated
- [ ] Rollback or migration impact described
