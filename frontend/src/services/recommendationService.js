import { normalizeMovie } from "../contracts/normalizers";
import api from "./api";

const normalizeRecommendations = (data) => (Array.isArray(data) ? data.map(normalizeMovie) : []);

export const recommendationService = {
  async getPersonal() {
    const response = await api.get("/recommendations");
    return normalizeRecommendations(response.data);
  },

  async getTrending() {
    const response = await api.get("/recommendations/trending");
    return normalizeRecommendations(response.data);
  },
};
