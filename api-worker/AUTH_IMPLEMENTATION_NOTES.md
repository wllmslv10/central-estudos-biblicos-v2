# CEB cloud authentication — implementation notes

This branch is development-only. Do not merge, publish the frontend, deploy the Worker, or apply migrations to the production Neon branch until the review and tests below are complete.

## Implemented in the development branch

- `auth.js` provides PBKDF2-SHA-256 password hashing and verification (310,000 iterations), opaque random session tokens, SHA-256 token hashes, and seven-day session expiry.
- `worker.js` implements login, current-session lookup, logout, forced password change, admin bootstrap, admin user creation/listing/activation, and study CRUD routes.
- Login failures are counted by normalized username in a 15-minute window; after eight failures, login is temporarily blocked.
- Study reads are limited to the user's private studies and published shared studies. Writes and deletes require ownership; only admins can publish shared studies.
- The frontend has login/password-change screens and calls the Worker through `src/cebApi.ts`.
- The Cloudflare deployment workflow is manual-only (`workflow_dispatch`) to prevent feature-branch commits from deploying automatically.

## Database migration status

The two SQL migrations are staged in `migrations/`. They add username/password/account-state fields and session/rate-limit tables without deleting existing user or study rows. They must be reviewed and applied only to the intended Neon database after explicit authorization and a backup. The production database has not been migrated as part of this code work.

## Required verification before release

1. Run the frontend TypeScript/Vite production build and fix any build errors.
2. Run Worker syntax/build checks and add automated tests for authentication, session expiry/revocation, rate limiting, role enforcement, ownership isolation, malformed requests, and CORS.
3. Verify the CORS preflight headers support every header the browser actually sends. The bootstrap endpoint expects `X-CEB-Bootstrap-Secret`, while the current preflight allow-list only names `Content-Type, Authorization`; browser-based bootstrap would fail until reconciled. If bootstrap is performed by a trusted command-line client, document that explicitly instead.
4. Review the bootstrap secret comparison and ensure the secret is removed from Worker configuration immediately after the first administrator is created.
5. Verify that password change, login/logout, and account deactivation work end-to-end against a disposable/test database.
6. Check cloud-study editing for duplicate local entries and verify how pre-existing local/IndexedDB materials are handled; do not silently delete or overwrite local material.
7. Only after the above checks pass, ask for approval before any production migration or deployment.

## Known implementation considerations

- The login-attempt table currently records attempts but does not automatically prune old rows; plan bounded cleanup.
- `POST /auth/change-password` accepts the new password with a valid session and does not ask for the current password. This may be intentional for the forced first-login flow; verify the UX and policy before release.
- The browser frontend uses a Bearer token in in-memory state; refreshing the page may sign the user out. Confirm this behavior is acceptable before release.
- Do not put credentials, bootstrap secrets, or tokens in source control, logs, or chat.

## Password policy

Usernames: 3–32 ASCII letters, digits, dot, underscore or hyphen; case-insensitive.
Passwords: 12–200 characters. Passwords are stored only as PBKDF2-derived hashes, never as plaintext.
