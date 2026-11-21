# FM-001 Development Account Provisioning

## Why this step exists

Supabase Auth identifies a signed-in user. FM-001 separately authorizes that identity as a registered principal with explicit roles and scopes. Creating an Auth account does **not** automatically grant Federation access.

The current Development project has no rows in `federation.principals` or `federation.principal_roles`. New accounts therefore remain blocked until an authorized database administrator provisions them.

## 1. Create a permanent Supabase Auth account

1. Open the Federation application.
2. Register with a company-controlled email and a strong password, or sign in if the account already exists.
3. Complete email verification if the project requires it.
4. Do not use anonymous sign-in for a privileged Federation operator account.

## 2. Identify the Auth user UUID

In Supabase SQL Editor, locate the intended account and confirm it is the correct user before provisioning:

```sql
select id, email, email_confirmed_at, created_at
from auth.users
where lower(email) = lower('<YOUR_COMPANY_EMAIL>');
```

Use the returned `id` as `<AUTH_USER_UUID>`. If no row is returned, stop and complete account registration first. Do not provision a different user.

## 3. Grant minimum Development chat permissions

Run the following only after verifying the Auth user UUID. This creates or activates one human principal and grants the `operator` role with only the two chat scopes required by the application.

```sql
with provisioned as (
  insert into federation.principals
    (issuer, subject, principal_type, display_name, status)
  values
    (
      'https://rlpkhatlemuhmmzeuzqf.supabase.co/auth/v1',
      '<AUTH_USER_UUID>',
      'human',
      'Eramarindo Federation Operator',
      'active'
    )
  on conflict (issuer, subject)
  do update set
    display_name = excluded.display_name,
    status = 'active',
    updated_at = now()
  returning principal_id
)
insert into federation.principal_roles
  (principal_id, role_name, environment, scopes, granted_by)
select
  principal_id,
  'operator',
  'development',
  array['chat:read', 'chat:write']::text[],
  null
from provisioned
on conflict (principal_id, role_name, environment)
do update set
  scopes = excluded.scopes,
  valid_from = now(),
  valid_until = null;
```

This does not grant production access, Founder approval authority, or database administration privileges.

## 4. Verify access

1. Sign out of the Federation application.
2. Sign in again to refresh the session.
3. The application calls the existing `fm001-gateway` with the required scope.
4. The status should change from `ACCESS PENDING` to `AUTHORIZED · DEVELOPMENT` once the principal and scopes are valid.

If access remains blocked, inspect the FM-001 gateway response and the principal's issuer, subject, status, environment, and scope grants. Never bypass the gateway or add client-side service-role credentials.

## Governance

- Provision only named, verified company accounts.
- Keep roles environment-scoped and least-privilege.
- Production access requires a separate approval and provisioning process.
- Do not grant `founder_approver` or `federation_admin` merely to make chat work.
- Record who authorized each manual provisioning action in the company's change register.
