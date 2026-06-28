import { getReviewSubmissionState } from "./reviewContract";

test("maps REVIEW_NOT_ALLOWED to a used-ticket message", () => {
  const state = getReviewSubmissionState({
    response: {
      status: 403,
      data: { code: "REVIEW_NOT_ALLOWED", message: "A used ticket is required", errors: [] },
    },
  });
  expect(state.kind).toBe("not-eligible");
  expect(state.message).toMatch(/vé đã check-in/i);
});

test.each([
  [{ response: { status: 409, data: { code: "CONFLICT" } } }, "conflict"],
  [{ request: {}, message: "Network Error" }, "network"],
  [{ response: { status: 400, data: { code: "BAD", message: "Bad review" } } }, "error"],
])("maps other review failures", (error, kind) => {
  expect(getReviewSubmissionState(error).kind).toBe(kind);
});
