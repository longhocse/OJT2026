import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import VerifyEmailPage from "./VerifyEmailPage";
import useAuth from "../hooks/useAuth";

jest.mock("../hooks/useAuth");

const verifyEmail = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ verifyEmail });
});

test("submits a verification token only once in React StrictMode", async () => {
  verifyEmail.mockResolvedValue({
    token: "access-token",
    user: { id: "user-1", role: "customer" },
  });

  render(
    <React.StrictMode>
      <MemoryRouter initialEntries={["/verify-email?token=valid-verification-token"]}>
        <VerifyEmailPage />
      </MemoryRouter>
    </React.StrictMode>,
  );

  await waitFor(() => expect(verifyEmail).toHaveBeenCalledTimes(1));
  expect(verifyEmail).toHaveBeenCalledWith("valid-verification-token");
  expect(await screen.findByRole("status")).toHaveTextContent(/đã được xác thực/i);
});

test("does not call the API when the verification token is missing", async () => {
  render(
    <MemoryRouter initialEntries={["/verify-email"]}>
      <VerifyEmailPage />
    </MemoryRouter>,
  );

  expect(await screen.findByRole("alert")).toBeInTheDocument();
  expect(verifyEmail).not.toHaveBeenCalled();
});
