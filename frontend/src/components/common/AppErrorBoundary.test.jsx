import { render, screen } from "@testing-library/react";
import AppErrorBoundary from "./AppErrorBoundary";

const BrokenView = () => {
  throw new Error("private stack detail");
};

test("shows a safe application fallback without rendering error details", () => {
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  render(
    <AppErrorBoundary>
      <BrokenView />
    </AppErrorBoundary>,
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Ứng dụng gặp sự cố");
  expect(screen.getByRole("button", { name: "Tải lại trang" })).toBeInTheDocument();
  expect(screen.queryByText(/private stack detail/i)).not.toBeInTheDocument();
  consoleError.mockRestore();
});
