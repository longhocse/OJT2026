import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ApiErrorPage from "./ApiErrorPage";
import NotFoundPage from "./NotFoundPage";

test("404 page provides a safe route home", () => {
  render(
    <MemoryRouter>
      <NotFoundPage />
    </MemoryRouter>,
  );
  expect(screen.getByRole("heading", { name: "Không tìm thấy trang" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Về trang chủ" })).toHaveAttribute("href", "/");
});

test("API error page never exposes technical response details", () => {
  render(
    <MemoryRouter
      initialEntries={[{ pathname: "/error", state: { message: "Dịch vụ đang bảo trì." } }]}
    >
      <ApiErrorPage />
    </MemoryRouter>,
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Dịch vụ đang bảo trì.");
  expect(screen.queryByText(/stack|axios|authorization/i)).not.toBeInTheDocument();
});
