# Show-scoped seat locking

Seat availability belongs to a show, not to the physical seat. The
`show_seat_states` table is therefore the source of truth for locking and
booking. The legacy `seats.status` and `seats.locked_until` columns are kept
for backward-compatible, non-destructive migration, but the booking flow no
longer reads or writes them.

## State model

Each row is uniquely identified by `(show_id, seat_id)` and has one state:

- `available`: no lock or booking payload.
- `locked`: requires `locked_by_user_id`, `lock_token`, and `locked_until`.
- `booked`: requires `booking_id` and contains no lock payload.

The unique constraint plus `SERIALIZABLE` transactions and TypeORM
`pessimistic_write` locks prevent two transactions from acquiring or booking
the same show/seat pair.

## API flow

1. Lock seats:

   `POST /api/bookings/seats/lock`

   ```json
   {
     "showId": "uuid",
     "seatIds": ["uuid"],
     "duration": 600
   }
   ```

   The response contains `lockToken` and `lockedUntil`.

2. Complete the booking as the same authenticated user:

   `POST /api/bookings`

   ```json
   {
     "showId": "uuid",
     "seatIds": ["uuid"],
     "paymentMethod": "cash",
     "lockToken": "uuid"
   }
   ```

3. Optionally release the lock as the same authenticated user:

   `POST /api/bookings/seats/unlock`

   ```json
   {
     "showId": "uuid",
     "seatIds": ["uuid"],
     "lockToken": "uuid"
   }
   ```

## Migration

Apply `migrations/20260621_create_show_seat_states.up.sql` before deploying
the new application code. The migration is transactional, preserves the
existing tables, and backfills confirmed bookings. It intentionally aborts if
existing double bookings are found so that ambiguous data is never silently
discarded.

Rollback with `migrations/20260621_create_show_seat_states.down.sql`. The
rollback removes only the newly introduced state table; existing bookings and
physical seats remain untouched.
