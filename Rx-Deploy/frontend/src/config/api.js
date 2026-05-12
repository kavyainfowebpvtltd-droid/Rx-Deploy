const DEFAULT_API_BASE_URL = "http://localhost:8090/api";

const normalizeApiBaseUrl = (value) => {
  const rawValue = (value || DEFAULT_API_BASE_URL).trim();
  const sanitizedValue = rawValue.replace(/\/+$/, "");

  return sanitizedValue.endsWith("/api")
    ? sanitizedValue
    : `${sanitizedValue}/api`;
};

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);
export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, "");

export const buildApiUrl = (path = "") => {
  if (!path) {
    return API_BASE_URL;
  }

  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

export const buildBackendFileUrl = (path = "") => {
  if (!path) {
    return "";
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
};
