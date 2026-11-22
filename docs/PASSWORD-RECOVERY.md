# Password Recovery — Eramarindo AI Federation

## Purpose

This flow allows an existing Supabase Auth user to recover access without administrator intervention to change the password. It does not create a new Auth user and does not modify FM-001 roles or scopes.

## User flow

1. On the Federation login form, choose **Lupa password?**.
2. Enter the email address used by the existing Development account.
3. The application calls `supabase.auth.resetPasswordForEmail` and sends a recovery redirect to the current application origin.
4. The user opens the recovery email and follows its one-time link.
5. Supabase returns the browser to the Federation application. The client listens for the `PASSWORD_RECOVERY` auth event.
6. The user enters and confirms a new password. The application calls `supabase.auth.updateUser({ password })`.
7. After success, the user can continue into Federation using the recovery session.

The login screen displays a generic request confirmation so it does not reveal whether an email address is registered. The recovery form requires at least 12 characters and an exact confirmation match.

## Required Supabase URL configuration

In the Development project, open **Authentication → URL Configuration**.

- Set **Site URL** to the stable application URL used as the primary Development entry point.
- Add the active Vercel deployment origin to **Additional Redirect URLs**. The current deployment shown during implementation is:

  `https://ai-federation-orchestrator-chat-eramarindo-ri3r-i42ehwyw.vercel.app/**`

- Add local development only when needed:

  `http://localhost:3000/**`

- For recurring Vercel Preview deployments, use a scoped wildcard matching the actual Vercel account/team slug, following Supabase's documented pattern:

  `https://*-<team-or-account-slug>.vercel.app/**`

Do not use a wildcard for every `vercel.app` subdomain. Redirect destinations must remain restricted to the Eramarindo application. When the project receives a stable custom domain, add that exact domain and prefer it as the Site URL.

## Email delivery prerequisites

The recovery request depends on Supabase Auth email delivery and the project's **Recovery** email template. Before relying on the feature, verify that the Development project can deliver Auth emails to the operator mailbox. For regular operational use, configure an authorized SMTP provider in Supabase Auth settings and test delivery, spam placement, sender identity, and link expiry.

The hosted project's built-in Supabase email service is restricted: it only delivers to email addresses belonging to the Supabase organization's team, and it has low project-wide rate limits with no delivery SLA. Before testing this feature with the operator mailbox, verify that the mailbox is an organization team member. Otherwise, configure a custom SMTP provider under **Authentication → SMTP Settings**. Keep SMTP credentials in Supabase Auth settings; never add them to the browser or Git repository. See https://supabase.com/docs/guides/auth/auth-smtp and https://supabase.com/docs/guides/auth/testing-auth-flows.

## Security boundaries

- Recovery is handled by Supabase Auth; the app does not store password reset tokens.
- The browser uses only the Supabase publishable key. Never place service-role/secret keys or AI provider API keys in the client.
- Password changes are performed only after Supabase returns a valid recovery session.
- The UI uses a generic request confirmation to reduce account enumeration.
- FM-001 authorization remains separate. Resetting a password does not create, elevate, or change Federation roles or scopes.
- Development recovery URLs must not be reused for Production. Configure Production URL allowlists and email delivery separately after formal release approval.

## Official references

- Supabase JavaScript `resetPasswordForEmail`: https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail
- Supabase JavaScript `updateUser`: https://supabase.com/docs/reference/javascript/auth-updateuser
- Supabase Auth redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
- Supabase Auth email templates: https://supabase.com/docs/guides/auth/auth-email-templates
