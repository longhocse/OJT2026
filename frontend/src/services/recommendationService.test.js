jest.mock("./api", () => ({ get: jest.fn() }));

import api from "./api";
import { recommendationService } from "./recommendationService";

const movie = {
  id: "22222222-2222-4222-8222-222222222222",
  title: "Movie",
  rating: 4,
  duration: 120,
  status: "now_showing",
};

test("personal recommendation sends no userId or query params", async () => {
  api.get.mockResolvedValue({ data: [movie] });
  const result = await recommendationService.getPersonal();
  expect(api.get).toHaveBeenCalledWith("/recommendations");
  expect(api.get.mock.calls[0]).toHaveLength(1);
  expect(result[0].title).toBe("Movie");
});

test("guest recommendation uses the public trending endpoint", async () => {
  api.get.mockResolvedValue({ data: [] });
  await recommendationService.getTrending();
  expect(api.get).toHaveBeenCalledWith("/recommendations/trending");
});
