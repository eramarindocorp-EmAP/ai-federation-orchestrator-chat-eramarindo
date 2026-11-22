# Eramarindo AI Federation — Supabase Environment Separation

## Environment decision

- **Production project:** `Eramarindo Project & Ecosystem`, project ref `rlpkhatlemuhmmzeuzqf`. The Supabase Dashboard labels its `main` branch **PRODUCTION**. Do not use it for Development testing.
- **Development candidate:** `eramarindocorporation@gmail.com's Project`, project ref `httfqmypknfwcbgpkrkw`. This is a separate Supabase project in the same Free organization.

The Development candidate previously hosted the legacy FM-001 model. Its existing `federation.members`, `federation.registry`, `federation.messages`, and `federation.audit_events` tables are retained. At bootstrap time they contained 7 members, 2 registry rows, 0 messages and 0 audit events. No Auth users existed in that project.

## Applied Development migrations

The following migrations are recorded on project `httfqmypknfwcbgpkrkw`:

| Version | Name |
|---|---|
| 20261122033732 | `fm001_dev_control_plane_bootstrap` |
| 20261122033811 | `seed_chatgpt_development_adapter` |
| 20261122033817 | `ai_federation_chat_v1` |
| 20261122033820 | `ai_federation_chat_restrict_anonymous` |
| 20261122033824 | `ai_federation_chat_owner_permanent_users` |
| 20261122033827 | `ai_federation_provider_registry_status` |

The chat migration source is already present in the repository under the original migration filenames from the first deployment. These project-specific migration versions were created by the Supabase remote migration tool. Do not run an automatic production migration push until the migration history mapping is reconciled.

## Edge Functions

The Development project has these functions active with JWT verification enabled:

- `fm001-ai-gateway` — legacy runtime, retained for compatibility.
- `fm001-gateway` — new FM-001 least-privilege authorization gateway.
- `ai-federation-chat` — current AI Federation chat orchestration.

The new schema additions are additive. Existing legacy members and registry records were not deleted or rewritten.

## Provider state

The new registry entries `chatgpt-primary`, `gemini-primary`, and `deepseek-primary` are all `pending`. Provider connections are also pending. Keep this state until server-side API secrets are configured and individual live handshakes succeed.

## Required Vercel environment split

Configure the Vercel project so Preview and Production use different Supabase projects:

### Preview / Development

- `NEXT_PUBLIC_SUPABASE_URL=https://httfqmypknfwcbgpkrkw.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = the publishable key from the Development project

### Production

Keep the existing Production values bound only to project ref `rlpkhatlemuhmmzeuzqf`. Do not copy Development API keys or provider secrets into Production.

Only the Supabase publishable key may be exposed as a `NEXT_PUBLIC_*` value. Never expose a Supabase secret/service-role key, legacy secret key, SMTP credential, or AI provider API key in the browser.

## Auth and email setup still required

1. In the Development project, set **Authentication → URL Configuration → Additional Redirect URLs** to allow the Vercel Preview host pattern:

   `https://*-eramarindo-trinity.vercel.app/**`

   Add `http://localhost:3000/**` only if local testing is required.

2. Set the Development Site URL to the chosen stable Development application URL once that URL is confirmed. Do not change the Production Site URL during Development setup.

3. Create the Development Auth account in this project. Auth users are project-scoped; the Production Auth user is not automatically present in this Development project.

4. Provision the new Auth user as an FM-001 Development principal only after sign-up. Use the new project's Auth UUID; never reuse a user UUID from Production.

5. Confirm email delivery. Supabase's built-in email sender is restricted to authorized organization team addresses. Configure an approved custom SMTP provider in the Development project's Auth settings if the operator mailbox is not authorized by the built-in sender.

## Release gate

Do not mark Development RUN until:

- Preview uses the Development Supabase URL and publishable key.
- The operator Auth user has been created and provisioned with `operator`, `development`, `chat:read`, and `chat:write`.
- Password recovery email delivery and password update have been tested.
- Each provider has a successful live handshake and persisted test response.
- Only then may the corresponding agent and REST connection be activated.
