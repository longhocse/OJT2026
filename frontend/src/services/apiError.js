const DEFAULT_ERROR_MESSAGE = "Đã có lỗi xảy ra. Vui lòng thử lại.";
const NETWORK_ERROR_MESSAGE = "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối.";

const normalizeField = (field) =>
  typeof field === "string" ? field.replace(/^(body|query|params)\./, "") : "";

export const normalizeApiError = (error) => {
  const response = error?.response;
  const payload = response?.data;
  const serverErrors = Array.isArray(payload?.errors) ? payload.errors : [];

  if (!response) {
    return {
      status: null,
      code: "NETWORK_ERROR",
      message: error?.message && !error?.request ? error.message : NETWORK_ERROR_MESSAGE,
      errors: [],
      fieldErrors: {},
    };
  }

  const errors = serverErrors
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      field: normalizeField(item.field),
      message: typeof item.message === "string" ? item.message : DEFAULT_ERROR_MESSAGE,
    }));

  return {
    status: response.status,
    code: typeof payload?.code === "string" ? payload.code : "REQUEST_ERROR",
    message:
      typeof payload?.message === "string" && payload.message.trim()
        ? payload.message
        : DEFAULT_ERROR_MESSAGE,
    errors,
    fieldErrors: errors.reduce((result, item) => {
      if (item.field && !result[item.field]) result[item.field] = item.message;
      return result;
    }, {}),
  };
};

export const getApiErrorMessage = (error, fallback = DEFAULT_ERROR_MESSAGE) =>
  normalizeApiError(error).message || fallback;

export const getApiFieldErrors = (error) => normalizeApiError(error).fieldErrors;
