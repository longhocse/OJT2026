import { screen } from "@testing-library/react";
import { renderWithProviders } from "./test-utils/renderWithProviders";
import App from "./App";

jest.mock("./components/auth/AuthSessionManager", () => () => (
  <div data-testid="auth-session-manager" />
));
jest.mock("./layouts/UserLayout", () => () => <main>Public application shell</main>);
jest.mock("./layouts/AdminLayout", () => () => <main>Admin application shell</main>);

test("application boots the public route with auth session management", async () => {
  window.history.pushState({}, "", "/");
  renderWithProviders(<App />, { includeRouter: false });
  expect(await screen.findByText("Public application shell")).toBeInTheDocument();
  expect(screen.getByTestId("auth-session-manager")).toBeInTheDocument();
});
