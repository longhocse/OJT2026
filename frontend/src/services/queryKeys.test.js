import { queryKeys } from "./queryKeys";

test("query key factories include resource identity and params", () => {
  expect(queryKeys.movies.list({ page: 2 })).toEqual(["movies", "list", { page: 2 }]);
  expect(queryKeys.movies.detail("m1")).toEqual(["movies", "detail", "m1"]);
  expect(queryKeys.movies.reviews("m1")).toEqual(["movies", "detail", "m1", "reviews"]);
  expect(queryKeys.shows.list({ movieId: "m1" })).toEqual(["shows", "list", { movieId: "m1" }]);
  expect(queryKeys.shows.detail("s1")).toEqual(["shows", "detail", "s1"]);
  expect(queryKeys.shows.seats("s1")).toEqual(["shows", "detail", "s1", "seats"]);
  expect(queryKeys.bookings.detail("b1")).toEqual(["bookings", "detail", "b1"]);
  expect(queryKeys.users.list({ page: 1 })).toEqual(["users", "list", { page: 1 }]);
  expect(queryKeys.cinemas.detail("c1")).toEqual(["cinemas", "detail", "c1"]);
  expect(queryKeys.rooms.list({ cinemaId: "c1" })).toEqual(["rooms", "list", { cinemaId: "c1" }]);
  expect(queryKeys.rooms.detail("r1")).toEqual(["rooms", "detail", "r1"]);
  expect(queryKeys.genres.list).toEqual(["genres", "list"]);
  expect(queryKeys.admin.dashboard({ dateFrom: "2026-06-01" })).toEqual([
    "admin",
    "dashboard",
    { dateFrom: "2026-06-01" },
  ]);
  expect(queryKeys.admin.bookings.detail("b1")).toEqual(["admin", "bookings", "detail", "b1"]);
});
