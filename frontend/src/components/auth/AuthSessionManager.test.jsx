import { StrictMode } from "react";
import { configureStore } from "@reduxjs/toolkit";
import { render, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import authReducer from "../../redux/slices/authSlice";
import { authService } from "../../services/authService";
import AuthSessionManager from "./AuthSessionManager";
import { clearClientSession } from "../../services/authSession";

jest.mock("../../services/authService", () => ({
  authService: { getMe: jest.fn(), refresh: jest.fn() },
}));

jest.mock("../../services/api", () => ({
  setUnauthorizedHandler: () => () => {},
}));
jest.mock("../../services/authSession", () => ({
  clearClientSession: jest.fn(() => Promise.resolve()),
}));

beforeEach(() => jest.clearAllMocks());

test("does not call authenticated APIs when no token exists", async () => {
  const store = configureStore({ reducer: { auth: authReducer } });
  render(
    <Provider store={store}>
      <MemoryRouter>
        <AuthSessionManager />
      </MemoryRouter>
    </Provider>,
  );
  await waitFor(() => expect(authService.getMe).not.toHaveBeenCalled());
  expect(clearClientSession).not.toHaveBeenCalled();
});

test("verifies a persisted token with /auth/me before authenticating", async () => {
  const verifiedUser = { id: "user-1", name: "Verified", role: "customer" };
  authService.getMe.mockResolvedValue(verifiedUser);
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: null,
        token: "persisted-token",
        isAuthenticated: false,
        verificationStatus: "idle",
      },
    },
  });

  render(
    <Provider store={store}>
      <StrictMode>
        <MemoryRouter>
          <AuthSessionManager />
        </MemoryRouter>
      </StrictMode>
    </Provider>,
  );

  await waitFor(() => expect(store.getState().auth.verificationStatus).toBe("authenticated"));
  expect(authService.getMe).toHaveBeenCalledTimes(1);
  expect(store.getState().auth.user).toEqual(verifiedUser);
});

test("keeps a persisted session when /auth/me has a transient network failure", async () => {
  authService.getMe.mockRejectedValue(new Error("network"));
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: { id: "user-1", name: "Persisted", role: "customer" },
        token: "persisted",
        isAuthenticated: true,
        verificationStatus: "idle",
      },
    },
  });
  render(
    <Provider store={store}>
      <MemoryRouter>
        <AuthSessionManager />
      </MemoryRouter>
    </Provider>,
  );
  await waitFor(() => expect(store.getState().auth.verificationStatus).toBe("authenticated"));
  expect(clearClientSession).not.toHaveBeenCalled();
});

test("keeps a persisted session when /auth/me and refresh both reject authorization", async () => {
  authService.getMe.mockRejectedValue({ response: { status: 401 } });
  authService.refresh.mockRejectedValue({ response: { status: 401 } });
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: { user: null, token: "expired", isAuthenticated: false, verificationStatus: "idle" },
    },
  });
  render(
    <Provider store={store}>
      <MemoryRouter>
        <AuthSessionManager />
      </MemoryRouter>
    </Provider>,
  );
  await waitFor(() => expect(store.getState().auth.verificationStatus).toBe("authenticated"));
  expect(clearClientSession).not.toHaveBeenCalled();
});
