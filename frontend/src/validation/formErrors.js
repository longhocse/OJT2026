import { normalizeApiError } from "../services/apiError";

export const getFormLevelError = (error) => {
  const apiError = normalizeApiError(error);
  if (apiError.status === null)
    return "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.";
  if (apiError.status === 401)
    return "Phiên đăng nhập không hợp lệ hoặc thông tin đăng nhập không đúng.";
  if (apiError.status === 403) return "Bạn không có quyền thực hiện thao tác này.";
  if (apiError.status === 409)
    return apiError.message || "Dữ liệu bị xung đột. Vui lòng tải lại và thử lại.";
  return apiError.message || "Không thể hoàn tất yêu cầu.";
};

export const applyBackendErrors = (error, { setError, setFocus, allowedFields = [] }) => {
  const apiError = normalizeApiError(error);
  const allowed = new Set(allowedFields);
  const mapped = apiError.errors.filter((item) => item.field && allowed.has(item.field));

  mapped.forEach((item) => setError(item.field, { type: "server", message: item.message }));
  if (mapped[0]) setTimeout(() => setFocus(mapped[0].field), 0);

  const needsFormError =
    mapped.length === 0 || apiError.status === null || [401, 403, 409].includes(apiError.status);
  return needsFormError ? getFormLevelError(error) : "";
};
