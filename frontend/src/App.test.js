import { screen } from "@testing-library/react";
import { renderWithProviders } from "./test-utils/renderWithProviders";
import App from "./App";

jest.mock("./components/auth/AuthSessionManager", () => () => (
  <div data-testid="auth-session-manager-legacy" />
));
jest.mock("./layouts/UserLayout", () => () => <main>MovieTap application</main>);

test("renders the MovieTap application shell", async () => {
  window.history.pushState({}, "", "/");
  renderWithProviders(<App />, { includeRouter: false });
  expect(await screen.findByText("MovieTap application")).toBeInTheDocument();
  expect(screen.getByTestId("auth-session-manager-legacy")).toBeInTheDocument();
});
