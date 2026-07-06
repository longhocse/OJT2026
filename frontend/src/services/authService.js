import api from "./api";
import { normalizeUser } from "../contracts/normalizers";

const normalizeAuthResponse = (data) => ({
  message: data.message,
  token: data.token,
  user: normalizeUser(data.user),
});

export const authService = {
  async login(credentials) {
    const response = await api.post("/auth/login", credentials);
    return normalizeAuthResponse(response.data);
  },

  async register(userData) {
    const response = await api.post("/auth/register", userData);
    return response.data;
  },

  async verifyEmail(token) {
    const response = await api.post("/auth/verify-email", { token });
    return normalizeAuthResponse(response.data);
  },

  async resendVerification(email) {
    const response = await api.post("/auth/resend-verification", { email });
    return response.data;
  },

  async getMe() {
    const response = await api.get("/auth/me");
    return normalizeUser(response.data);
  },

  async refresh() {
    const response = await api.post("/auth/refresh");
    return normalizeAuthResponse(response.data);
  },

  async logout() {
    const response = await api.post("/auth/logout");
    return response.data;
  },

  async updateProfile(data) {
    const response = await api.put("/auth/profile", data);
    return normalizeUser(response.data);
  },

  async changePassword(data) {
    const response = await api.post("/auth/change-password", data);
    return response.data;
  },

  async forgotPassword(email) {
    const response = await api.post("/auth/forgot-password", { email });
    return response.data;
  },

  async resetPassword(data) {
    const response = await api.post("/auth/reset-password", data);
    return response.data;
  },
};
