const APP_TIME_ZONE = "Asia/Kolkata";

const parseBackendDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const rawValue = String(value);
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(rawValue);
  const date = new Date(hasTimeZone ? rawValue : `${rawValue}Z`);

  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatAppDate = (value, options = {}) => {
  const date = parseBackendDate(value);

  if (!date) return "N/A";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    month: "numeric",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(date);
};

export const formatAppDateTime = (value, options = {}) =>
  formatAppDate(value, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
