# Frontend security notes

## Public build-time configuration

Create React App replaces every `REACT_APP_*` variable while building the static bundle. Anyone who can download the bundle can read those values. They must contain public configuration only, such as `REACT_APP_API_URL`; never put API keys, JWT signing secrets, database credentials, passwords, or private tokens in them.

Copy `.env.example` to a local ignored `.env` when needed. Local environment files are ignored by Git and are not removed automatically by the application or its tooling.

## Authentication storage

The backend currently returns a bearer access token, so the frontend persists only that token for compatibility. User profile data is not persisted and is rebuilt through `GET /auth/me` after rehydration. Logout and global `401` handling clear Redux state, persisted auth storage, and temporary checkout data.

This does not make browser storage immune to XSS: JavaScript executing in the application origin could still read the access token. Avoid inline/untrusted HTML, keep dependencies patched, and prefer a backend-issued `HttpOnly`, `Secure`, `SameSite` cookie if the backend authentication design is changed later.

Client-side route guards improve UX but are not authorization controls. Every protected/admin operation must continue to be authorized by the backend.
