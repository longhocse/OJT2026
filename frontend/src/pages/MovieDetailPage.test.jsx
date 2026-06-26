import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { bookingService } from "../services/bookingService";
import { movieService } from "../services/movieService";
import { renderWithProviders } from "../test-utils/renderWithProviders";
import MovieDetailPage from "./MovieDetailPage";

jest.mock("../services/movieService", () => ({
  movieService: { getMovieById: jest.fn(), getReviews: jest.fn(), addReview: jest.fn() },
}));
jest.mock("../services/bookingService", () => ({ bookingService: { getShows: jest.fn() } }));

const MOVIE_ID = "22222222-2222-4222-8222-222222222222";
const movie = {
  id: MOVIE_ID,
  title: "Review Movie",
  description: "Story",
  genre: "Drama",
  rating: 4,
  duration: 120,
  poster_url: null,
  release_date: "2026-06-01",
  status: "now_showing",
  reviews: [],
};

test("authenticated user submits a 1-5 review and refreshes review data", async () => {
  movieService.getMovieById.mockResolvedValue(movie);
  movieService.getReviews.mockResolvedValue([]);
  movieService.addReview.mockResolvedValue({
    created: true,
    status: 201,
    review: { id: "review-1", rating: 4, comment: "Good" },
  });
  bookingService.getShows.mockResolvedValue([]);
  renderWithProviders(
    <Routes>
      <Route path="/movie/:id" element={<MovieDetailPage />} />
    </Routes>,
    {
      route: `/movie/${MOVIE_ID}`,
      preloadedState: {
        auth: {
          token: "token",
          user: { id: "user-1", role: "customer" },
          isAuthenticated: true,
          verificationStatus: "authenticated",
        },
      },
    },
  );

  expect(await screen.findByText("Review Movie")).toBeInTheDocument();
  userEvent.click(screen.getByRole("button", { name: "4 sao" }));
  userEvent.type(screen.getByRole("textbox"), "Good");
  userEvent.click(screen.getByRole("button", { name: /đánh giá/i }));

  await waitFor(() =>
    expect(movieService.addReview).toHaveBeenCalledWith(MOVIE_ID, { rating: 4, comment: "Good" }),
  );
  expect(await screen.findByText("Đánh giá đã được tạo.")).toBeInTheDocument();
  await waitFor(() => expect(movieService.getReviews.mock.calls.length).toBeGreaterThanOrEqual(2));
});
