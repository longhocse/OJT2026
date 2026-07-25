import { normalizeApiError } from "../services/apiError";

export const getReviewSubmissionState = (error) => {
  const apiError = normalizeApiError(error);
  if (apiError.code === "REVIEW_NOT_ALLOWED" || apiError.status === 403) {
    return {
      kind: "not-eligible",
      message: "Bạn cần có vé đã check-in/đã dùng cho phim này trước khi có thể đánh giá.",
    };
  }
  if (apiError.status === 409) {
    return {
      kind: "conflict",
      message: "Đánh giá vừa bị thay đổi ở nơi khác. Vui lòng tải lại và thử lại.",
    };
  }
  if (apiError.status === null) {
    return {
      kind: "network",
      message: "Không thể kết nối máy chủ để gửi đánh giá. Vui lòng thử lại.",
    };
  }
  return { kind: "error", message: apiError.message || "Không thể gửi đánh giá." };
};
