import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

const DEFAULT_SELECTED_OPTION_CLASS =
  "bg-gray-100 text-gray-900 ring-1 ring-inset ring-gray-200";

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  buttonClassName = "",
  menuClassName = "",
  optionClassName = "",
  selectedOptionClassName = "",
  disabled = false,
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

  const selectedOption = normalizedOptions.find((option) => option.value === value);
  const hasValue = value !== "" && value !== null && value !== undefined;

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

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 text-left shadow-sm transition-all duration-200 hover:border-gray-400 focus:outline-none ${
          open
            ? "border-gray-400 ring-2 ring-gray-200"
            : "border-gray-300"
        } ${
          disabled ? "cursor-not-allowed opacity-60" : ""
        } ${buttonClassName}`}
      >
        <span
          className={`truncate font-normal ${
            hasValue ? "text-gray-900" : "text-gray-400"
          }`}
        >
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-gray-500 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-[1.35rem] border border-gray-200 bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.12)] ${menuClassName}`}
        >
          <div className="max-h-64 overflow-y-auto">
            {normalizedOptions.map((option) => {
              const selected = hasValue && option.value === value;

              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-[1.1rem] px-6 py-4 text-left text-base transition-colors duration-150 ${
                    selected
                      ? selectedOptionClassName || DEFAULT_SELECTED_OPTION_CLASS
                      : "text-gray-900 hover:bg-gray-100"
                  } ${optionClassName}`}
                >
                  <span className="truncate">{option.label}</span>
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