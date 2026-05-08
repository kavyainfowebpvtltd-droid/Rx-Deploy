import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Save,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import Swal from "sweetalert2";
import { Navbar } from "../../components/Navbar.jsx";
import { Footer } from "../../components/Footer.jsx";
import { PhoneCountryPicker } from "../../components/PhoneCountryPicker.jsx";
import { CountryPicker } from "../../components/CountryPicker.jsx";
import { authAPI, userAPI } from "@/services/api.js";
import {
  formatPhoneForStorage,
  PHONE_COUNTRIES,
  getPhoneCountry,
  parseStoredPhoneNumber,
  sanitizePhoneInput,
  validatePhoneNumber,
} from "@/app/utils/phoneValidation.js";

const NAME_PATTERN = /^[a-zA-Z]+(?:[a-zA-Z\s.'-]*[a-zA-Z])?$/;
const ADDRESS_PATTERN = /^[a-zA-Z0-9\s,./#-]+$/;

const sanitizeByPattern = (value, pattern) =>
  [...(value || "")]
    .filter((char) => pattern.test(char))
    .join("");

export default function UserProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneCountry: "IN",
    phone: "",
    countryCode: "",
    address: "",
    age: "",
    gender: "",
    height: "",
    weight: "",
    createdAt: "",
  });
  const [errors, setErrors] = useState({
    fullName: "",
    phone: "",
    countryCode: "",
    address: "",
    age: "",
    gender: "",
    height: "",
    weight: "",
  });
  const phoneCountry = getPhoneCountry(formData.phoneCountry);

  // Get user info from backend API on mount
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        // Fetch current user from backend API
        const response = await authAPI.getCurrentUser();
        // Handle both axios response (response.data) and direct data
        const userData = response.data || response;
        
        if (userData) {
          const parsedPhone = parseStoredPhoneNumber(userData.phone || "");
          setFormData({
            fullName: userData.fullName || userData.name || "",
            email: userData.email || "",
            phoneCountry: parsedPhone.countryCode,
            phone: parsedPhone.localNumber,
            countryCode:
              PHONE_COUNTRIES.find((country) => country.label === userData.country)?.code || "",
            address: userData.address || "",
            age: userData.age || "",
            gender: userData.gender || "",
            height: userData.height || "",
            weight: userData.weight || "",
            createdAt: userData.createdAt || "",
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to load user data. Please login again.",
          confirmButtonColor: "#2563EB",
          confirmButtonText: "OK",
        }).then(() => {
          navigate("/login");
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Validation functions
  const validateFullName = (name) => {
    const trimmedName = name?.trim() || "";
    if (!trimmedName) {
      return "Full name is required";
    }
    if (trimmedName.length < 2 || trimmedName.length > 80) {
      return "Full name must be between 2 and 80 characters";
    }
    if (!NAME_PATTERN.test(trimmedName)) {
      return "Use letters, spaces, apostrophes, hyphens, and periods only";
    }
    return "";
  };

  const validatePhone = (phone) => {
    return validatePhoneNumber(phone, formData.phoneCountry);
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

  const validateAge = (age) => {
    if (!age || age === "") {
      return "Age is required";
    }
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum)) {
      return "Enter a valid age";
    }
    if (ageNum < 1 || ageNum > 120) {
      return "Age must be between 1 and 120";
    }
    return "";
  };

  const validateAddress = (address) => {
    const trimmedAddress = address?.trim() || "";
    if (!trimmedAddress) {
      return "Address is required";
    }
    if (trimmedAddress.length < 5 || trimmedAddress.length > 200) {
      return "Address must be between 5 and 200 characters";
    }
    if (!ADDRESS_PATTERN.test(trimmedAddress)) {
      return "Address can use letters, numbers, spaces, comma, period, slash, hyphen, and # only";
    }
    if (!/[a-zA-Z0-9]/.test(trimmedAddress)) {
      return "Enter a valid address";
    }
    return "";
  };

  const validateGender = (gender) => {
    if (!gender) {
      return "Gender is required";
    }
    if (!["MALE", "FEMALE", "OTHER"].includes(gender)) {
      return "Select a valid gender";
    }
    return "";
  };

  const validateHeight = (height) => {
    if (!height || height === "") {
      return "";
    }
    const heightNum = parseInt(height, 10);
    if (isNaN(heightNum)) {
      return "Enter a valid height";
    }
    if (heightNum < 30 || heightNum > 272) {
      return "Height must be between 30 and 272 cm";
    }
    return "";
  };

  const validateWeight = (weight) => {
    if (!weight || weight === "") {
      return "";
    }
    const weightNum = parseInt(weight, 10);
    if (isNaN(weightNum)) {
      return "Enter a valid weight";
    }
    if (weightNum < 2 || weightNum > 500) {
      return "Weight must be between 2 and 500 kg";
    }
    return "";
  };

  const getFieldError = (name, value, nextFormData = formData) => {
    switch (name) {
      case "fullName":
        return validateFullName(value);
      case "phone":
        return validatePhoneNumber(value, nextFormData.phoneCountry);
      case "address":
        return validateAddress(value);
      case "countryCode":
        return validateCountry(value);
      case "age":
        return validateAge(value);
      case "gender":
        return validateGender(value);
      case "height":
        return validateHeight(value);
      case "weight":
        return validateWeight(value);
      default:
        return "";
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;

    if (name === "fullName") {
      nextValue = sanitizeByPattern(value, /[a-zA-Z\s.'-]/).replace(/\s{2,}/g, " ");
    }

    if (name === "phone") {
      nextValue = sanitizePhoneInput(value, formData.phoneCountry);
      const nextFormData = { ...formData, phone: nextValue };
      setErrors((prev) => ({
        ...prev,
        phone: getFieldError("phone", nextValue, nextFormData),
      }));
      setFormData(nextFormData);
      return;
    }

    if (name === "phoneCountry") {
      const numericValue = sanitizePhoneInput(formData.phone, value);
      const error = numericValue ? validatePhoneNumber(numericValue, value) : "";
      setErrors((prev) => ({ ...prev, phone: error }));
      setFormData({ ...formData, phoneCountry: value, phone: numericValue });
      return;
    }

    if (name === "address") {
      nextValue = sanitizeByPattern(value, /[a-zA-Z0-9\s,./#-]/).replace(/\s{2,}/g, " ");
    }

    if (name === "countryCode") {
      const nextFormData = {
        ...formData,
        countryCode: value,
      };

      setFormData(nextFormData);
      setErrors((prev) => ({
        ...prev,
        countryCode: getFieldError("countryCode", value, nextFormData),
      }));
      return;
    }

    if (["age", "height", "weight"].includes(name)) {
      nextValue = value.replace(/\D/g, "").slice(0, 3);
    }

    const nextFormData = {
      ...formData,
      [name]: nextValue,
    };

    setFormData(nextFormData);
    setErrors((prev) => ({
      ...prev,
      [name]: getFieldError(name, nextValue, nextFormData),
    }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setErrors((prev) => ({
      ...prev,
      [name]: getFieldError(name, value, formData),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = {
      fullName: validateFullName(formData.fullName),
      phone: validatePhone(formData.phone),
      countryCode: validateCountry(formData.countryCode),
      address: validateAddress(formData.address),
      age: validateAge(formData.age),
      gender: validateGender(formData.gender),
      height: validateHeight(formData.height),
      weight: validateWeight(formData.weight),
    };

    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      Swal.fire({
        icon: "warning",
        title: "Please Check The Form",
        text: "Fix the highlighted fields before saving your profile.",
        confirmButtonColor: "#2563EB",
      });
      return;
    }

    setSaving(true);

    try {
      // Get current user from backend API
      const userResponse = await authAPI.getCurrentUser();
      // Handle both axios response (response.data) and direct data
      const currentUser = userResponse.data || userResponse;
      
      if (!currentUser || !currentUser.id) {
        throw new Error("User not found. Please login again.");
      }

      const userId = currentUser.id;
      const selectedCountry =
        PHONE_COUNTRIES.find((country) => country.code === formData.countryCode) || null;

      // Prepare update data
      const updateData = {
        fullName: formData.fullName,
        phone: formatPhoneForStorage(formData.phone, formData.phoneCountry),
        country: selectedCountry?.label || null,
        address: formData.address,
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender,
        height: formData.height,
        weight: formData.weight,
      };

      // Update user via API
      await userAPI.update(userId, updateData);

      // Data is stored in backend - no local storage update needed

      Swal.fire({
        icon: "success",
        title: "Profile Updated!",
        text: "Your profile has been updated successfully.",
        confirmButtonColor: "#2563EB",
        confirmButtonText: "OK",
      }).then((result) => {
        if (result.isConfirmed) {
          navigate("/user/services");
        }
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text:
          error.message ||
          "An error occurred while updating your profile. Please try again.",
        confirmButtonColor: "#2563EB",
        confirmButtonText: "OK",
      });
    }

    setSaving(false);
  };

  return (
    <>
      <Navbar role="user" />

      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-[#F1F5F9]">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          <div className="bg-white rounded-3xl shadow-2xl p-5 sm:p-8 md:p-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate("/user/status")}
                  className="p-2 rounded-lg bg-[#E0E7FF] text-[#1E3A8A] hover:bg-[#C7D2FE] transition-all duration-200"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-2xl text-[#1E3A8A] font-bold">
                    My Profile
                  </h2>
                  <p className="text-gray-600 mt-1">
                    View and update your personal information
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information Section */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-[#1E3A8A] mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div>
                    <label className="block text-gray-700 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter your full name"
                        maxLength={80}
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-200 ${errors.fullName ? "border-red-500" : "border-gray-300"}`}
                        required
                      />
                    </div>
                    {errors.fullName && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.fullName}
                      </p>
                    )}
                  </div>

                  {/* Email (read-only) */}
                  <div>
                    <label className="block text-gray-700 mb-2">
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
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed"
                        readOnly
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Email cannot be changed
                    </p>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <div className="flex gap-3">
                      <PhoneCountryPicker
                        value={formData.phoneCountry}
                        onChange={(countryCode) =>
                          handleChange({
                            target: { name: "phoneCountry", value: countryCode },
                          })
                        }
                      />
                      <div className="relative flex-1">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder={phoneCountry.example}
                          inputMode="numeric"
                          maxLength={phoneCountry.maxLength}
                          className={`w-full min-w-0 pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-200 ${errors.phone ? "border-red-500" : "border-gray-300"}`}
                          required
                        />
                      </div>
                    </div>
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-gray-700 mb-2">Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter your address"
                        maxLength={200}
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-200 ${errors.address ? "border-red-500" : "border-gray-300"}`}
                        required
                      />
                    </div>
                    {errors.address && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.address}
                      </p>
                    )}
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-gray-700 mb-2">Country</label>
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



                  {/* Age */}
                  <div>
                    <label className="block text-gray-700 mb-2">Age</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="age"
                        value={formData.age}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter your age"
                        inputMode="numeric"
                        maxLength={3}
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-200 ${errors.age ? "border-red-500" : "border-gray-300"}`}
                      />
                    </div>
                    {errors.age && (
                      <p className="mt-1 text-sm text-red-500">{errors.age}</p>
                    )}
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-gray-700 mb-2">Gender</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-200 ${errors.gender ? "border-red-500" : "border-gray-300"}`}
                    >
                      <option value="">Select Gender</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                    {errors.gender && (
                      <p className="mt-1 text-sm text-red-500">{errors.gender}</p>
                    )}
                  </div>

                  {/* Height */}
                  <div>
                    <label className="block text-gray-700 mb-2">Height (cm)</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="height"
                        value={formData.height}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter your height in cm"
                        inputMode="numeric"
                        maxLength={3}
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-200 ${errors.height ? "border-red-500" : "border-gray-300"}`}
                      />
                    </div>
                    {errors.height && (
                      <p className="mt-1 text-sm text-red-500">{errors.height}</p>
                    )}
                  </div>

                  {/* Weight */}
                  <div>
                    <label className="block text-gray-700 mb-2">Weight (kg)</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="weight"
                        value={formData.weight}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter your weight in kg"
                        inputMode="numeric"
                        maxLength={3}
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-200 ${errors.weight ? "border-red-500" : "border-gray-300"}`}
                      />
                    </div>
                    {errors.weight && (
                      <p className="mt-1 text-sm text-red-500">{errors.weight}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Account Information Section */}
              <div className="pb-6">
                <h3 className="text-lg font-semibold text-[#1E3A8A] mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Account Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-700 mb-2">
                      Account Type
                    </label>
                    <div className="px-4 py-3 bg-gray-100 rounded-xl text-gray-600">
                      Patient
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">
                      Member Since
                    </label>
                    <div className="px-4 py-3 bg-gray-100 rounded-xl text-gray-600">
                      {formData.createdAt
                        ? new Date(
                            formData.createdAt,
                          ).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })
                        : "N/A"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              {/* <div className="pb-6">
                <h3 className="text-lg font-semibold text-[#1E3A8A] mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Quick Actions
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => navigate("/user/services")}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white rounded-xl hover:shadow-lg transition-all duration-200"
                  >
                    <User className="w-5 h-5" />
                    Browse Services
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/user/status")}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#059669] to-[#10B981] text-white rounded-xl hover:shadow-lg transition-all duration-200"
                  >
                    <MapPin className="w-5 h-5" />
                    View My Orders
                  </button>
                </div>
              </div> */}

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Changes
                    </>
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => navigate("/user/status")}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200"
                >
                  Cancel
                </motion.button>
              </div>
            </form>
          </div>
        </motion.div>
      </main>

      <Footer />
    </>
  );
}
