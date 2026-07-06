jest.mock("./api", () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

import api from "./api";
import { showService } from "./showService";

const show = {
  id: "show-1",
  start_time: "2026-07-01T10:00:00.000Z",
  end_time: "2026-07-01T12:00:00.000Z",
  price: "100000",
  status: "scheduled",
  cancellation_reason: null,
  cancelled_at: null,
};

test("admin show service covers list, detail, create, update, cancel and delete", async () => {
  api.get
    .mockResolvedValueOnce({
      data: {
        data: [show],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      },
    })
    .mockResolvedValueOnce({ data: show });
  api.post.mockResolvedValueOnce({ data: show }).mockResolvedValueOnce({
    data: { message: "Show cancelled", show: { ...show, status: "cancelled" } },
  });
  api.put.mockResolvedValue({ data: show });
  api.delete.mockResolvedValue({ data: { message: "Deleted" } });

  await expect(showService.getAdminShows({ page: 1, status: "scheduled" })).resolves.toMatchObject({
    data: [{ id: "show-1", price: 100000 }],
    pagination: { total: 1 },
  });
  await expect(showService.getAdminShowById("show-1")).resolves.toMatchObject({ id: "show-1" });
  await expect(showService.createShow(show)).resolves.toMatchObject({ status: "scheduled" });
  await expect(showService.updateShow("show-1", show)).resolves.toMatchObject({ id: "show-1" });
  await expect(showService.cancelShow("show-1", "Maintenance")).resolves.toMatchObject({
    show: { status: "cancelled" },
  });
  await expect(showService.deleteShow("show-1")).resolves.toEqual({ message: "Deleted" });

  expect(api.get).toHaveBeenNthCalledWith(1, "/admin/shows", {
    params: { page: 1, status: "scheduled" },
  });
  expect(api.post).toHaveBeenLastCalledWith("/admin/shows/show-1/cancel", {
    reason: "Maintenance",
  });
});
