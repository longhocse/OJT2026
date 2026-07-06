# MovieTap

MovieTap is a movie-ticket booking system using Express + TypeORM + SQL Server for the backend and React + TanStack Query + Redux for the frontend.

## Current capabilities

- Admin cinema, room and visual seat-layout management.
- Admin show scheduling with duration checks, room conflict detection and cleaning buffer.
- User seat locking, booking, mock/cash payment lifecycle, signed tickets and idempotent check-in.
- Admin booking, payment/refund, dashboard stats and audit logs.
- User profile, password changes, forgot/reset password and refresh-token rotation.
- Movie/genre management with Movie–Genre many-to-many, review eligibility and review moderation.
- Data safety: referenced movies/cinemas/rooms are deactivated instead of hard-deleted.

## Run locally

Backend:

```powershell
cd backend
npm ci
Copy-Item .env.example .env
npm start
```

Frontend:

```powershell
cd frontend
npm ci
npm start
```

Fill backend `.env` first. `PAYMENT_WEBHOOK_SECRET` and `TICKET_QR_SECRET` must be independent random strings of at least 32 characters. TypeORM `synchronize` remains disabled; apply SQL migrations from `backend/migrations` for database changes.

## Quality gates

Backend:

```powershell
cd backend
npm test
npm run lint
npm run format:check
```

Frontend:

```powershell
cd frontend
npm run test:ci
npm run lint
npm run format:check
npm run build
```
