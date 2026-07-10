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

  async createBulkShows(data) {
    const response = await api.post("/admin/shows/bulk", data);
    return {
      requested: Number(response.data.requested || 0),
      created: Number(response.data.created || 0),
      skipped: Number(response.data.skipped || 0),
      conflicts: Array.isArray(response.data.conflicts) ? response.data.conflicts : [],
      shows: Array.isArray(response.data.shows) ? response.data.shows.map(normalizeShow) : [],
    };
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
