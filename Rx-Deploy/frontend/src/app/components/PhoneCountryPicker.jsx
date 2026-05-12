import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { PHONE_COUNTRIES, getPhoneCountry } from "@/app/utils/phoneValidation.js";
import { FlagIcon } from "./FlagIcon.jsx";

export function PhoneCountryPicker({
  value,
  onChange,
  className = "w-[140px]",
  labelMode = "short",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);
  const selectedCountry = getPhoneCountry(value);

  const filteredCountries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return PHONE_COUNTRIES;
    }

    return PHONE_COUNTRIES.filter((country) => {
      const haystack = [
        country.label,
        country.shortLabel,
        country.code,
        country.dialCode,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const triggerLabel =
    labelMode === "full" ? selectedCountry.label : selectedCountry.shortLabel;

  return (
    <div className={`relative shrink-0 ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="w-full min-h-[52px] px-3 border border-gray-300 rounded-xl bg-white flex items-center justify-between gap-2 transition-all duration-200 hover:border-gray-400 focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
      >
        <span className="flex items-center gap-2 min-w-0">
          <FlagIcon
            countryCode={selectedCountry.code}
            fallback={selectedCountry.flag}
            alt={`${selectedCountry.label} flag`}
          />
          <span className="text-sm font-medium text-gray-700 truncate">
            {triggerLabel}
          </span>
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search country"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto py-1">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => {
                    onChange(country.code);
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className={`w-full px-3 py-2.5 text-left flex items-center gap-3 hover:bg-blue-50 transition-colors ${
                    country.code === value ? "bg-blue-50" : ""
                  }`}
                >
                  <FlagIcon
                    countryCode={country.code}
                    fallback={country.flag}
                    alt={`${country.label} flag`}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm text-gray-900 truncate">
                      {country.label}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {country.shortLabel} {country.dialCode}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <p className="px-3 py-4 text-sm text-gray-500">No countries found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
