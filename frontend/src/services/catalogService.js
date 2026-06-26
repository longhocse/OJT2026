import {
  normalizeGenre,
  normalizeScreen,
  normalizeTheater,
  normalizeUser,
  normalizeUserPage,
} from "../contracts/normalizers";
import api from "./api";

export const catalogService = {
  async getGenres() {
    const response = await api.get("/genres");
    return Array.isArray(response.data) ? response.data.map(normalizeGenre) : [];
  },

  async createGenre(data) {
    const response = await api.post("/genres", data);
    return normalizeGenre(response.data);
  },

  async updateGenre(id, data) {
    const response = await api.put(`/genres/${id}`, data);
    return normalizeGenre(response.data);
  },

  async deleteGenre(id) {
    const response = await api.delete(`/genres/${id}`);
    return response.data;
  },

  async getUsers(params = {}) {
    const response = await api.get("/users", { params });
    return normalizeUserPage(response.data);
  },

  async updateUserAccess(id, data) {
    const response = await api.patch(`/users/${id}`, data);
    return normalizeUser(response.data);
  },

  async getCinemas() {
    const response = await api.get("/cinemas");
    return Array.isArray(response.data) ? response.data.map(normalizeTheater) : [];
  },

  async getCinemaById(id) {
    const response = await api.get(`/cinemas/${id}`);
    return normalizeTheater(response.data);
  },

  async createCinema(data) {
    const response = await api.post("/cinemas", data);
    return normalizeTheater(response.data);
  },

  async updateCinema(id, data) {
    const response = await api.put(`/cinemas/${id}`, data);
    return normalizeTheater(response.data);
  },

  async deleteCinema(id) {
    const response = await api.delete(`/cinemas/${id}`);
    return response.data;
  },

  async getRooms(params = {}) {
    const response = await api.get("/rooms", { params });
    return Array.isArray(response.data) ? response.data.map(normalizeScreen) : [];
  },

  async getRoomById(id) {
    const response = await api.get(`/rooms/${id}`);
    return normalizeScreen(response.data);
  },

  async createRoom(data) {
    const response = await api.post("/rooms", data);
    return normalizeScreen(response.data);
  },

  async updateRoom(id, data) {
    const response = await api.put(`/rooms/${id}`, data);
    return normalizeScreen(response.data);
  },

  async deleteRoom(id) {
    const response = await api.delete(`/rooms/${id}`);
    return response.data;
  },
};
