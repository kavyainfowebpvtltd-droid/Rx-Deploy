const INDIA_STATES = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Tawang"],
  Assam: ["Guwahati", "Silchar", "Dibrugarh", "Jorhat"],
  Bihar: ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur"],
  Chhattisgarh: ["Raipur", "Bilaspur", "Durg", "Bhilai"],
  Goa: ["Panaji", "Margao", "Vasco da Gama"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
  Haryana: ["Gurugram", "Faridabad", "Panipat", "Hisar"],
  "Himachal Pradesh": ["Shimla", "Dharamshala", "Mandi"],
  Jharkhand: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro"],
  Karnataka: ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi"],
  Kerala: ["Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Gwalior"],
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik"],
  Manipur: ["Imphal", "Thoubal", "Bishnupur"],
  Meghalaya: ["Shillong", "Tura", "Jowai"],
  Mizoram: ["Aizawl", "Lunglei", "Champhai"],
  Nagaland: ["Kohima", "Dimapur", "Mokokchung"],
  Odisha: ["Bhubaneswar", "Cuttack", "Rourkela", "Sambalpur"],
  Punjab: ["Ludhiana", "Amritsar", "Jalandhar", "Patiala"],
  Rajasthan: ["Jaipur", "Jodhpur", "Udaipur", "Kota"],
  Sikkim: ["Gangtok", "Namchi", "Gyalshing"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem"],
  Telangana: ["Hyderabad", "Warangal", "Karimnagar", "Nizamabad"],
  Tripura: ["Agartala", "Udaipur", "Dharmanagar"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Noida", "Varanasi"],
  Uttarakhand: ["Dehradun", "Haridwar", "Haldwani", "Roorkee"],
  "West Bengal": ["Kolkata", "Howrah", "Siliguri", "Durgapur"],
  "Andaman and Nicobar Islands": ["Port Blair"],
  Chandigarh: ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa"],
  Delhi: ["New Delhi", "Delhi", "Dwarka", "Rohini"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag"],
  Ladakh: ["Leh", "Kargil"],
  Lakshadweep: ["Kavaratti"],
  Puducherry: ["Puducherry", "Karaikal"],
};

const AUSTRALIA_STATES = {
  "New South Wales": ["Sydney", "Newcastle", "Wollongong"],
  Victoria: ["Melbourne", "Geelong", "Ballarat"],
  Queensland: ["Brisbane", "Gold Coast", "Cairns"],
  "Western Australia": ["Perth", "Bunbury", "Albany"],
  "South Australia": ["Adelaide", "Mount Gambier", "Whyalla"],
  Tasmania: ["Hobart", "Launceston", "Devonport"],
  "Australian Capital Territory": ["Canberra"],
  "Northern Territory": ["Darwin", "Alice Springs"],
};

const COUNTRY_LOCATION_DATA = {
  IN: {
    stateLabel: "State",
    cityLabel: "City",
    postalLabel: "Pincode",
    postalPlaceholder: "6-digit pincode",
    postalPattern: /^\d{6}$/,
    postalError: "Enter a valid 6-digit India pincode",
    states: INDIA_STATES,
  },
  AU: {
    stateLabel: "State / Territory",
    cityLabel: "City",
    postalLabel: "Postcode",
    postalPlaceholder: "4-digit postcode",
    postalPattern: /^\d{4}$/,
    postalError: "Enter a valid 4-digit Australia postcode",
    states: AUSTRALIA_STATES,
  },
  US: {
    stateLabel: "State",
    cityLabel: "City",
    postalLabel: "ZIP Code",
    postalPlaceholder: "5-digit ZIP code",
    postalPattern: /^\d{5}(-\d{4})?$/,
    postalError: "Enter a valid US ZIP code",
  },
  CA: {
    stateLabel: "Province",
    cityLabel: "City",
    postalLabel: "Postal Code",
    postalPlaceholder: "A1A 1A1",
    postalPattern: /^[A-Z]\d[A-Z][ -]?\d[A-Z]\d$/,
    postalError: "Enter a valid Canada postal code",
  },
  GB: {
    stateLabel: "County",
    cityLabel: "Town / City",
    postalLabel: "Postcode",
    postalPlaceholder: "SW1A 1AA",
    postalPattern: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
    postalError: "Enter a valid UK postcode",
  },
  SG: {
    stateLabel: "Region",
    cityLabel: "City",
    postalLabel: "Postal Code",
    postalPlaceholder: "6-digit postal code",
    postalPattern: /^\d{6}$/,
    postalError: "Enter a valid 6-digit Singapore postal code",
  },
  AE: {
    stateLabel: "Emirate",
    cityLabel: "City",
    postalLabel: "Postal Code",
    postalPlaceholder: "Postal code",
    postalPattern: /^[A-Z0-9\s-]{3,12}$/i,
    postalError: "Enter a valid UAE postal code",
  },
};

export const getCountryLocationConfig = (countryCode) =>
  COUNTRY_LOCATION_DATA[countryCode] || {
    stateLabel: "State / Region",
    cityLabel: "City",
    postalLabel: "Postal Code",
    postalPlaceholder: "Postal code",
    postalPattern: /^[A-Z0-9\s-]{3,12}$/i,
    postalError: "Enter a valid postal code",
  };

export const getCountryStateOptions = (countryCode) => {
  const config = getCountryLocationConfig(countryCode);
  return config.states ? Object.keys(config.states) : [];
};

export const getCountryCityOptions = (countryCode, state) => {
  const config = getCountryLocationConfig(countryCode);
  if (!config.states || !state || !config.states[state]) {
    return [];
  }
  return config.states[state];
};

export const hasStructuredStates = (countryCode) =>
  getCountryStateOptions(countryCode).length > 0;

export const hasStructuredCities = (countryCode, state) =>
  getCountryCityOptions(countryCode, state).length > 0;
