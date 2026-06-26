import { getReviewSubmissionState } from "./reviewContract";

test("maps REVIEW_NOT_ALLOWED to a confirmed-booking message", () => {
  const state = getReviewSubmissionState({
    response: {
      status: 403,
      data: { code: "REVIEW_NOT_ALLOWED", message: "A confirmed booking is required", errors: [] },
    },
  });
  expect(state.kind).toBe("not-eligible");
  expect(state.message).toMatch(/booking đã xác nhận/i);
});

test.each([
  [{ response: { status: 409, data: { code: "CONFLICT" } } }, "conflict"],
  [{ request: {}, message: "Network Error" }, "network"],
  [{ response: { status: 400, data: { code: "BAD", message: "Bad review" } } }, "error"],
])("maps other review failures", (error, kind) => {
  expect(getReviewSubmissionState(error).kind).toBe(kind);
});
