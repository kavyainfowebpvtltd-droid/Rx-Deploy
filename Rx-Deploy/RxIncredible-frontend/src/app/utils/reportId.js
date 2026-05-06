export const formatReportId = (value) => {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  const id = String(value);

  if (id.startsWith("REP-")) {
    return id;
  }

  if (id.startsWith("ORD-")) {
    return `REP-${id.slice(4)}`;
  }

  return `REP-${id}`;
};
