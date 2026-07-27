/* eslint-disable testing-library/no-node-access, testing-library/no-container */
import { render, screen, waitFor } from "@testing-library/react";
import GoogleSignInButton from "./GoogleSignInButton";

afterEach(() => {
  delete window.google;
  document.getElementById("google-identity-services")?.remove();
  jest.restoreAllMocks();
});

test("initializes Google Identity and forwards a returned credential", async () => {
  const onCredential = jest.fn();
  const initialize = jest.fn();
  const renderButton = jest.fn();
  window.google = { accounts: { id: { initialize, renderButton } } };

  const { container } = render(<GoogleSignInButton onCredential={onCredential} disabled />);

  await waitFor(() => expect(initialize).toHaveBeenCalledTimes(1));
  expect(renderButton).toHaveBeenCalledTimes(1);
  expect(container.querySelector("[aria-disabled='true']")).toHaveClass("opacity-50");

  initialize.mock.calls[0][0].callback({ credential: "google-id-token" });
  expect(onCredential).toHaveBeenCalledWith("google-id-token");
  initialize.mock.calls[0][0].callback({});
  expect(onCredential).toHaveBeenCalledTimes(1);
});

test("shows an error when the Google Identity script cannot load", async () => {
  render(<GoogleSignInButton onCredential={jest.fn()} />);
  const script = document.getElementById("google-identity-services");
  script.dispatchEvent(new Event("error"));
  expect(await screen.findByText("Không thể tải đăng nhập Google.")).toBeInTheDocument();
});
