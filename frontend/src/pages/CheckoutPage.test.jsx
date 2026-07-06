import { configureStore } from "@reduxjs/toolkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { checkoutSessionStore } from "../booking/bookingSession";
import bookingReducer from "../redux/slices/bookingSlice";
import { bookingService } from "../services/bookingService";
import CheckoutPage from "./CheckoutPage";

jest.mock("../services/bookingService", () => ({
  bookingKeys: { mine: ["bookings", "me"] },
  bookingService: {
    getShowById: jest.fn(),
    getSeatsByShow: jest.fn(),
    createBooking: jest.fn(),
    unlockSeats: jest.fn(),
  },
}));

const SHOW_ID = "11111111-1111-4111-8111-111111111111";
const SEAT_ID = "22222222-2222-4222-8222-222222222222";
const LOCK_TOKEN = "33333333-3333-4333-8333-333333333333";

const validSession = () => ({
  showId: SHOW_ID,
  seatIds: [SEAT_ID],
  lockToken: LOCK_TOKEN,
  lockedUntil: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
});

const futureShow = () => ({
  id: SHOW_ID,
  start_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
  price: "100000.00",
  movie: { id: "movie-1", title: "Contract Movie", poster_url: "" },
  screen: { name: "1", theater: { name: "Cinema" } },
});

const selectedSeat = () => ({
  id: SEAT_ID,
  row: "A",
  number: 1,
  type: "standard",
  status: "locked",
});

const renderCheckout = () => {
  checkoutSessionStore.save(validSession());
  const store = configureStore({ reducer: { booking: bookingReducer } });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/checkout"]}>
          <Routes>
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/success" element={<div>Success route</div>} />
            <Route path="/booking/:showId" element={<div>Seat selection route</div>} />
            <Route path="/movies" element={<div>Movies route</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>,
  );
};

describe("CheckoutPage integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    bookingService.getShowById.mockResolvedValue(futureShow());
    bookingService.getSeatsByShow.mockResolvedValue([selectedSeat()]);
    bookingService.unlockSeats.mockResolvedValue({ message: "Seats unlocked" });
  });

  test("blocks checkout when the backend returns an empty seat list", async () => {
    bookingService.getSeatsByShow.mockResolvedValue([]);
    renderCheckout();

    expect(
      await screen.findByText("Danh sách ghế không còn hợp lệ hoặc không còn tồn tại."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xác nhận booking" })).toBeDisabled();
  });

  test("blocks checkout after the show has started", async () => {
    bookingService.getShowById.mockResolvedValue({
      ...futureShow(),
      start_time: new Date(Date.now() - 60 * 1000).toISOString(),
    });
    renderCheckout();

    expect(
      await screen.findByText("Suất chiếu đã bắt đầu. Bạn không thể tiếp tục booking."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xác nhận booking" })).toBeDisabled();
  });

  test("prevents duplicate booking submissions", async () => {
    let resolveBooking;
    bookingService.createBooking.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveBooking = resolve;
        }),
    );
    renderCheckout();

    const submit = await screen.findByRole("button", { name: "Xác nhận booking" });
    fireEvent.click(submit);
    fireEvent.click(submit);

    await waitFor(() => expect(bookingService.createBooking).toHaveBeenCalledTimes(1));
    resolveBooking({ bookingId: "booking-1", seats: ["A1"], totalPrice: 100000 });
    expect(await screen.findByText("Success route")).toBeInTheDocument();
  });

  test("unlocks with the owned token when checkout is cancelled", async () => {
    renderCheckout();

    fireEvent.click(await screen.findByRole("button", { name: "Hủy checkout và chọn lại" }));

    await waitFor(() =>
      expect(bookingService.unlockSeats).toHaveBeenCalledWith({
        showId: SHOW_ID,
        seatIds: [SEAT_ID],
        lockToken: LOCK_TOKEN,
      }),
    );
    expect(await screen.findByText("Seat selection route")).toBeInTheDocument();
  });

  test("submits the exact backend payload and accepts the official response", async () => {
    bookingService.createBooking.mockResolvedValue({
      message: "Booking created",
      bookingId: "booking-1",
      seats: ["A1"],
      totalPrice: 100000,
    });
    renderCheckout();

    fireEvent.click(await screen.findByRole("button", { name: "Xác nhận booking" }));

    await waitFor(() => expect(bookingService.createBooking).toHaveBeenCalledTimes(1));
    expect(bookingService.createBooking.mock.calls[0][0]).toEqual({
      showId: SHOW_ID,
      seatIds: [SEAT_ID],
      paymentMethod: "credit_card",
      lockToken: LOCK_TOKEN,
    });
    expect(await screen.findByText("Success route")).toBeInTheDocument();
    expect(checkoutSessionStore.load()).toBeNull();
  });
});
