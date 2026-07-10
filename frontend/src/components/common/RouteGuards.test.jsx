import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import authReducer, { initialAuthState } from "../../redux/slices/authSlice";
import AdminRoute from "./AdminRoute";
import ProtectedRoute from "./ProtectedRoute";

const renderWithAuth = (element, auth, initialEntry = "/admin") => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { ...initialAuthState, ...auth } },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialEntry]}>{element}</MemoryRouter>
    </Provider>,
  );
};

const LoginDestination = () => {
  const location = useLocation();
  return <div>Return to: {location.state?.from}</div>;
};

describe("route guards", () => {
  test("preserves the requested URL when redirecting a guest", async () => {
    renderWithAuth(
      <Routes>
        <Route
          path="/booking/:showId"
          element={
            <ProtectedRoute>
              <div>Booking</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<LoginDestination />} />
      </Routes>,
      {},
      "/booking/show-1?source=movie",
    );

    expect(await screen.findByText("Return to: /booking/show-1?source=movie")).toBeInTheDocument();
  });

  test("protected route waits for verification and then allows authenticated users", () => {
    const view = renderWithAuth(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>,
      { token: "token", verificationStatus: "verifying" },
      "/checkout",
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
    view.unmount();

    renderWithAuth(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>,
      {
        token: "token",
        user: { id: "u1" },
        isAuthenticated: true,
        verificationStatus: "authenticated",
      },
      "/checkout",
    );
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  test("blocks a customer from admin content without logging them out", () => {
    renderWithAuth(
      <AdminRoute>
        <div>Admin content</div>
      </AdminRoute>,
      {
        token: "customer-token",
        user: { id: "customer-1", role: "customer" },
        isAuthenticated: true,
        verificationStatus: "authenticated",
      },
    );

    expect(screen.getByText("Không đủ quyền truy cập")).toBeInTheDocument();
    expect(screen.queryByText("Admin content")).not.toBeInTheDocument();
  });

  test("allows an authenticated admin", () => {
    renderWithAuth(
      <AdminRoute>
        <div>Admin content</div>
      </AdminRoute>,
      {
        token: "admin-token",
        user: { id: "admin-1", role: "admin" },
        isAuthenticated: true,
        verificationStatus: "authenticated",
      },
    );

    expect(screen.getByText("Admin content")).toBeInTheDocument();
  });

  test("shows a neutral loading state while the persisted token is verified", () => {
    renderWithAuth(
      <AdminRoute>
        <div>Admin content</div>
      </AdminRoute>,
      { token: "persisted-token", verificationStatus: "verifying" },
    );

    expect(screen.getByRole("status")).toHaveTextContent("Đang xác minh quyền truy cập");
    expect(screen.queryByText("Admin content")).not.toBeInTheDocument();
  });
});
