import { configureStore } from "@reduxjs/toolkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import authReducer, { initialAuthState } from "../../redux/slices/authSlice";
import { recommendationService } from "../../services/recommendationService";
import RecommendationWidget from "./RecommendationWidget";

jest.mock("../../services/recommendationService", () => ({
  recommendationService: { getPersonal: jest.fn(), getTrending: jest.fn() },
}));
jest.mock("../common/MovieCard", () => ({ movie }) => <div>{movie.title}</div>);

const renderWidget = (auth = {}) => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { ...initialAuthState, ...auth } },
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <RecommendationWidget />
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>,
  );
};

describe("RecommendationWidget", () => {
  beforeEach(() => jest.clearAllMocks());

  test("guest loads public trending recommendations and sees login CTA", async () => {
    recommendationService.getTrending.mockResolvedValue([]);
    renderWidget({ verificationStatus: "anonymous" });
    await waitFor(() => expect(recommendationService.getTrending).toHaveBeenCalledTimes(1));
    expect(recommendationService.getPersonal).not.toHaveBeenCalled();
    expect(await screen.findByRole("link", { name: "Đăng nhập" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  test("verified user loads personal recommendations only", async () => {
    recommendationService.getPersonal.mockResolvedValue([]);
    renderWidget({
      token: "jwt-token",
      user: { id: "user-1", role: "customer" },
      isAuthenticated: true,
      verificationStatus: "authenticated",
    });
    await waitFor(() => expect(recommendationService.getPersonal).toHaveBeenCalledTimes(1));
    expect(recommendationService.getTrending).not.toHaveBeenCalled();
  });
});
