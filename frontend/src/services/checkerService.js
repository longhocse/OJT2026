import api from "./api";

export const checkerService = {
  async checkIn(qrPayload) {
    const response = await api.post("/checker/tickets/check-in", { qrPayload });
    return response.data;
  },
  async getMyHistory(params = {}) {
    const response = await api.get("/checker/check-ins/me", { params });
    return response.data;
  },
};
