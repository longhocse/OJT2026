import api from "./api";
import { bookingService, removeSensitiveFields } from "./bookingService";

jest.mock("./api", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}));

describe("bookingService", () => {
  beforeEach(() => jest.clearAllMocks());

  test("loads the current user's bookings without sending a userId", async () => {
    api.get.mockResolvedValue({
      data: [
        {
          id: "booking-1",
          total_price: "100000.00",
          status: "confirmed",
          payment_method: "cash",
          created_at: "2026-06-22T00:00:00.000Z",
          bookingSeats: [],
        },
      ],
    });

    await expect(bookingService.getMyBookings()).resolves.toEqual([
      expect.objectContaining({ id: "booking-1", total_price: 100000, bookingSeats: [] }),
    ]);
    expect(api.get).toHaveBeenCalledWith("/bookings/me");
  });

  test("removes password_hash recursively before data reaches the UI cache", () => {
    const unsafeBooking = {
      id: "booking-1",
      user: { id: "user-1", name: "Customer", password_hash: "secret-hash" },
      nested: [{ password_hash: "another-hash", safe: true }],
    };

    expect(removeSensitiveFields(unsafeBooking)).toEqual({
      id: "booking-1",
      user: { id: "user-1", name: "Customer" },
      nested: [{ safe: true }],
    });
  });

  test("covers show, seat and booking endpoints through the shared client", async () => {
    const movie = {
      id: "movie-1",
      title: "Movie",
      rating: 4,
      duration: 120,
      status: "now_showing",
    };
    const show = {
      id: "show-1",
      start_time: "2026-07-01T10:00:00Z",
      end_time: "2026-07-01T12:00:00Z",
      price: "100000",
      movie,
    };
    const seat = { id: "seat-1", row: "A", number: 1, type: "standard", status: "available" };
    const booking = {
      id: "booking-1",
      total_price: "100000",
      status: "confirmed",
      bookingSeats: [],
    };

    api.get
      .mockResolvedValueOnce({ data: [show] })
      .mockResolvedValueOnce({ data: show })
      .mockResolvedValueOnce({ data: [seat] })
      .mockResolvedValueOnce({ data: booking });
    await expect(bookingService.getShows({ movieId: "movie-1" })).resolves.toHaveLength(1);
    await expect(bookingService.getShowById("show-1")).resolves.toMatchObject({
      id: "show-1",
      price: 100000,
    });
    await expect(bookingService.getSeatsByShow("show-1")).resolves.toEqual([
      expect.objectContaining({ row: "A", number: 1 }),
    ]);
    await expect(bookingService.getBookingById("booking-1")).resolves.toMatchObject({
      id: "booking-1",
      total_price: 100000,
    });

    api.post
      .mockResolvedValueOnce({ data: { lockToken: "lock" } })
      .mockResolvedValueOnce({ data: { message: "unlocked" } })
      .mockResolvedValueOnce({
        data: { bookingId: "booking-1", seats: ["A1"], totalPrice: "100000", message: "created" },
      });
    await expect(bookingService.lockSeats({ showId: "show-1" })).resolves.toEqual({
      lockToken: "lock",
    });
    await expect(bookingService.unlockSeats({ lockToken: "lock" })).resolves.toEqual({
      message: "unlocked",
    });
    await expect(bookingService.createBooking({ showId: "show-1" })).resolves.toMatchObject({
      bookingId: "booking-1",
      totalPrice: 100000,
    });

    api.put.mockResolvedValue({ data: { status: "cancelled" } });
    await expect(bookingService.cancelBooking("booking-1")).resolves.toEqual({
      status: "cancelled",
    });
    expect(api.put).toHaveBeenCalledWith("/bookings/booking-1/cancel");
  });
});
