const toFlagEmoji = (countryCode) =>
  countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));

const COUNTRY_PHONE_DATA = [
  ["AF", "Afghanistan", "+93", 9, 9],
  ["AL", "Albania", "+355", 9, 9],
  ["DZ", "Algeria", "+213", 9, 9],
  ["AD", "Andorra", "+376", 6, 6],
  ["AO", "Angola", "+244", 9, 9],
  ["AG", "Antigua & Barbuda", "+1-268", 10, 10],
  ["AR", "Argentina", "+54", 10, 10],
  ["AM", "Armenia", "+374", 8, 8],
  ["AU", "Australia", "+61", 9, 9, "412345678"],
  ["AT", "Austria", "+43", 10, 13],
  ["AZ", "Azerbaijan", "+994", 9, 9],
  ["BS", "Bahamas", "+1-242", 10, 10],
  ["BH", "Bahrain", "+973", 8, 8],
  ["BD", "Bangladesh", "+880", 10, 10],
  ["BB", "Barbados", "+1-246", 10, 10],
  ["BY", "Belarus", "+375", 9, 9],
  ["BE", "Belgium", "+32", 9, 9],
  ["BZ", "Belize", "+501", 7, 7],
  ["BJ", "Benin", "+229", 8, 8],
  ["BT", "Bhutan", "+975", 8, 8],
  ["BO", "Bolivia", "+591", 8, 8],
  ["BA", "Bosnia & Herzegovina", "+387", 8, 8],
  ["BW", "Botswana", "+267", 8, 8],
  ["BR", "Brazil", "+55", 10, 11],
  ["BN", "Brunei", "+673", 7, 7],
  ["BG", "Bulgaria", "+359", 8, 9],
  ["BF", "Burkina Faso", "+226", 8, 8],
  ["BI", "Burundi", "+257", 8, 8],
  ["KH", "Cambodia", "+855", 8, 9],
  ["CM", "Cameroon", "+237", 8, 9],
  ["CA", "Canada", "+1", 10, 10, "4165550123", "CA"],
  ["CV", "Cape Verde", "+238", 7, 7],
  ["CF", "Central African Rep.", "+236", 8, 8],
  ["TD", "Chad", "+235", 8, 8],
  ["CL", "Chile", "+56", 9, 9],
  ["CN", "China", "+86", 11, 11],
  ["CO", "Colombia", "+57", 10, 10],
  ["KM", "Comoros", "+269", 7, 7],
  ["CG", "Congo", "+242", 9, 9],
  ["CD", "DR Congo", "+243", 9, 9],
  ["CR", "Costa Rica", "+506", 8, 8],
  ["CI", "Cote d'Ivoire", "+225", 8, 10],
  ["HR", "Croatia", "+385", 8, 9],
  ["CU", "Cuba", "+53", 8, 8],
  ["CY", "Cyprus", "+357", 8, 8],
  ["CZ", "Czechia", "+420", 9, 9],
  ["DK", "Denmark", "+45", 8, 8],
  ["DJ", "Djibouti", "+253", 8, 8],
  ["DM", "Dominica", "+1-767", 10, 10],
  ["DO", "Dominican Rep.", "+1-809", 10, 10],
  ["EC", "Ecuador", "+593", 9, 9],
  ["EG", "Egypt", "+20", 10, 10],
  ["SV", "El Salvador", "+503", 8, 8],
  ["GQ", "Equatorial Guinea", "+240", 9, 9],
  ["ER", "Eritrea", "+291", 7, 7],
  ["EE", "Estonia", "+372", 7, 8],
  ["SZ", "Eswatini", "+268", 8, 8],
  ["ET", "Ethiopia", "+251", 9, 9],
  ["FJ", "Fiji", "+679", 7, 7],
  ["FI", "Finland", "+358", 9, 10],
  ["FR", "France", "+33", 9, 9, "612345678"],
  ["GA", "Gabon", "+241", 7, 7],
  ["GM", "Gambia", "+220", 7, 7],
  ["GE", "Georgia", "+995", 9, 9],
  ["DE", "Germany", "+49", 10, 11, "1512345678"],
  ["GH", "Ghana", "+233", 9, 9],
  ["GR", "Greece", "+30", 10, 10],
  ["GD", "Grenada", "+1-473", 10, 10],
  ["GT", "Guatemala", "+502", 8, 8],
  ["GN", "Guinea", "+224", 8, 9],
  ["GW", "Guinea-Bissau", "+245", 7, 7],
  ["GY", "Guyana", "+592", 7, 7],
  ["HT", "Haiti", "+509", 8, 8],
  ["HN", "Honduras", "+504", 8, 8],
  ["HU", "Hungary", "+36", 9, 9],
  ["IS", "Iceland", "+354", 7, 7],
  ["IN", "India", "+91", 10, 10, "9876543210", "IN"],
  ["ID", "Indonesia", "+62", 9, 12],
  ["IR", "Iran", "+98", 10, 10],
  ["IQ", "Iraq", "+964", 10, 10],
  ["IE", "Ireland", "+353", 9, 9],
  ["IL", "Israel", "+972", 9, 9],
  ["IT", "Italy", "+39", 9, 10],
  ["JM", "Jamaica", "+1-876", 10, 10],
  ["JP", "Japan", "+81", 10, 10],
  ["JO", "Jordan", "+962", 9, 9],
  ["KZ", "Kazakhstan", "+7", 10, 10],
  ["KE", "Kenya", "+254", 9, 9],
  ["KI", "Kiribati", "+686", 8, 8],
  ["KP", "North Korea", "+850", 8, 10],
  ["KR", "South Korea", "+82", 9, 10],
  ["KW", "Kuwait", "+965", 8, 8],
  ["KG", "Kyrgyzstan", "+996", 9, 9],
  ["LA", "Laos", "+856", 8, 10],
  ["LV", "Latvia", "+371", 8, 8],
  ["LB", "Lebanon", "+961", 7, 8],
  ["LS", "Lesotho", "+266", 8, 8],
  ["LR", "Liberia", "+231", 7, 9],
  ["LY", "Libya", "+218", 9, 9],
  ["LI", "Liechtenstein", "+423", 7, 7],
  ["LT", "Lithuania", "+370", 8, 8],
  ["LU", "Luxembourg", "+352", 9, 11],
  ["MG", "Madagascar", "+261", 9, 9],
  ["MW", "Malawi", "+265", 9, 9],
  ["MY", "Malaysia", "+60", 9, 10, "123456789"],
  ["MV", "Maldives", "+960", 7, 7],
  ["ML", "Mali", "+223", 8, 8],
  ["MT", "Malta", "+356", 8, 8],
  ["MH", "Marshall Islands", "+692", 7, 7],
  ["MR", "Mauritania", "+222", 8, 8],
  ["MU", "Mauritius", "+230", 8, 8],
  ["MX", "Mexico", "+52", 10, 10],
  ["FM", "Micronesia", "+691", 7, 7],
  ["MD", "Moldova", "+373", 8, 8],
  ["MC", "Monaco", "+377", 8, 8],
  ["MN", "Mongolia", "+976", 8, 8],
  ["ME", "Montenegro", "+382", 8, 8],
  ["MA", "Morocco", "+212", 9, 9],
  ["MZ", "Mozambique", "+258", 9, 9],
  ["MM", "Myanmar", "+95", 8, 10],
  ["NA", "Namibia", "+264", 9, 10],
  ["NR", "Nauru", "+674", 7, 7],
  ["NP", "Nepal", "+977", 10, 10],
  ["NL", "Netherlands", "+31", 9, 9],
  ["NZ", "New Zealand", "+64", 8, 10],
  ["NI", "Nicaragua", "+505", 8, 8],
  ["NE", "Niger", "+227", 8, 8],
  ["NG", "Nigeria", "+234", 10, 10],
  ["MK", "North Macedonia", "+389", 8, 8],
  ["NO", "Norway", "+47", 8, 8],
  ["OM", "Oman", "+968", 8, 8],
  ["PK", "Pakistan", "+92", 10, 10],
  ["PW", "Palau", "+680", 7, 7],
  ["PS", "Palestine", "+970", 9, 9],
  ["PA", "Panama", "+507", 8, 8],
  ["PG", "Papua New Guinea", "+675", 8, 8],
  ["PY", "Paraguay", "+595", 9, 9],
  ["PE", "Peru", "+51", 9, 9],
  ["PH", "Philippines", "+63", 10, 10],
  ["PL", "Poland", "+48", 9, 9],
  ["PT", "Portugal", "+351", 9, 9],
  ["QA", "Qatar", "+974", 8, 8],
  ["RO", "Romania", "+40", 9, 9],
  ["RU", "Russia", "+7", 10, 10],
  ["RW", "Rwanda", "+250", 9, 9],
  ["KN", "Saint Kitts & Nevis", "+1-869", 10, 10],
  ["LC", "Saint Lucia", "+1-758", 10, 10],
  ["VC", "Saint Vincent", "+1-784", 10, 10],
  ["WS", "Samoa", "+685", 7, 7],
  ["SM", "San Marino", "+378", 8, 10],
  ["ST", "Sao Tome & Principe", "+239", 7, 7],
  ["SA", "Saudi Arabia", "+966", 9, 9, "512345678", "KSA"],
  ["SN", "Senegal", "+221", 9, 9],
  ["RS", "Serbia", "+381", 8, 9],
  ["SC", "Seychelles", "+248", 7, 7],
  ["SL", "Sierra Leone", "+232", 8, 8],
  ["SG", "Singapore", "+65", 8, 8, "81234567"],
  ["SK", "Slovakia", "+421", 9, 9],
  ["SI", "Slovenia", "+386", 8, 8],
  ["SB", "Solomon Islands", "+677", 7, 7],
  ["SO", "Somalia", "+252", 8, 8],
  ["ZA", "South Africa", "+27", 9, 9, "821234567"],
  ["SS", "South Sudan", "+211", 9, 9],
  ["ES", "Spain", "+34", 9, 9],
  ["LK", "Sri Lanka", "+94", 9, 9],
  ["SD", "Sudan", "+249", 9, 9],
  ["SR", "Suriname", "+597", 7, 7],
  ["SE", "Sweden", "+46", 9, 10],
  ["CH", "Switzerland", "+41", 9, 9],
  ["SY", "Syria", "+963", 9, 9],
  ["TW", "Taiwan", "+886", 9, 9],
  ["TJ", "Tajikistan", "+992", 9, 9],
  ["TZ", "Tanzania", "+255", 9, 9],
  ["TH", "Thailand", "+66", 9, 9],
  ["TL", "Timor-Leste", "+670", 8, 8],
  ["TG", "Togo", "+228", 8, 8],
  ["TO", "Tonga", "+676", 5, 7],
  ["TT", "Trinidad & Tobago", "+1-868", 10, 10],
  ["TN", "Tunisia", "+216", 8, 8],
  ["TR", "Turkey", "+90", 10, 10],
  ["TM", "Turkmenistan", "+993", 8, 8],
  ["TV", "Tuvalu", "+688", 5, 6],
  ["UG", "Uganda", "+256", 9, 9],
  ["UA", "Ukraine", "+380", 9, 9],
  ["AE", "UAE", "+971", 9, 9, "501234567", "UAE"],
  ["GB", "United Kingdom", "+44", 10, 10, "7400123456", "UK"],
  ["US", "United States", "+1", 10, 10, "2015550123", "US"],
  ["UY", "Uruguay", "+598", 8, 8],
  ["UZ", "Uzbekistan", "+998", 9, 9],
  ["VU", "Vanuatu", "+678", 7, 7],
  ["VA", "Vatican City", "+379", 6, 10],
  ["VE", "Venezuela", "+58", 10, 10],
  ["VN", "Vietnam", "+84", 9, 10],
  ["YE", "Yemen", "+967", 8, 9],
  ["ZM", "Zambia", "+260", 9, 9],
  ["ZW", "Zimbabwe", "+263", 9, 9],
];

export const PHONE_COUNTRIES = COUNTRY_PHONE_DATA.map(
  ([code, label, dialCode, minLength, maxLength, example = "", shortLabel = code]) => ({
    code,
    label,
    shortLabel,
    flag: toFlagEmoji(code),
    dialCode,
    minLength,
    maxLength,
    localLength: maxLength,
    example: example || `${"0".repeat(Math.min(minLength, 10))}`,
  }),
);

const DEFAULT_COUNTRY_CODE = "IN";

export const getPhoneCountry = (countryCode = DEFAULT_COUNTRY_CODE) =>
  PHONE_COUNTRIES.find((country) => country.code === countryCode) ||
  PHONE_COUNTRIES[0];

export const sanitizePhoneInput = (
  value,
  countryCode = DEFAULT_COUNTRY_CODE,
) => {
  const country = getPhoneCountry(countryCode);
  return (value || "").replace(/\D/g, "").slice(0, country.maxLength);
};

export const validatePhoneNumber = (
  localNumber,
  countryCode = DEFAULT_COUNTRY_CODE,
) => {
  const country = getPhoneCountry(countryCode);
  const digits = sanitizePhoneInput(localNumber, country.code);

  if (!digits) {
    return "Phone number is required";
  }

  if (/^0+$/.test(digits)) {
    return "Enter a valid phone number";
  }

  if (digits.length < country.minLength || digits.length > country.maxLength) {
    return `Enter a valid ${country.label} phone number`;
  }

  if (country.code === "IN" && !/^[6-9]\d{9}$/.test(digits)) {
    return "Enter a valid India phone number";
  }

  return "";
};

export const formatPhoneForStorage = (
  localNumber,
  countryCode = DEFAULT_COUNTRY_CODE,
) => {
  const country = getPhoneCountry(countryCode);
  const digits = sanitizePhoneInput(localNumber, country.code);
  return digits ? `${country.dialCode}${digits}` : "";
};

export const parseStoredPhoneNumber = (value) => {
  const raw = (value || "").trim();

  if (!raw) {
    return {
      countryCode: DEFAULT_COUNTRY_CODE,
      localNumber: "",
    };
  }

  const normalized = raw.replace(/[^\d+]/g, "");

  if (normalized.startsWith("+")) {
    const match = [...PHONE_COUNTRIES]
      .sort((a, b) => b.dialCode.length - a.dialCode.length)
      .find((country) => normalized.startsWith(country.dialCode));

    if (match) {
      return {
        countryCode: match.code,
        localNumber: normalized
          .slice(match.dialCode.length)
          .replace(/\D/g, "")
          .slice(0, match.maxLength),
      };
    }
  }

  return {
    countryCode: DEFAULT_COUNTRY_CODE,
    localNumber: normalized.replace(/\D/g, ""),
  };
};
