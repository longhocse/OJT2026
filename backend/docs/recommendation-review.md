# Recommendation and review rules

## Recommendations

- `GET /api/recommendations` requires authentication and always derives the
  user ID from the verified JWT. Client-provided `userId` values are ignored.
- Only confirmed bookings contribute to personal genres and trending movies.
- `GET /api/recommendations/trending` remains public.
- SQL Server aggregation groups only the movie UUID, then loads movie records
  separately to avoid grouping legacy `TEXT` columns.

## Reviews

- Ratings must be between 1 and 5.
- A user needs a confirmed booking for the movie before reviewing it.
- `(user_id, movie_id)` is unique. A later submission updates the existing
  review instead of creating another row.
- `user_id` and `movie_id` are required; the migration stops if legacy orphan
  reviews must be resolved first.
- Review upsert and movie rating recalculation run in one `SERIALIZABLE`
  transaction with pessimistic locks.
- Apply `migrations/20260621_harden_reviews.up.sql` before deploying the new
  code. The migration stops without changing data if duplicate reviews or
  out-of-range ratings already exist.
