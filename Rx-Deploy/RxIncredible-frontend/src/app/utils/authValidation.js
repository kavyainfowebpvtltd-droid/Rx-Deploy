export const EMAIL_PATTERN =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;

export const PASSWORD_SPECIAL_CHARACTER_PATTERN =
  /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

export const validateEmail = (value) => {
  const email = value?.trim() || "";

  if (!email) {
    return "Email address is required";
  }

  if (/\s/.test(email)) {
    return "Email address cannot contain spaces";
  }

  const atCount = (email.match(/@/g) || []).length;
  if (atCount !== 1) {
    return "Enter a valid email address";
  }

  if (!EMAIL_PATTERN.test(email)) {
    return "Enter a valid email address";
  }

  return "";
};

export const getPasswordRequirements = (password) => [
  { key: "length", label: "At least 8 characters", met: password.length >= 8 },
  {
    key: "uppercase",
    label: "Contains uppercase letter",
    met: /[A-Z]/.test(password),
  },
  {
    key: "lowercase",
    label: "Contains lowercase letter",
    met: /[a-z]/.test(password),
  },
  {
    key: "number",
    label: "Contains number",
    met: /[0-9]/.test(password),
  },
  {
    key: "special",
    label: "Contains special character",
    met: PASSWORD_SPECIAL_CHARACTER_PATTERN.test(password),
  },
  {
    key: "spaces",
    label: "Does not contain spaces",
    met: !/\s/.test(password),
  },
];

export const validatePassword = (value) => {
  const password = value || "";

  if (!password) {
    return "Password is required";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters";
  }

  if (password.length > 64) {
    return "Password must be at most 64 characters";
  }

  if (/\s/.test(password)) {
    return "Password cannot contain spaces";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter";
  }

  if (!/[a-z]/.test(password)) {
    return "Password must include at least one lowercase letter";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number";
  }

  if (!PASSWORD_SPECIAL_CHARACTER_PATTERN.test(password)) {
    return "Password must include at least one special character";
  }

  return "";
};
