import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import authReducer from "../redux/slices/authSlice";
import { bookingSuccessStore } from "../booking/bookingSession";
import { bookingService } from "../services/bookingService";
import { paymentService } from "../services/paymentService";
import PayOSReturnPage from "./PayOSReturnPage";

jest.mock("../services/bookingService", () => ({
  bookingService: { getBookingById: jest.fn() },
}));

jest.mock("../services/paymentService", () => ({
  paymentService: { reconcilePayOS: jest.fn() },
}));

const renderReturnPage = () => {
  const store = configureStore({ reducer: { auth: authReducer } });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    store,
    ...render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter
            initialEntries={[
              "/payment/payos/return?code=00&status=PAID&orderCode=1785003235728446&session=return-session",
            ]}
          >
            <PayOSReturnPage />
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>,
    ),
  };
};

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  localStorage.clear();
  bookingSuccessStore.save({
    bookingId: "booking-1",
    status: "pending_payment",
    payment: { status: "pending", provider_transaction_id: "1785003235728446" },
  });
  bookingService.getBookingById.mockResolvedValue({
    id: "booking-1",
    status: "pending_payment",
    payment_status: "pending",
  });
});

test("confirms the UI from authoritative PayOS reconciliation", async () => {
  paymentService.reconcilePayOS.mockResolvedValue({
    paid: true,
    payosStatus: "PAID",
    bookingStatus: "confirmed",
    paymentStatus: "paid",
    session: {
      token: "restored-access-token",
      user: { id: "user-1", role: "customer" },
    },
  });

  const { store } = renderReturnPage();

  expect(await screen.findByRole("heading", { name: "Thanh toán thành công" })).toBeInTheDocument();
  expect(paymentService.reconcilePayOS).toHaveBeenCalledWith(
    "1785003235728446",
    "return-session",
  );
  await waitFor(() => expect(store.getState().auth.token).toBe("restored-access-token"));
});

test("shows reconciliation progress before PayOS confirmation arrives", async () => {
  paymentService.reconcilePayOS.mockResolvedValue({ paid: false, payosStatus: "PENDING" });

  renderReturnPage();

  await waitFor(() => expect(paymentService.reconcilePayOS).toHaveBeenCalled());
  expect(screen.getByRole("heading", { name: "Đang xác nhận thanh toán" })).toBeInTheDocument();
});
