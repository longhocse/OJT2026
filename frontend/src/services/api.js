import axios from "axios";
import { store } from "../redux/store";
import { setCredentials } from "../redux/slices/authSlice";
const DEVELOPMENT_API_URL =
  "https://securities-processed-gotta-proposition.trycloudflare.com/api";
const SAME_ORIGIN_API_URL = "/api";

const normalizeBaseUrl = (url) => url.replace(/\/+$/, "");

const environmentApiUrl = process.env.REACT_APP_API_URL?.trim();

export const API_BASE_URL = normalizeBaseUrl(
  environmentApiUrl ||
    (process.env.NODE_ENV === "development" ? DEVELOPMENT_API_URL : SAME_ORIGIN_API_URL),
);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
  withCredentials: true,
});

let unauthorizedHandler = null;

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = typeof handler === "function" ? handler : null;

  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null;
  };
};

const isCredentialRequest = (url = "") =>
  [
    "/auth/login",
    "/auth/register",
    "/auth/refresh",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/auth/verify-email",
    "/auth/resend-verification",
  ].some((path) => url.endsWith(path));

api.interceptors.request.use((config) => {
  const token = store.getState().auth?.token;

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

let refreshPromise = null;

export const handleResponseError = async (error) => {
  const status = error.response?.status;

  if (status === 401 && !isCredentialRequest(error.config?.url) && !error.config?._retried) {
    try {
      refreshPromise ||= axios
        .post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true, timeout: 10000 })
        .then((response) => response.data)
        .finally(() => {
          refreshPromise = null;
        });
      const session = await refreshPromise;
      store.dispatch(setCredentials(session));
      error.config._retried = true;
      error.config.headers = error.config.headers || {};
      error.config.headers.Authorization = `Bearer ${session.token}`;
      return api.request(error.config);
    } catch (_refreshError) {
      // Keep the local session alive for demo/tunnel flows. A failed refresh can be caused by
      // PayOS redirects, ngrok/cloudflare cookie quirks, or a short network hiccup.
    }
  }

  return Promise.reject(error);
};

api.interceptors.response.use((response) => response, handleResponseError);

export default api;
