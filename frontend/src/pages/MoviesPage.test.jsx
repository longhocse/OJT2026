import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { movieService } from "../services/movieService";
import { catalogService } from "../services/catalogService";
import { renderWithProviders } from "../test-utils/renderWithProviders";
import MoviesPage from "./MoviesPage";

jest.mock("../services/movieService", () => ({ movieService: { getMovies: jest.fn() } }));
jest.mock("../services/catalogService", () => ({ catalogService: { getGenres: jest.fn() } }));
jest.mock("../components/common/MovieCard", () => ({ movie }) => <article>{movie.title}</article>);

const pageResult = (page) => ({
  data: [{ id: `movie-${page}`, title: `Movie page ${page}` }],
  pagination: { page, limit: 12, total: 24, pages: 2 },
});

test("movie list sends valid filters and changes backend pagination", async () => {
  catalogService.getGenres.mockResolvedValue([{ id: "genre-1", name: "Drama" }]);
  movieService.getMovies.mockImplementation(({ page }) => Promise.resolve(pageResult(page)));
  renderWithProviders(
    <Routes>
      <Route path="/movies" element={<MoviesPage />} />
    </Routes>,
    {
      route: "/movies?status=now_showing",
    },
  );

  expect(await screen.findByText("Movie page 1")).toBeInTheDocument();
  userEvent.selectOptions(screen.getAllByLabelText(/Đánh giá/i)[0], "4");
  await waitFor(() =>
    expect(movieService.getMovies).toHaveBeenLastCalledWith(
      expect.objectContaining({
        minRating: 4,
        sortBy: "release_date",
        status: "now_showing",
        page: 1,
      }),
    ),
  );
  expect(await screen.findByText("Movie page 1")).toBeInTheDocument();

  userEvent.click(screen.getByRole("button", { name: "Sau" }));
  expect(await screen.findByText("Movie page 2")).toBeInTheDocument();
  expect(movieService.getMovies).toHaveBeenLastCalledWith(
    expect.objectContaining({ page: 2, minRating: 4 }),
  );
});
