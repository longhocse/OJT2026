# Admin booking and dashboard

All endpoints below are protected by authentication and the admin role.

## Booking endpoints

- `GET /api/admin/bookings` supports `search`, `page`, `limit`, booking `status`,
  `paymentStatus`, `movieId`, `cinemaId`, `dateFrom`, and `dateTo`.
- `GET /api/admin/bookings/:id` returns customer, movie, cinema, room, seat, payment-summary,
  cancellation, and refund information.
- `POST /api/admin/bookings/:id/cancel` requires `{ "reason": "..." }`.

Search matches booking ID, customer name/email, and movie title. Responses recursively remove
`password_hash`; frontend normalizers also whitelist the user fields they consume.

## Interim payment summary

Until the Payment aggregate is introduced, bookings contain a queryable summary:

- `payment_status`: `pending`, `paid`, `failed`, `cancelled`, `partially_refunded`, or `refunded`.
- `refunded_amount`: cumulative refund amount and never greater than `total_price`.

New bookings follow the existing immediate-confirmation behavior and are marked paid. The Phase 4
Payment implementation will replace this compatibility behavior with provider-confirmed state.

Cancellation policy:

- at least 24 hours before the show: 100% refund;
- from 2 to 24 hours: 50% refund;
- less than 2 hours but before show start: 0% refund for admin cancellation;
- whole-show cancellation: 100% refund.

Customer cancellation remains unavailable inside two hours. Admin cancellation stores the exact
reason, applies the policy, cancels booking seats, and releases show-seat state in one serializable
transaction.

## Dashboard

`GET /api/admin/dashboard/stats` optionally accepts `dateFrom` and `dateTo` and returns:

- total, confirmed, and cancelled bookings;
- net revenue and cumulative refunds;
- booked seats, available show capacity, and occupancy percentage;
- daily booking/revenue/refund series.

The date range applies to booking creation for booking/revenue metrics and to show start time for
occupancy. Cancelled shows are excluded from capacity.
