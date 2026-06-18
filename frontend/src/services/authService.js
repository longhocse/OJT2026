// frontend/src/services/authService.js
import api from "./api";

export const authService = {
  login: async (data) => {
    console.log("📤 authService.login called with:", data);
    try {
      const response = await api.post("/auth/login", data);
      console.log("📥 authService.login response:", response);
      return response.data;
    } catch (error) {
      console.error("❌ authService.login error:", error);
      throw error;
    }
  },
  register: async (data) => {
    console.log("📤 authService.register called with:", data);
    try {
      const response = await api.post("/auth/register", data);
      console.log("📥 authService.register response:", response);
      return response.data;
    } catch (error) {
      console.error("❌ authService.register error:", error);
      throw error;
    }
  },
  getMe: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },
};