# MetaVR Backend

This package hosts the standalone Nest.js service that will eventually power all privileged MetaVR operations (user management, supervisor configuration, analytics, etc.).

## Stack

- **Runtime:** Node.js 18+
- **Framework:** [Nest.js](https://nestjs.com/) (Express adapter)
- **Language:** TypeScript

## Scripts

```bash
npm run start        # development mode with TS-node
npm run start:dev    # watch mode (ts-node-dev)
npm run build        # compile to dist/
npm run start:prod   # run compiled JS with node
npm run lint         # eslint
```

> ℹ️ Install dependencies with `npm install` inside this `backend/` directory before running the scripts.

## Project Layout

```
backend/
├── src/
│   ├── app.module.ts       # Root module
│   ├── auth/               # Authentication controllers/services
│   ├── firebase/           # Firebase admin providers
│   └── main.ts             # Bootstrap file
├── test/                   # (placeholder) e2e/unit tests
├── tsconfig*.json          # Typescript configs
├── nest-cli.json           # Nest CLI configuration
└── package.json
```

## Next Steps

- Implement shared infrastructure modules (logging, config, database).
- Mirror the TODO list in `BACKEND_IMPLEMENTATION_NOTES.md` to migrate admin/supervisor features off the frontend.
- Wire this service to the existing Firestore instance (or another persistence layer) and expose REST endpoints for the dashboard to consume.

### Required Environment Variables

| Key | Description |
| --- | --- |
| `SESSION_SECRET` | Required HMAC secret used for boot-time validation and as a fallback signing key |
| `SESSION_PRIVATE_KEY` / `SESSION_PUBLIC_KEY` | Optional PEM keypair that enables RS256 signing/verification; both must be present to activate |
| `SESSION_TOKEN_ISSUER` | (Optional) Overrides the default `metavr-backend` issuer claim |
| `SESSION_TOKEN_AUDIENCE` | (Optional) Overrides the default `metavr-dashboard` session audience |
| `HANDSHAKE_TOKEN_AUDIENCE` | (Optional) Overrides the default `metavr-handshake` audience for interim tokens |
| `FIREBASE_SERVICE_ACCOUNT_JSON` _or_ `FIREBASE_SERVICE_ACCOUNT_KEY` | Firebase Admin credentials (raw JSON or Base64 encoded JSON) |
| `DASHBOARD_ORIGIN` | Optional comma-separated list of allowed CORS origins used by the CSRF guard |
| `SYNC_APPS_ON_STARTUP` | (Optional) Set to `false` to skip automatic app discovery + sync when the backend boots (defaults to `true`) |
| `APPS_DIRECTORY` | (Optional) Absolute path to the local `apps/` workspace. Defaults to `../apps` relative to the backend folder |

> Run `./scripts/validate-env.sh` from the repository root to verify both backend and dashboard secrets before deploying.

## Session & Handshake Hardening

- `/auth/login` now issues a short-lived handshake token exclusively via an `HttpOnly` cookie. The token is single-use, stored in Firestore, and expires after 60 seconds.
- `/auth/handshake` reads the cookie (or optional JSON payload for tests), validates issuer/audience/subject claims, consumes the stored record, and upgrades the user to a session cookie.
- Session cookies carry a unique `sessionId` (`jwtid`) and are persisted in Firestore for revocation + inactivity tracking. Logout marks the session as revoked, and idle sessions (>6h) are automatically invalidated.
- CSRF protections enforce Origin/Referer checks for every mutating auth endpoint while keeping `sameSite='strict'`.
- For maximum isolation, provide `SESSION_PRIVATE_KEY`/`SESSION_PUBLIC_KEY` so the dashboard can only verify RS256 tokens with the public key—signing remains backend-only.

### Secret Rotation

Store `SESSION_SECRET`, the optional RSA keypair, and related config in your secrets manager (AWS Secrets Manager, GCP Secret Manager, 1Password, etc.). Rotate the values by:

1. Uploading the new secret/keypair into the manager.
2. Updating deployment targets or CI runners to expose the new environment variables.
3. Redeploying the backend (old sessions will be revoked as the signing key changes).
