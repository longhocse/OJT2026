# MovieTap frontend

Create React App frontend for browsing movies, selecting and locking seats, creating bookings, reviewing confirmed bookings, and administering supported catalog resources.

## Requirements and setup

- Node.js 18 or newer
- npm with the committed `package-lock.json`
- A compatible MovieTap backend

```bash
npm ci
copy .env.example .env
npm start
```

The development app runs on `http://localhost:3000`. Local `.env*` files are ignored by Git.

## Environment and backend connection

`REACT_APP_API_URL` is the public API base URL, including `/api`:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

CRA embeds every `REACT_APP_*` value into the browser bundle at build time. Never store secrets, signing keys, passwords, or private tokens in these variables. If the variable is omitted, development uses `http://localhost:5000/api`; production uses same-origin `/api`, suitable for a reverse proxy. A separate production API must be supplied while building, for example:

```bash
REACT_APP_API_URL=https://api.example.com/api npm run build
```

The backend CORS allowlist must contain the exact deployed frontend origin using its `CORS_ORIGINS` setting, for example `https://app.example.com`. Do not include paths such as `/api`. The backend accepts `Authorization` and `Content-Type`, and supports credentials; production should use HTTPS for both origins.

## Scripts

| Command                        | Purpose                              |
| ------------------------------ | ------------------------------------ |
| `npm start`                    | CRA development server               |
| `npm test -- --watchAll=false` | Complete non-watch test run          |
| `npm run test:ci`              | Serial deterministic CI tests        |
| `npm run test:coverage`        | Critical-area coverage and threshold |
| `npm run lint`                 | ESLint with zero warnings            |
| `npm run format`               | Apply Prettier                       |
| `npm run format:check`         | Verify formatting                    |
| `npm run build`                | Optimized production bundle          |

Tests mock services or the Axios boundary and never require a live backend or internet. Shared test rendering uses isolated Router, Redux, in-memory Redux Persist, PersistGate, and QueryClient instances.

## Architecture

- Redux Toolkit stores runtime authentication and booking UI state.
- Redux Persist stores only the bearer access token required by the current backend contract.
- `AuthSessionManager` verifies rehydrated tokens with `GET /auth/me`; logout and global `401` handling purge persisted and temporary booking state.
- TanStack Query owns server cache with resource/parameter query keys.
- Services are the only HTTP boundary and use the central Axios client.
- Contract normalizers remove unsupported or sensitive response fields before data reaches UI components.
- Routes and large admin/user pages are lazy-loaded behind Suspense fallbacks.

Client route guards are UX only. Backend middleware remains the authorization authority.

## Booking and seat-lock flow

1. Load a show and its server-owned seat availability.
2. Selecting seats calls the show-scoped lock endpoint.
3. The UI stores the backend `lockToken` and absolute `lockedUntil` value.
4. Selection changes or navigation release the owned lock when possible.
5. Checkout sends `showId`, unique `seatIds`, `paymentMethod`, and the exact lock token.
6. The backend response supplies the official price and booking result.

Expired or conflicting locks clear local selection and force a fresh seat load.

## Static deployment

Deploy the contents of `build/`. Configure the static server/CDN to:

- serve existing hashed assets normally;
- rewrite every non-file application route, including `/movie/*`, `/booking/*`, and `/admin/*`, to `/index.html` with HTTP 200;
- avoid long immutable caching for `index.html`;
- cache hashed files under `/static/` as immutable;
- forward `/api/*` to the backend when using the same-origin production fallback;
- enable HTTPS and compression.

The exact rewrite syntax depends on the hosting platform, so no provider-specific file is committed.

## Production readiness

See [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) for the deployment checklist, verified limitations, and backend blockers. Security/storage notes are in [SECURITY.md](./SECURITY.md).
