import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { catalogService } from "../../services/catalogService";
import { renderWithProviders } from "../../test-utils/renderWithProviders";
import AdminUsers from "./AdminUsers";

jest.mock("../../services/catalogService", () => ({ catalogService: { getUsers: jest.fn() } }));

const userPage = (page, name = `User ${page}`) => ({
  data: [
    {
      id: `user-${page}`,
      name,
      email: `user${page}@example.com`,
      phone: null,
      role: "customer",
      created_at: null,
    },
  ],
  pagination: { page, limit: 20, total: 40, pages: 2 },
});

test("admin users searches and follows server pagination", async () => {
  catalogService.getUsers.mockImplementation(({ page, search }) =>
    Promise.resolve(userPage(page, search || `User ${page}`)),
  );
  renderWithProviders(<AdminUsers />);

  expect(await screen.findByText("User 1")).toBeInTheDocument();
  userEvent.click(screen.getByRole("button", { name: "Sau" }));
  expect(await screen.findByText("User 2")).toBeInTheDocument();
  expect(catalogService.getUsers).toHaveBeenLastCalledWith({ page: 2, limit: 20 });

  userEvent.type(screen.getByRole("textbox"), "Alice");
  await waitFor(() =>
    expect(catalogService.getUsers).toHaveBeenLastCalledWith({
      page: 1,
      limit: 20,
      search: "Alice",
    }),
  );
});
