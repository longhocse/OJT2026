import api from "./api";

export const movieService = {
  getMovies: async (params = {}) => {
    const response = await api.get("/movies", { params });
    return response.data;
  },
  getMovieById: async (id) => {
    const response = await api.get(`/movies/${id}`);
    return response.data;
  },
  getReviews: async (movieId) => {
    const response = await api.get(`/movies/${movieId}/reviews`);
    return response.data;
  },
  addReview: async (movieId, data) => {
    const response = await api.post(`/movies/${movieId}/reviews`, data);
    return response.data;
  },
};