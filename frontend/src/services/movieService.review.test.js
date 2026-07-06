jest.mock("./api", () => ({ post: jest.fn() }));

import api from "./api";
import { movieService } from "./movieService";

const responseReview = { id: "33333333-3333-4333-8333-333333333333", rating: 5, comment: "Great" };

test.each([
  [201, true],
  [200, false],
])("review response %s is normalized as create/update", async (status, created) => {
  api.post.mockResolvedValue({ status, data: responseReview });
  const result = await movieService.addReview("movie-1", { rating: 5, comment: "Great" });
  expect(api.post).toHaveBeenCalledWith("/movies/movie-1/reviews", { rating: 5, comment: "Great" });
  expect(result).toMatchObject({ status, created, review: { rating: 5, comment: "Great" } });
});
