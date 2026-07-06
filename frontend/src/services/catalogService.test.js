jest.mock("./api", () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
}));

import api from "./api";
import { catalogService } from "./catalogService";

const theater = { id: "theater-1", name: "Cinema", address: null, city: null, phone: null };
const room = { id: "room-1", name: "Room", total_seats: 50, layout_json: null, theater };

test("loads genres from the public backend endpoint", async () => {
  api.get.mockResolvedValue({ data: [{ id: "genre-1", name: "Drama", description: null }] });
  await expect(catalogService.getGenres()).resolves.toEqual([
    { id: "genre-1", name: "Drama", description: null },
  ]);
  expect(api.get).toHaveBeenCalledWith("/genres");
});

test("catalog user pagination uses the backend envelope", async () => {
  api.get.mockResolvedValue({
    data: {
      success: true,
      data: [{ id: "user-1", name: "User", role: "customer" }],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 },
    },
  });
  await expect(catalogService.getUsers({ page: 1 })).resolves.toMatchObject({
    data: [{ id: "user-1" }],
    pagination: { total: 1 },
  });
  expect(api.get).toHaveBeenCalledWith("/users", { params: { page: 1 } });
});

test("admin updates user role and lock state", async () => {
  api.patch.mockResolvedValue({
    data: { id: "user-1", name: "User", role: "admin", is_active: false },
  });
  await expect(
    catalogService.updateUserAccess("user-1", { role: "admin", is_active: false }),
  ).resolves.toMatchObject({ role: "admin", is_active: false });
  expect(api.patch).toHaveBeenCalledWith("/users/user-1", {
    role: "admin",
    is_active: false,
  });
});

test("covers cinema CRUD endpoints", async () => {
  api.get.mockResolvedValueOnce({ data: [theater] }).mockResolvedValueOnce({ data: theater });
  api.post.mockResolvedValue({ data: theater });
  api.put.mockResolvedValue({ data: theater });
  api.delete.mockResolvedValue({ data: { message: "Deleted" } });
  await expect(catalogService.getCinemas()).resolves.toHaveLength(1);
  await expect(catalogService.getCinemaById("theater-1")).resolves.toMatchObject({
    name: "Cinema",
  });
  await expect(catalogService.createCinema({ name: "Cinema" })).resolves.toMatchObject({
    id: "theater-1",
  });
  await expect(catalogService.updateCinema("theater-1", { name: "Cinema" })).resolves.toMatchObject(
    { id: "theater-1" },
  );
  await expect(catalogService.deleteCinema("theater-1")).resolves.toEqual({ message: "Deleted" });
});

test("covers room CRUD endpoints", async () => {
  api.get.mockResolvedValueOnce({ data: [room] }).mockResolvedValueOnce({ data: room });
  api.post.mockResolvedValue({ data: room });
  api.put.mockResolvedValue({ data: room });
  api.delete.mockResolvedValue({ data: { message: "Deleted" } });
  await expect(catalogService.getRooms({ cinemaId: "theater-1" })).resolves.toHaveLength(1);
  await expect(catalogService.getRoomById("room-1")).resolves.toMatchObject({ total_seats: 50 });
  await expect(catalogService.createRoom({ name: "Room" })).resolves.toMatchObject({
    id: "room-1",
  });
  await expect(catalogService.updateRoom("room-1", { name: "Room" })).resolves.toMatchObject({
    id: "room-1",
  });
  await expect(catalogService.deleteRoom("room-1")).resolves.toEqual({ message: "Deleted" });
});
