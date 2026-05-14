import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  buttonClassName = "",
  textClassName = "",
  iconClassName = "",
  menuClassName = "",
  optionClassName = "",
  disabled = false,
  onBlur,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const normalizedOptions = useMemo(
    () =>
      (options || []).map((option) =>
        typeof option === "string"
          ? { value: option, label: option }
          : option,
      ),
    [options],
  );

  const selectedOption = normalizedOptions.find(
    (option) => String(option.value) === String(value),
  );
  const displayLabel =
    selectedOption?.label ??
    (value !== undefined && value !== null && value !== ""
      ? String(value)
      : placeholder);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleContainerBlur = (event) => {
    const nextFocusedElement = event.relatedTarget;
    if (!containerRef.current?.contains(nextFocusedElement)) {
      setOpen(false);
      onBlur?.(event);
    }
  };

  return (
    <div className="relative min-w-0" ref={containerRef} onBlur={handleContainerBlur}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={String(displayLabel)}
        disabled={disabled}
        className={`grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-left text-gray-700 transition-all duration-200 outline-none hover:border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563EB] ${
          disabled ? "cursor-not-allowed opacity-60" : ""
        } ${buttonClassName}`}
        style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }}
      >
        <span
          className={`block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap break-normal text-base font-normal ${
            selectedOption ? "text-gray-700" : "text-gray-500"
          } ${textClassName}`}
          style={{
            color: selectedOption ? "#374151" : "#6B7280",
          }}
        >
          {displayLabel}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 justify-self-end text-gray-500 transition-transform duration-200 ${iconClassName} ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-lg ${menuClassName}`}
        >
          <div className="max-h-72 overflow-y-auto pr-1">
            {normalizedOptions.map((option) => {
              const selected = String(option.value) === String(value);

              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`mb-1 flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-base font-normal transition-colors duration-150 last:mb-0 ${
                    selected
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-700 hover:bg-gray-50"
                  } ${optionClassName}`}
                >
                  <span className="block min-w-0 flex-1 truncate whitespace-nowrap break-normal">
                    {option.label}
                  </span>
                  {selected && <Check className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
