# CEB cloud authentication — implementation notes

This branch is development-only. Do not merge or publish until authentication and authorization tests pass.

## Current stage
- `auth.js` contains PBKDF2-SHA-256 password hashing/verification helpers and opaque session-token helpers.
- SQL migrations are staged separately and must be reviewed before applying to Neon.
- The existing Worker routes are not yet wired to these helpers; this file does not mean login is active.

## Required next implementation steps
1. Wire POST /auth/login, GET /auth/me, POST /auth/logout and POST /auth/change-password into worker.js.
2. Enforce login throttling using ceb_login_attempts; return generic invalid-credentials errors.
3. Add admin-only user creation, activation/deactivation, and password reset routes. Never return password hashes.
4. Create the first administrator through a one-time, secret-protected bootstrap process; never hard-code a password or expose credentials in source control.
5. Add ownership checks for all private study reads/writes and explicit published/shared-library rules.
6. Add automated tests for CORS, rate limits, session expiry/revocation, role checks, password changes, and private-study isolation.
7. Apply migrations to the intended Neon database only after reviewing them and backing up the database.
8. Deploy only to the development Worker and test before changing the frontend or production site.

## Password policy
Usernames: 3–32 ASCII letters, digits, dot, underscore or hyphen; case-insensitive.
Passwords: minimum 6 characters, maximum 32 characters. Hash with PBKDF2 and a random salt; never store plaintext.
