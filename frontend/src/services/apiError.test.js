import { getApiFieldErrors, normalizeApiError } from "./apiError";

describe("API error normalization", () => {
  test("normalizes the backend error contract and field paths", () => {
    const error = {
      response: {
        status: 400,
        data: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          errors: [{ field: "body.email", message: "Invalid email address" }],
        },
      },
    };

    expect(normalizeApiError(error)).toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      fieldErrors: { email: "Invalid email address" },
    });
    expect(getApiFieldErrors(error)).toEqual({ email: "Invalid email address" });
  });

  test("returns a safe message for a network failure", () => {
    expect(normalizeApiError({ request: {} })).toMatchObject({
      code: "NETWORK_ERROR",
      status: null,
    });
  });
});
