import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { bookingService } from "../services/bookingService";
import MyBookingsPage from "./MyBookingsPage";

jest.mock("../services/bookingService", () => ({
  bookingKeys: {
    all: ["bookings"],
    mine: ["bookings", "me"],
  },
  bookingService: {
    getMyBookings: jest.fn(),
    cancelBooking: jest.fn(),
  },
}));

const futureIso = (hours) => new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

const makeBooking = (overrides = {}) => ({
  id: "booking-1",
  status: "confirmed",
  total_price: "150000.00",
  payment_method: "cash",
  show: {
    start_time: futureIso(4),
    movie: { id: "movie-1", title: "Test Movie", poster_url: "" },
  },
  bookingSeats: [{ seat: { id: "seat-1", row: "A", number: 1 } }],
  ...overrides,
});

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MyBookingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("MyBookingsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => jest.restoreAllMocks());

  test("renders bookings belonging to the authenticated user", async () => {
    bookingService.getMyBookings.mockResolvedValue([makeBooking()]);
    renderPage();

    expect(await screen.findByText("Test Movie")).toBeInTheDocument();
    expect(screen.getByText("A1")).toBeInTheDocument();
    expect(bookingService.getMyBookings).toHaveBeenCalledTimes(1);
  });

  test("renders a useful empty state", async () => {
    bookingService.getMyBookings.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText("Bạn chưa có booking nào.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xem phim đang chiếu" })).toBeInTheDocument();
  });

  test("confirms, locks and refreshes after a successful cancellation", async () => {
    bookingService.getMyBookings
      .mockResolvedValueOnce([makeBooking()])
      .mockResolvedValue([{ ...makeBooking(), status: "cancelled" }]);
    bookingService.cancelBooking.mockResolvedValue({ message: "Cancelled" });
    renderPage();

    const cancelButton = await screen.findByRole("button", { name: "Hủy booking" });
    fireEvent.click(cancelButton);
    fireEvent.click(cancelButton);

    await waitFor(() => expect(bookingService.cancelBooking).toHaveBeenCalledTimes(1));
    expect(bookingService.cancelBooking.mock.calls[0][0]).toBe("booking-1");
    expect(await screen.findByText("Booking đã được hủy thành công.")).toBeInTheDocument();
    await waitFor(() => expect(bookingService.getMyBookings).toHaveBeenCalledTimes(2));
  });

  test("does not offer cancellation inside the two-hour window", async () => {
    bookingService.getMyBookings.mockResolvedValue([
      makeBooking({ show: { start_time: futureIso(1), movie: { id: "movie-1", title: "Soon" } } }),
    ]);
    renderPage();

    expect(
      await screen.findByText("Không thể hủy trong vòng 2 giờ trước suất chiếu."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hủy booking" })).not.toBeInTheDocument();
  });

  test("shows a safe message when the server rejects cancellation with 403", async () => {
    bookingService.getMyBookings.mockResolvedValue([makeBooking()]);
    bookingService.cancelBooking.mockRejectedValue({
      response: {
        status: 403,
        data: { code: "BOOKING_FORBIDDEN", message: "Forbidden", errors: [] },
      },
    });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Hủy booking" }));

    expect(
      await screen.findByText("Bạn không có quyền xem hoặc hủy booking này."),
    ).toBeInTheDocument();
  });
});
