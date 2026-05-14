import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
} from "lucide-react";
import Swal from "sweetalert2";
import { Navbar } from "../components/Navbar.jsx";
import { Footer } from "../components/Footer.jsx";
import { CustomSelect } from "../components/CustomSelect.jsx";
import { CountryPicker } from "../components/CountryPicker.jsx";
import logo from "@/assets/logo.jpeg";
import { userAPI } from "@/services/api.js";
import { GENDER_OPTIONS } from "@/app/constants/selectOptions.js";
import {
  validateEmail,
  validatePassword,
} from "@/app/utils/authValidation.js";
import { PHONE_COUNTRIES } from "@/app/utils/phoneValidation.js";

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    countryCode: "",
    gender: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({
    fullName: "",
    email: "",
    password: "",
    countryCode: "",
    gender: "",
    confirmPassword: "",
  });
  const navigate = useNavigate();

  const extractBackendMessage = (error) => {
    const data = error?.response?.data;
    if (!data) return error?.message || "An error occurred during registration. Please try again.";

    if (typeof data === "string") return data;
    if (typeof data?.message === "string") return data.message;
    if (typeof data?.error === "string") return data.error;
    if (typeof data?.details === "string") return data.details;

    if (Array.isArray(data?.errors) && data.errors.length > 0) {
      const firstError = data.errors[0];
      if (typeof firstError === "string") return firstError;
      if (typeof firstError?.message === "string") return firstError.message;
      if (typeof firstError?.defaultMessage === "string") return firstError.defaultMessage;
    }

    return "An error occurred during registration. Please try again.";
  };

  const validateFullName = (name) => {
    const trimmedName = name ? name.trim() : "";
    if (!trimmedName || trimmedName.length === 0) {
      return "Enter valid name";
    }
    if (trimmedName.length < 2) {
      return "Name must be at least 2 characters";
    }
    const regex = /^[A-Za-z ]+$/;
    if (!regex.test(trimmedName)) {
      return "Enter valid name";
    }
    return "";
  };

  const validateCountry = (countryCode) => {
    if (!countryCode) {
      return "Country is required";
    }

    const countryExists = PHONE_COUNTRIES.some(
      (country) => country.code === countryCode,
    );

    return countryExists ? "" : "Select a valid country";
  };

  const validateGender = (gender) => {
    if (!gender || gender === "") {
      return "Gender is required";
    }
    return "";
  };

  const selectedCountry =
    PHONE_COUNTRIES.find((country) => country.code === formData.countryCode) ||
    null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all fields
    const nameError = validateFullName(formData.fullName);
    const emailError = validateEmail(formData.email);
    const countryError = validateCountry(formData.countryCode);
    const genderError = validateGender(formData.gender);
    const passwordError = validatePassword(formData.password);

    // Check confirm password
    let confirmPasswordError = "";
    if (!formData.confirmPassword || formData.confirmPassword.length === 0) {
      confirmPasswordError = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      confirmPasswordError = "Passwords do not match";
    }

    // Set all errors
    setErrors({
      fullName: nameError,
      email: emailError,
      countryCode: countryError,
      gender: genderError,
      password: passwordError,
      confirmPassword: confirmPasswordError,
    });

    // If any validation error exists, return
    if (
      nameError ||
      emailError ||
      countryError ||
      genderError ||
      passwordError ||
      confirmPasswordError
    ) {
      return;
    }

    setLoading(true);

    try {
      // Register user via API
      const response = await userAPI.register({
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        country: selectedCountry?.label || null,
        gender: formData.gender || null,
        password: formData.password,
        role: "USER",
      }, { suppressErrorAlert: true });

      Swal.fire({
        icon: "success",
        title: "Account created successfully",
        text: "Your account has been created. Please verify your email with OTP.",
        confirmButtonColor: "#2563EB",
        confirmButtonText: "Continue",
      }).then((result) => {
        if (result.isConfirmed) {
          navigate(
            "/verify-otp?email=" +
              encodeURIComponent(formData.email) +
              "&type=register",
          );
        }
      });
    } catch (error) {
      console.error("Registration error:", error);
      const backendMessage = extractBackendMessage(error);

      // Handle duplicate email error
      const lowerMessage = backendMessage.toLowerCase();
      const isDuplicateEmailError =
        error.response?.status === 409 ||
        (lowerMessage.includes("email") &&
          (lowerMessage.includes("already") || lowerMessage.includes("exist")));

      if (
        isDuplicateEmailError
      ) {
        setErrors({
          ...errors,
          email: backendMessage,
        });
      }

      Swal.fire({
        icon: "error",
        title: "Registration Failed",
        text: backendMessage,
        confirmButtonColor: "#2563EB",
        confirmButtonText: "OK",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Validate full name on change
    if (name === "fullName") {
      const error = validateFullName(value);
      setErrors({ ...errors, fullName: error });
    }

    // Validate email on change
    if (name === "email") {
      const error = validateEmail(value);
      setErrors({ ...errors, email: error });
    }

    if (name === "countryCode") {
      const error = validateCountry(value);
      setErrors({ ...errors, countryCode: error });
    }

    // Validate gender on change
    if (name === "gender") {
      const error = validateGender(value);
      setErrors({ ...errors, gender: error });
    }

    // Validate password on change
    if (name === "password") {
      const error = value.length > 0 ? validatePassword(value) : "";
      setErrors({ ...errors, password: error });
    }

    // Validate confirm password on change
    if (name === "confirmPassword") {
      let error = "";
      if (value.length > 0 && formData.password !== value) {
        error = "Passwords do not match";
      }
      setErrors({ ...errors, confirmPassword: error });
    }

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  return (
    <>
      <Navbar />

      <main className="flex-1 flex items-start justify-center py-4 sm:py-6 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#F8FAFC] to-[#EAF1F8]">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-2xl"
        >
          <div className="bg-white rounded-2xl border border-white/80 shadow-[0_22px_55px_rgba(15,23,42,0.12)] p-5 sm:p-6 md:p-7">
            {/* Logo */}
            <div className="text-center mb-5">
              <img
                src={logo}
                alt="RxIncredible"
                className="h-12 sm:h-14 w-auto mx-auto mb-3 drop-shadow-sm"
              />
              <h2 className="text-2xl sm:text-3xl font-semibold text-[#1E3A8A]">Create Account</h2>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Join RxIncredible today</p>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^[A-Za-z\s]*$/.test(value)) {
                        handleChange(e);
                      }
                    }}
                    placeholder="Enter your full name"
                    className={`w-full pl-12 pr-4 py-2.5 border rounded-xl bg-slate-50/70 text-gray-900 placeholder:text-gray-400 shadow-sm outline-none hover:border-[#93C5FD] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB] transition-all duration-200 ${errors.fullName ? "border-red-500" : "border-gray-300"}`}
                    required
                  />
                </div>
                {errors.fullName && (
                  <p className="mt-1 text-sm text-red-500">{errors.fullName}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    autoComplete="email"
                    inputMode="email"
                    className={`w-full pl-12 pr-4 py-2.5 border rounded-xl bg-slate-50/70 text-gray-900 placeholder:text-gray-400 shadow-sm outline-none hover:border-[#93C5FD] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB] transition-all duration-200 ${errors.email ? "border-red-500" : "border-gray-300"}`}
                    required
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                )}
                {!errors.email && (
                  <p className="mt-1 text-xs text-gray-500">
                    Use a valid email like `name@gmail.com` or `name@company.in`.
                  </p>
                )}
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
                <CountryPicker
                  value={formData.countryCode}
                  onChange={(countryCode) =>
                    handleChange({
                      target: { name: "countryCode", value: countryCode },
                    })
                  }
                />
                {errors.countryCode && (
                  <p className="mt-1 text-sm text-red-500">{errors.countryCode}</p>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender</label>
                <CustomSelect
                  value={formData.gender}
                  onChange={(value) =>
                    handleChange({ target: { name: "gender", value } })
                  }
                  options={GENDER_OPTIONS}
                  placeholder="Select gender"
                  buttonClassName={`px-4 py-3 ${errors.gender ? "!border-red-500" : ""}`}
                />
                {errors.gender && (
                  <p className="mt-1 text-sm text-red-500">{errors.gender}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a password"
                    autoComplete="new-password"
                    maxLength={64}
                    className={`w-full pl-12 pr-12 py-2.5 border rounded-xl bg-slate-50/70 text-gray-900 placeholder:text-gray-400 shadow-sm outline-none hover:border-[#93C5FD] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB] transition-all duration-200 ${errors.password ? "border-red-500" : "border-gray-300"}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <Eye className="w-5 h-5" />
                    ) : (
                      <EyeOff className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-500">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    maxLength={64}
                    className={`w-full pl-12 pr-12 py-2.5 border rounded-xl bg-slate-50/70 text-gray-900 placeholder:text-gray-400 shadow-sm outline-none hover:border-[#93C5FD] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB] transition-all duration-200 ${errors.confirmPassword ? "border-red-500" : "border-gray-300"}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <Eye className="w-5 h-5" />
                    ) : (
                      <EyeOff className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Terms */}
              <div className="flex items-start sm:col-span-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-1 text-[#2563EB] rounded border-gray-300 focus:ring-[#2563EB]/30"
                  required
                />
                <span className="ml-2 text-sm text-gray-600">
                  I agree to the{" "}
                  <Link
                    to="/terms-of-service?from=/register"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#2563EB] hover:text-[#1E3A8A]"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    to="/privacy-policy?from=/register"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#2563EB] hover:text-[#1E3A8A]"
                  >
                    Privacy Policy
                  </Link>
                </span>
              </div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full sm:col-span-2 py-2.5 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white font-medium rounded-xl shadow-md shadow-blue-900/20 hover:shadow-lg hover:shadow-blue-900/25 transition-all duration-200 disabled:opacity-50"
              >
                {loading ? "Creating Account..." : "Create Account"}
              </motion.button>
            </form>

            {/* Login Link */}
            <p className="text-center mt-4 text-sm text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-[#2563EB] hover:text-[#1E3A8A]">
                Login
              </Link>
            </p>
          </div>
        </motion.div>
      </main>

      <Footer />
    </>
  );
}
