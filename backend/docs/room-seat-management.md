# Room and seat-layout management

Room writes are admin-only and treat the room plus its physical seats as one aggregate.

## API contract

`POST /api/rooms` and `PUT /api/rooms/:id` accept the same complete payload:

```json
{
  "name": "Screen 1",
  "theater": { "id": "theater-uuid" },
  "seats": [
    { "row": "A", "number": 1, "type": "standard", "status": "available" },
    { "row": "A", "number": 2, "type": "vip", "status": "disabled" }
  ]
}
```

An existing seat may include its `id` during update. The server ignores client-supplied
`total_seats` and `layout_json`: it derives both from the validated seat collection and saves the
room and seats in one serializable transaction.

Seat positions are unique per room. Supported types are `standard`, `vip`, and `couple`;
supported physical states are `available` and `disabled`. A disabled seat is returned as disabled
for every show and cannot be locked or booked.

## Mutation safeguards

- A layout cannot change while its room has a future show.
- A seat referenced by a booking cannot be changed or removed.
- A room with any show cannot be deleted.
- Database constraints enforce unique positions and valid type/status values.

Apply `migrations/20260623_harden_room_seat_layout.up.sql` after the earlier migrations. The
migration rejects duplicate positions explicitly, normalizes legacy seat type/status values, and
recalculates every room's `total_seats`. Its matching down migration removes only the new
constraints and index; recalculated data is intentionally retained.
