import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  buttonClassName = "",
  menuClassName = "",
  optionClassName = "",
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
        className={`w-full flex items-center justify-between gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-left text-[#1E3A8A] shadow-sm transition-all duration-200 hover:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB] ${
          disabled ? "cursor-not-allowed opacity-60" : ""
        } ${buttonClassName}`}
      >
        <span className="truncate font-medium">
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-blue-100 bg-white py-2 shadow-[0_18px_45px_rgba(30,58,138,0.18)] ${menuClassName}`}
        >
          <div className="max-h-64 overflow-y-auto p-1">
            {normalizedOptions.map((option) => {
              const selected = option.value === value;

              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors duration-150 ${
                    selected
                      ? "bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white"
                      : "text-[#1E3A8A] hover:bg-[#EEF4FF]"
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
