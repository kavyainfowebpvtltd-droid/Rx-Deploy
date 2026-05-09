export const INDIA_COUNTRY_NAMES = new Set(["india", "in", "bharat"]);

export const isIndiaCountry = (country) => {
  if (!country || String(country).trim() === "") {
    return true;
  }

  return INDIA_COUNTRY_NAMES.has(String(country).trim().toLowerCase());
};

export const getCurrencySymbol = (country) =>
  isIndiaCountry(country) ? "₹" : "$";

export const shouldApplyGstForCountry = (country) => isIndiaCountry(country);

export const getServicePricing = (country) => {
  const isIndia = isIndiaCountry(country);

  return {
    "prescription-analysis": {
      name: "Prescription Analysis",
      price: isIndia ? 1 : 10,
      description: "Detailed analysis of your prescription by expert pharmacists",
    },
    "second-opinion": {
      name: "Second Opinion",
      price: isIndia ? 1 : 100,
      description:
        "Get a second medical opinion from certified healthcare professionals",
    },
    "online-pharmacy": {
      name: "Online Pharmacy",
      price: 0,
      description: "Order medicines online with instant quotations",
    },
  };
};

export const getCombinedPricing = (country) => ({
  "prescription-analysis": {
    name: "Prescription Analysis + Second Opinion",
    price: isIndiaCountry(country) ? 5500 : 110,
    description: "Complete analysis with expert review and medical second opinion",
  },
});

export const formatCurrencyAmount = (amount, country) => {
  const value = Number(amount || 0);
  return `${getCurrencySymbol(country)}${value.toLocaleString()}`;
};
