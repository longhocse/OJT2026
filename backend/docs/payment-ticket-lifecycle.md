# Payment and ticket lifecycle

## States

Booking states are `pending_payment`, `confirmed`, `cancelled`, `expired`, and `used`.
Payment states are `pending`, `paid`, `failed`, `cancelled`, `partially_refunded`, and
`refunded`.

A new booking reserves its show seats and creates one pending payment in the same
serializable transaction. Online bookings become confirmed only after a verified
provider callback. Cash bookings require the admin cash-confirmation endpoint. A
background worker expires unpaid bookings and releases their seats atomically.

## Provider and callback contract

`PaymentProvider` isolates intent creation and refund operations. Development and
tests use the mock provider; cash uses an explicit admin workflow. The callback is:

```text
POST /api/payments/webhooks/mock
X-Payment-Timestamp: <unix milliseconds>
X-Payment-Signature: HMAC-SHA256(secret, timestamp + "." + canonical-json-body)
```

Callbacks outside the five-minute replay window or with an invalid signature are
rejected. The server loads amount and booking ownership from SQL Server; callback
amount fields are ignored. Repeating a successful event returns an idempotent
success without changing balances twice.

## Refund and expiry rules

- Pending payments are cancelled without a refund when their booking is cancelled.
- Paid bookings use the cancellation policy: 100% at least 24 hours before the show,
  50% from 2 to 24 hours, and no refund inside 2 hours.
- A refund is capped at the server-stored payment amount and cannot be applied twice.
- A successful callback received after expiry is refunded through its provider and
  cannot reactivate the booking.

## Tickets and check-in

Every booking has a unique `ticket_code`. Active tickets expose a JSON QR payload
signed with `TICKET_QR_SECRET`. Admin check-in verifies the signature and matches the
booking, show and ticket code under a write lock. The first scan moves the booking to
`used`; subsequent scans return `alreadyCheckedIn: true`.

Never put provider secrets, card data, raw authorization headers, or ticket-signing
secrets in database rows or logs. Production secrets must be injected by the
deployment secret manager.
