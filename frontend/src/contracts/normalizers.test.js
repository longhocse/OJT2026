import {
  ContractError,
  normalizeBooking,
  normalizeMoviePage,
  normalizeShow,
  normalizeUserPage,
} from "./normalizers";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const MOVIE_ID = "22222222-2222-4222-8222-222222222222";
const SHOW_ID = "33333333-3333-4333-8333-333333333333";
const SCREEN_ID = "44444444-4444-4444-8444-444444444444";
const THEATER_ID = "55555555-5555-4555-8555-555555555555";
const SEAT_ID = "66666666-6666-4666-8666-666666666666";

const rawMovie = {
  id: MOVIE_ID,
  title: "Backend Movie",
  description: null,
  genre: "Drama",
  rating: 4.5,
  duration: 120,
  poster_url: "https://example.com/poster.jpg",
  trailer_url: "https://www.youtube.com/watch?v=0wTIniZRYXU",
  release_date: "2026-06-20",
  status: "now_showing",
  created_at: "2026-06-01T00:00:00.000Z",
};

describe("contract normalizers", () => {
  test("normalizes the real movie pagination envelope", () => {
    const result = normalizeMoviePage({
      data: [rawMovie],
      pagination: { page: 1, limit: 10, total: 1, pages: 1 },
    });

    expect(result.data[0]).toMatchObject({
      id: MOVIE_ID,
      poster_url: "https://example.com/poster.jpg",
      trailer_url: "https://www.youtube.com/embed/0wTIniZRYXU",
      release_date: "2026-06-20",
      rating: 4.5,
    });
    expect(result.pagination).toEqual({ page: 1, limit: 10, total: 1, pages: 1 });
  });

  test("normalizes show price and nested screen.theater", () => {
    const show = normalizeShow({
      id: SHOW_ID,
      start_time: "2026-06-25T10:00:00.000Z",
      end_time: "2026-06-25T12:00:00.000Z",
      price: "125000.00",
      availableSeats: 40,
      movie: rawMovie,
      screen: {
        id: SCREEN_ID,
        name: "Room 1",
        total_seats: 50,
        layout_json: null,
        theater: { id: THEATER_ID, name: "Cinema A", address: null, city: null, phone: null },
      },
    });

    expect(show.price).toBe(125000);
    expect(show.screen.theater.name).toBe("Cinema A");
  });

  test("normalizes total_price and bookingSeats[].seat row/number", () => {
    const booking = normalizeBooking({
      id: "77777777-7777-4777-8777-777777777777",
      total_price: "125000.00",
      status: "confirmed",
      payment_method: "cash",
      payment_status: "partially_refunded",
      refunded_amount: "25000.00",
      created_at: "2026-06-22T00:00:00.000Z",
      show: {
        id: SHOW_ID,
        start_time: "2026-06-25T10:00:00.000Z",
        end_time: "2026-06-25T12:00:00.000Z",
        price: "125000.00",
        movie: rawMovie,
      },
      bookingSeats: [
        {
          id: "88888888-8888-4888-8888-888888888888",
          status: "confirmed",
          price: "125000.00",
          seat: { id: SEAT_ID, row: "A", number: 7, type: "standard", status: "available" },
        },
      ],
    });

    expect(booking.total_price).toBe(125000);
    expect(booking.refunded_amount).toBe(25000);
    expect(booking.payment_status).toBe("partially_refunded");
    expect(booking.bookingSeats[0].seat).toMatchObject({ row: "A", number: 7 });
  });

  test("strips password_hash from the user pagination response", () => {
    const result = normalizeUserPage({
      success: true,
      data: [
        {
          id: USER_ID,
          email: "user@example.com",
          name: "User",
          phone: null,
          role: "customer",
          created_at: "2026-06-01T00:00:00.000Z",
          password_hash: "never-expose",
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 },
    });
    expect(result.data[0]).not.toHaveProperty("password_hash");
  });

  test("fails visibly when a paginated response has the wrong envelope", () => {
    expect(() => normalizeMoviePage({ movies: [rawMovie] })).toThrow(ContractError);
  });
});
