jest.mock("./api", () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() }));

import api from "./api";
import { movieService } from "./movieService";

const movie = { id: "movie-1", title: "Movie", rating: 4, duration: 120, status: "now_showing" };
const page = { data: [movie], pagination: { page: 1, limit: 10, total: 1, pages: 1 } };

test("covers movie list, detail and admin CRUD", async () => {
  api.get.mockResolvedValueOnce({ data: page }).mockResolvedValueOnce({ data: movie });
  api.post.mockResolvedValue({ data: movie });
  api.put.mockResolvedValue({ data: movie });
  api.delete.mockResolvedValue({ data: { message: "Deleted" } });
  await expect(movieService.getMovies({ page: 1 })).resolves.toMatchObject({
    pagination: { total: 1 },
  });
  await expect(movieService.getMovieById("movie-1")).resolves.toMatchObject({ title: "Movie" });
  await expect(movieService.createMovie({ title: "Movie" })).resolves.toMatchObject({
    id: "movie-1",
  });
  await expect(movieService.updateMovie("movie-1", { title: "Movie" })).resolves.toMatchObject({
    id: "movie-1",
  });
  await expect(movieService.deleteMovie("movie-1")).resolves.toEqual({ message: "Deleted" });
});

test("loads and sanitizes the public review list", async () => {
  api.get.mockResolvedValue({
    data: [
      {
        id: "review-1",
        rating: 5,
        comment: "Good",
        user: { id: "user-1", name: "Public", email: "private@example.com" },
      },
    ],
  });
  const reviews = await movieService.getReviews("movie-1");
  expect(api.get).toHaveBeenCalledWith("/movies/movie-1/reviews");
  expect(reviews[0].user).toEqual({ id: "user-1", name: "Public" });
});
