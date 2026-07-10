jest.mock("../redux/store", () => ({
  store: {
    dispatch: jest.fn(),
    getState: jest.fn(() => ({ auth: { token: "access-token" } })),
  },
}));
jest.mock("./authSession", () => ({ clearClientSession: jest.fn(() => Promise.resolve()) }));

import axios from "axios";
import api, { handleResponseError, setUnauthorizedHandler } from "./api";
import { store as mockStore } from "../redux/store";
import { clearClientSession } from "./authSession";

describe("Axios authentication behavior", () => {
  beforeEach(() => {
    mockStore.dispatch.mockClear();
    mockStore.getState.mockClear();
    mockStore.getState.mockReturnValue({ auth: { token: "access-token" } });
    clearClientSession.mockClear();
    jest.restoreAllMocks();
  });

  test("adds the persisted access token to requests", () => {
    const requestInterceptor = api.interceptors.request.handlers[0].fulfilled;
    const config = requestInterceptor({ url: "/recommendations", headers: {} });

    expect(config.headers.Authorization).toBe("Bearer access-token");
    expect(config.params?.userId).toBeUndefined();
  });

  test("keeps the local session when refresh is rejected during a tunnel/demo session", async () => {
    const onUnauthorized = jest.fn();
    const cleanup = setUnauthorizedHandler(onUnauthorized);
    jest.spyOn(axios, "post").mockRejectedValue({ response: { status: 401 } });
    const error = { response: { status: 401 }, config: { url: "/auth/me" } };

    await expect(handleResponseError(error)).rejects.toBe(error);

    expect(clearClientSession).not.toHaveBeenCalled();
    expect(onUnauthorized).not.toHaveBeenCalled();
    cleanup();
  });

  test("keeps the client session when refresh fails because of a transient network issue", async () => {
    jest.spyOn(axios, "post").mockRejectedValue(new Error("network"));
    const error = { response: { status: 401 }, config: { url: "/auth/me" } };

    await expect(handleResponseError(error)).rejects.toBe(error);

    expect(clearClientSession).not.toHaveBeenCalled();
  });

  test("does not globally log out for invalid login credentials or a 403", async () => {
    const loginError = { response: { status: 401 }, config: { url: "/auth/login" } };
    const forbiddenError = { response: { status: 403 }, config: { url: "/users" } };

    await expect(handleResponseError(loginError)).rejects.toBe(loginError);
    await expect(handleResponseError(forbiddenError)).rejects.toBe(forbiddenError);

    expect(mockStore.dispatch).not.toHaveBeenCalled();
    expect(clearClientSession).not.toHaveBeenCalled();
  });

  test("does not log request credentials or Axios errors", async () => {
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    const errorLog = jest.spyOn(console, "error").mockImplementation(() => {});
    const requestInterceptor = api.interceptors.request.handlers[0].fulfilled;
    requestInterceptor({ headers: {}, data: { password: "Password1" } });
    await expect(
      handleResponseError({ response: { status: 403 }, config: { url: "/users" } }),
    ).rejects.toBeDefined();
    expect(log).not.toHaveBeenCalled();
    expect(errorLog).not.toHaveBeenCalled();
    log.mockRestore();
    errorLog.mockRestore();
  });
});
