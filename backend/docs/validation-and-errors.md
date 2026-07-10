# Validation and error handling

The API uses Zod 4 request schemas. Zod parses and strips unknown object keys
before controllers receive data, so repository `create` and `merge` calls use
validated DTOs rather than raw request bodies.

Validation covers authentication, movies, shows, cinemas, rooms, genres,
reviews, bookings, seat locks, pagination, query filters, and UUID route
parameters. Review and submitted movie ratings are restricted to 1–5.

Registration passwords must contain 8–128 characters, including at least one
lowercase letter, one uppercase letter, and one number.

All handled errors use this response shape:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": [
    {
      "field": "body.email",
      "message": "Invalid email address"
    }
  ]
}
```

Controllers throw operational errors and allow rejected promises to reach the
central Express error handler. Explicit catches remain only around booking
transactions where rollback and query-runner cleanup are required.
