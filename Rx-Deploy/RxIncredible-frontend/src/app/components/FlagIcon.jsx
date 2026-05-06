export function FlagIcon({
  countryCode,
  fallback,
  alt = "",
  className = "h-5 w-7 rounded-sm object-cover",
  fallbackClassName = "text-xl leading-none",
}) {
  const normalizedCode = (countryCode || "").toLowerCase();
  const flagUrl = normalizedCode
    ? `https://flagcdn.com/w40/${normalizedCode}.png`
    : "";

  return (
    <span className="relative inline-flex items-center justify-center shrink-0">
      {flagUrl ? (
        <img
          src={flagUrl}
          alt={alt}
          className={className}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = "none";
            const fallbackElement = event.currentTarget.nextElementSibling;
            if (fallbackElement) {
              fallbackElement.style.display = "inline-flex";
            }
          }}
        />
      ) : null}
      <span
        className={fallbackClassName}
        aria-hidden="true"
        style={{ display: flagUrl ? "none" : "inline-flex" }}
      >
        {fallback || ""}
      </span>
    </span>
  );
}
