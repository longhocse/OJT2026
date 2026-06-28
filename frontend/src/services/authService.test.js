jest.mock("./api", () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));

import api from "./api";
import { authService } from "./authService";

const response = {
  message: "ok",
  token: "token",
  user: { id: "user-1", email: "u@example.com", name: "User", role: "customer" },
};

test("login and verifyEmail normalize auth responses; register returns verification status", async () => {
  api.post
    .mockResolvedValueOnce({ data: response })
    .mockResolvedValueOnce({ data: { message: "Check email", emailSent: true } })
    .mockResolvedValueOnce({ data: response });
  await expect(
    authService.login({ email: "u@example.com", password: "Password1" }),
  ).resolves.toMatchObject({ token: "token", user: { id: "user-1" } });
  await expect(
    authService.register({ email: "u@example.com", password: "Password1", name: "User" }),
  ).resolves.toMatchObject({ message: "Check email", emailSent: true });
  await expect(authService.verifyEmail("verify-token")).resolves.toMatchObject({ token: "token" });
  expect(api.post.mock.calls.map(([url]) => url)).toEqual([
    "/auth/login",
    "/auth/register",
    "/auth/verify-email",
  ]);
});

test("getMe rebuilds the public user from the backend", async () => {
  api.get.mockResolvedValue({ data: response.user });
  await expect(authService.getMe()).resolves.toMatchObject({ id: "user-1", role: "customer" });
  expect(api.get).toHaveBeenCalledWith("/auth/me");
});

test("covers refresh, logout, profile and password recovery endpoints", async () => {
  api.post
    .mockResolvedValueOnce({ data: response })
    .mockResolvedValueOnce({ data: { message: "Logged out" } })
    .mockResolvedValueOnce({ data: { message: "Password changed" } })
    .mockResolvedValueOnce({ data: { message: "Reset requested" } })
    .mockResolvedValueOnce({ data: { message: "Password reset successful" } })
    .mockResolvedValueOnce({ data: { message: "Verification sent", emailSent: true } });
  api.put.mockResolvedValue({ data: { ...response.user, name: "Updated" } });

  await expect(authService.refresh()).resolves.toMatchObject({ token: "token" });
  await expect(authService.logout()).resolves.toEqual({ message: "Logged out" });
  await expect(authService.updateProfile({ name: "Updated" })).resolves.toMatchObject({
    name: "Updated",
  });
  await expect(
    authService.changePassword({ currentPassword: "Old12345", newPassword: "New12345" }),
  ).resolves.toEqual({ message: "Password changed" });
  await expect(authService.forgotPassword("u@example.com")).resolves.toEqual({
    message: "Reset requested",
  });
  await expect(
    authService.resetPassword({ token: "reset", newPassword: "New12345" }),
  ).resolves.toEqual({ message: "Password reset successful" });
  await expect(authService.resendVerification("u@example.com")).resolves.toEqual({
    message: "Verification sent",
    emailSent: true,
  });
  expect(api.put).toHaveBeenCalledWith("/auth/profile", { name: "Updated" });
});
