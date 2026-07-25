import { normalizeMovie, normalizeMoviePage, normalizeReview } from "../contracts/normalizers";
import api from "./api";

export const movieService = {
  async getMovies(params = {}) {
    const response = await api.get("/movies", { params });
    return normalizeMoviePage(response.data);
  },

  async getMovieById(id) {
    const response = await api.get(`/movies/${id}`);
    return normalizeMovie(response.data);
  },

  async createMovie(data) {
    const response = await api.post("/movies", data);
    return normalizeMovie(response.data);
  },

  async updateMovie(id, data) {
    const response = await api.put(`/movies/${id}`, data);
    return normalizeMovie(response.data);
  },

  async deleteMovie(id) {
    const response = await api.delete(`/movies/${id}`);
    return response.data;
  },

  async getReviews(movieId) {
    const response = await api.get(`/movies/${movieId}/reviews`);
    return Array.isArray(response.data) ? response.data.map(normalizeReview) : [];
  },

  async addReview(movieId, data) {
    const response = await api.post(`/movies/${movieId}/reviews`, data);
    return {
      review: normalizeReview(response.data),
      created: response.status === 201,
      status: response.status,
    };
  },

  async updateReview(movieId, reviewId, data) {
    const response = await api.put(`/movies/${movieId}/reviews/${reviewId}`, data);
    return { review: normalizeReview(response.data), created: false, status: response.status };
  },

  async deleteReview(movieId, reviewId) {
    const response = await api.delete(`/movies/${movieId}/reviews/${reviewId}`);
    return response.data;
  },
  async generateDescription(payload) {
    const response = await api.post("/movies/generate-description", payload);
    return response.data;
  },

  async moderateReview(movieId, reviewId) {
    const response = await api.delete(`/movies/${movieId}/reviews/${reviewId}/moderate`);
    return response.data;
  },
};
