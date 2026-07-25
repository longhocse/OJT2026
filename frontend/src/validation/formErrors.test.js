import { applyBackendErrors, getFormLevelError } from "./formErrors";

const responseError = (status, data) => ({ response: { status, data } });

describe("form backend error mapping", () => {
  afterEach(() => jest.useRealTimers());

  test("maps errors[].field to the matching input and focuses it", () => {
    jest.useFakeTimers();
    const setError = jest.fn();
    const setFocus = jest.fn();
    const error = responseError(400, {
      code: "VALIDATION_ERROR",
      message: "Invalid input",
      errors: [{ field: "body.email", message: "Email already used" }],
    });
    expect(applyBackendErrors(error, { setError, setFocus, allowedFields: ["email"] })).toBe("");
    expect(setError).toHaveBeenCalledWith("email", {
      type: "server",
      message: "Email already used",
    });
    jest.runOnlyPendingTimers();
    expect(setFocus).toHaveBeenCalledWith("email");
  });

  test.each([
    [401, "Phiên"],
    [403, "quyền"],
    [409, "xung đột"],
  ])("returns a form-level error for status %s", (status, text) => {
    expect(
      getFormLevelError(
        responseError(status, { message: status === 409 ? "Dữ liệu xung đột" : "Server detail" }),
      ),
    ).toMatch(new RegExp(text, "i"));
  });

  test("returns an accessible network-level message", () => {
    expect(getFormLevelError({ request: {}, message: "Network Error" })).toMatch(/kết nối/i);
  });
});
