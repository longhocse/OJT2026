# EntitySchema audit against the SQL Server reset schema

The audit uses the SQL Server schema represented by
`MovieTapDB_FULL_RESET_CURRENT.sql` as the local reset baseline and keeps
TypeORM `synchronize: false`.

## Resolved mismatches

| Entity          | Mismatch                                                                                                                                                            | Resolution                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `Seat`          | Properties `row` and `number` would target columns named `row` and `number`, while SQL defines `seat_row` and `seat_number`.                                        | Added explicit `name` mappings.                                                                                                       |
| `Genre`         | Entity and API existed, but the original SQL baseline had no `genres` table.                                                                                        | Added a transactional up/down migration creating the table.                                                                           |
| `User`          | SQL text columns are `NVARCHAR` with explicit lengths; model used unbounded `VARCHAR`. SQL default role was `user`, while application registrations use `customer`. | Aligned types/lengths and migrated the default to `customer`.                                                                         |
| `Movie`         | Text types/lengths differed; `description`, `genre`, and `release_date` are nullable in SQL but non-nullable in metadata.                                           | Aligned types, lengths, and nullable flags.                                                                                           |
| `Theater`       | SQL uses bounded `NVARCHAR`; `address` and `city` are nullable in SQL.                                                                                              | Aligned types, lengths, and nullable flags.                                                                                           |
| `Screen`        | `name` and `layout_json` types/lengths differed. SQL cascades theater deletion.                                                                                     | Mapped `NVARCHAR(50)`, `NVARCHAR(MAX)`, nullable FK, and `onDelete: CASCADE`.                                                         |
| `Show`          | `screen_id` and `movie_id` are nullable in SQL.                                                                                                                     | Marked both relations nullable.                                                                                                       |
| `Booking`       | Status/payment types and lengths differed; user/show FKs are nullable in SQL.                                                                                       | Aligned text metadata and relation nullability.                                                                                       |
| `BookingSeat`   | Status type differed; FKs are nullable and booking deletion cascades in SQL.                                                                                        | Aligned metadata and cascade behavior.                                                                                                |
| `Review`        | `comment` and both FKs were nullable in the baseline SQL.                                                                                                           | Kept `comment` nullable; the review-hardening migration intentionally makes `user_id` and `movie_id` required for business integrity. |
| `ShowSeatState` | Migration defines `NVARCHAR(20)` while initial model used `VARCHAR(20)`.                                                                                            | Changed model to `NVARCHAR(20)`.                                                                                                      |

Table names, UUID primary keys, decimal precision, date/time columns, join-column
names, and remaining foreign-key actions match the SQL baseline.

## QueryBuilder audit

Raw references such as `booking.userId`, `review.movieId`, and
`screen.theater_id` were replaced with joined aliases (`user.id`,
`reviewedMovie.id`, and `theater.id`). Trending aggregation now groups only the
movie ID, then loads the complete movie records in a second query. This avoids
grouping the legacy SQL Server `TEXT` description column and only counts
confirmed bookings.
