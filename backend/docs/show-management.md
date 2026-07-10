# Show management

Admin show operations are exposed under `/api/admin/shows` and require both authentication and
the `admin` role.

## Endpoints

- `GET /api/admin/shows` supports `page`, `limit`, `movieId`, `theaterId`, `screenId`, `date`, and
  `status` (`scheduled`, `in_progress`, `completed`, or `cancelled`).
- `GET /api/admin/shows/:id` returns an admin show detail.
- `POST /api/admin/shows` creates a show.
- `PUT /api/admin/shows/:id` updates a future show that has no bookings.
- `POST /api/admin/shows/:id/cancel` requires `{ "reason": "..." }`.
- `DELETE /api/admin/shows/:id` deletes only a show that has never had a booking.

`scheduled` and `cancelled` are persisted states. `in_progress` and `completed` are derived from
the start and end times so they cannot become stale.

## Scheduling rules

- Movie and room must exist, and the room must contain seats.
- Start time must be in the future and end time must be after start time.
- End time must equal start time plus the movie duration.
- Shows in one room may not overlap and must leave the configured cleaning buffer between them.
- `SHOW_CLEANING_BUFFER_MINUTES` configures the buffer and defaults to 15 minutes.

Create and update use serializable transactions and a pessimistic conflict query. This keeps two
concurrent admins from scheduling the same room for overlapping periods.

## Cancellation and deletion

Cancelling a future show stores its reason and timestamp, cancels all associated bookings and
booking seats, applies a full refund to the booking payment summary, and clears every booked or
locked show-seat state in the same transaction. Provider-side refund processing remains deferred
until the Payment domain is introduced.

A show with any booking history cannot be deleted, including after cancellation. It remains
available for audit and customer history.
