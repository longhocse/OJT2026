import { normalizeShow, normalizeShowPage } from "../contracts/normalizers";
import api from "./api";

export const showService = {
  async getAdminShows(params = {}) {
    const response = await api.get("/admin/shows", { params });
    return normalizeShowPage(response.data);
  },

  async getAdminShowById(id) {
    const response = await api.get(`/admin/shows/${id}`);
    return normalizeShow(response.data);
  },

  async createShow(data) {
    const response = await api.post("/admin/shows", data);
    return normalizeShow(response.data);
  },

  async updateShow(id, data) {
    const response = await api.put(`/admin/shows/${id}`, data);
    return normalizeShow(response.data);
  },

  async cancelShow(id, reason) {
    const response = await api.post(`/admin/shows/${id}/cancel`, { reason });
    return {
      message: response.data.message,
      show: normalizeShow(response.data.show),
    };
  },

  async deleteShow(id) {
    const response = await api.delete(`/admin/shows/${id}`);
    return response.data;
  },
};
