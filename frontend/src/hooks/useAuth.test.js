import { act, renderHook } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import authReducer from "../redux/slices/authSlice";
import useAuth from "./useAuth";
import { authService } from "../services/authService";
import { clearClientSession } from "../services/authSession";

jest.mock("../services/authService", () => ({
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    getMe: jest.fn(),
    logout: jest.fn(() => Promise.resolve()),
  },
}));
jest.mock("../services/authSession", () => ({
  clearClientSession: jest.fn(() => Promise.resolve()),
}));

const renderAuthHook = () => {
  const store = configureStore({ reducer: { auth: authReducer } });
  const wrapper = ({ children }) => (
    <Provider store={store}>
      <MemoryRouter>{children}</MemoryRouter>
    </Provider>
  );
  return { store, ...renderHook(() => useAuth(), { wrapper }) };
};

describe("useAuth", () => {
  beforeEach(() => jest.clearAllMocks());

  test("stores a successful login response in Redux", async () => {
    const response = {
      token: "valid-token",
      user: { id: "user-1", name: "Customer", role: "customer" },
    };
    authService.login.mockResolvedValue(response);
    const { result, store } = renderAuthHook();

    await act(async () => {
      await result.current.login({ email: "customer@example.com", password: "Password1" });
    });

    expect(store.getState().auth).toMatchObject({
      token: "valid-token",
      user: response.user,
      isAuthenticated: true,
      verificationStatus: "authenticated",
    });
  });

  test("keeps the session anonymous when login is rejected", async () => {
    const error = {
      response: {
        status: 401,
        data: { code: "INVALID_CREDENTIALS", message: "Invalid credentials", errors: [] },
      },
    };
    authService.login.mockRejectedValue(error);
    const { result, store } = renderAuthHook();
    let receivedError;

    await act(async () => {
      try {
        await result.current.login({ email: "customer@example.com", password: "wrong" });
      } catch (requestError) {
        receivedError = requestError;
      }
    });

    expect(receivedError).toBe(error);
    expect(store.getState().auth).toMatchObject({
      token: null,
      user: null,
      isAuthenticated: false,
    });
  });

  test("register stores credentials and logout purges the client session", async () => {
    const response = { token: "registered-token", user: { id: "user-2", role: "customer" } };
    authService.register.mockResolvedValue(response);
    const { result, store } = renderAuthHook();
    await act(async () =>
      result.current.register({ email: "new@example.com", password: "Password1" }),
    );
    expect(store.getState().auth.token).toBe("registered-token");
    await act(async () => result.current.logout());
    expect(clearClientSession).toHaveBeenCalledTimes(1);
  });

  test("rejects malformed successful auth responses", async () => {
    authService.login.mockResolvedValue({ token: "token" });
    const { result } = renderAuthHook();
    await expect(
      result.current.login({ email: "a@example.com", password: "Password1" }),
    ).rejects.toThrow(/không hợp lệ/i);
  });
});
