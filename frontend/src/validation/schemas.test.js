import {
  checkoutSchema,
  cinemaSchema,
  genreSchema,
  loginSchema,
  movieFilterSchema,
  movieSchema,
  registerSchema,
  reviewSchema,
  roomSchema,
  showSchema,
} from "./schemas";

const uuidA = "123e4567-e89b-42d3-a456-426614174000";
const uuidB = "223e4567-e89b-42d3-a456-426614174000";

describe("client validation matches the backend contracts", () => {
  test("login accepts a valid payload and rejects invalid credentials", () => {
    expect(loginSchema.safeParse({ email: "bad", password: "" }).success).toBe(false);
    expect(loginSchema.parse({ email: "USER@example.com", password: "secret" })).toEqual({
      email: "user@example.com",
      password: "secret",
    });
  });

  test("registration enforces password, name, email and phone rules", () => {
    expect(
      registerSchema.safeParse({
        email: "bad",
        password: "weak",
        confirmPassword: "weak",
        name: "",
        phone: "1",
      }).success,
    ).toBe(false);
    const result = registerSchema.parse({
      email: "new@example.com",
      password: "StrongPass1",
      confirmPassword: "StrongPass1",
      name: "New User",
      phone: "+84 912.345.678",
    });
    expect(result).toEqual({
      email: "new@example.com",
      password: "StrongPass1",
      name: "New User",
      phone: "+84 912.345.678",
    });
    expect(result).not.toHaveProperty("confirmPassword");
  });

  test("movie validates backend-whitelisted fields and strips aggregate rating", () => {
    const parsed = movieSchema.parse({ ...validMovie(), rating: 6 });
    expect(parsed).toMatchObject({
      duration: 120,
      genreIds: [uuidA],
      status: "now_showing",
    });
    expect(parsed).not.toHaveProperty("rating");
  });

  test("movie filters only allow rating 1-5 and supported sorting", () => {
    expect(movieFilterSchema.safeParse({ ...validFilter(), minRating: 6 }).success).toBe(false);
    expect(movieFilterSchema.safeParse({ ...validFilter(), sortBy: "newest" }).success).toBe(false);
    expect(movieFilterSchema.parse(validFilter())).toMatchObject({
      minRating: 4,
      sortBy: "popular",
    });
  });

  test("cinema, room and genre validate valid and invalid payloads", () => {
    expect(cinemaSchema.safeParse({ name: "Cinema", phone: "123" }).success).toBe(false);
    expect(cinemaSchema.safeParse({ name: "Cinema", phone: "+84 912 345 678" }).success).toBe(true);
    expect(roomSchema.safeParse({ name: "Room 1", theater: uuidA, seats: [] }).success).toBe(false);
    const room = {
      name: "Room 1",
      theater: { id: uuidA },
      seats: [{ row: "a", number: "1", type: "standard", status: "available" }],
    };
    expect(roomSchema.parse(room)).toMatchObject({
      theater: { id: uuidA },
      seats: [{ row: "A", number: 1 }],
    });
    expect(
      roomSchema.safeParse({
        ...room,
        seats: [...room.seats, { ...room.seats[0], row: "A" }],
      }).success,
    ).toBe(false);
    expect(genreSchema.safeParse({ name: "" }).success).toBe(false);
    expect(genreSchema.safeParse({ name: "Action", description: "Fast films" }).success).toBe(true);
  });

  test("show requires UUID relations and end_time after start_time", () => {
    const base = {
      start_time: "2026-07-01T10:00:00.000Z",
      end_time: "2026-07-01T12:00:00.000Z",
      price: "100000",
      screen: { id: uuidA },
      movie: { id: uuidB },
    };
    expect(showSchema.safeParse({ ...base, end_time: "2026-07-01T09:00:00.000Z" }).success).toBe(
      false,
    );
    expect(showSchema.parse(base)).toMatchObject({
      price: 100000,
      screen: { id: uuidA },
      movie: { id: uuidB },
    });
  });

  test("review uses rating 1-5 and only emits rating/comment", () => {
    expect(reviewSchema.safeParse({ rating: 10, comment: "No" }).success).toBe(false);
    expect(reviewSchema.parse({ rating: "5", comment: "Great", ignored: "field" })).toEqual({
      rating: 5,
      comment: "Great",
    });
  });

  test("checkout accepts only backend payment methods", () => {
    expect(checkoutSchema.safeParse({ paymentMethod: "paypal" }).success).toBe(false);
    ["credit_card", "vnpay", "momo", "cash"].forEach((paymentMethod) => {
      expect(checkoutSchema.safeParse({ paymentMethod }).success).toBe(true);
    });
  });
});

const validMovie = () => ({
  title: "Movie",
  description: "Description",
  genreIds: [uuidA],
  duration: "120",
  poster_url: "https://example.com/poster.jpg",
  trailer_url: "",
  release_date: "2026-07-01",
  status: "now_showing",
});

const validFilter = () => ({
  genre: "Action",
  minRating: "4",
  sortBy: "popular",
  status: "now_showing",
  page: 1,
  limit: 12,
});
