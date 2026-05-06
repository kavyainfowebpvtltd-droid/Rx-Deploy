import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router";
import { motion } from "motion/react";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  User,
  Save,
  Loader2,
} from "lucide-react";
import { Navbar } from "../../components/Navbar.jsx";
import { Footer } from "../../components/Footer.jsx";
import { PhoneCountryPicker } from "../../components/PhoneCountryPicker.jsx";
import Swal from "sweetalert2";
import { orderAPI, userAPI, authAPI } from "@/services/api.js";
import {
  formatPhoneForStorage,
  getPhoneCountry,
  parseStoredPhoneNumber,
  sanitizePhoneInput,
  validatePhoneNumber,
} from "@/app/utils/phoneValidation.js";

export default function ShippingPage() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState(null);

  // Form fields
  const [formData, setFormData] = useState({
    fullName: "",
    phoneCountry: "IN",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
  });

  // Error states
  const [errors, setErrors] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });
  const phoneCountry = getPhoneCountry(formData.phoneCountry);

  // Clean orderId from URL
  const cleanOrderId = orderId ? orderId.replace(/[^0-9]/g, "") : null;

  // Check if user is logged in and fetch user data from backend
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Fetch current user from backend API (no localStorage)
        const user = await authAPI.getCurrentUser();
        if (!user) {
          // Save redirect URL and go to login
          sessionStorage.setItem(
            "redirectAfterLogin",
            "/user/shipping/" + cleanOrderId,
          );
          navigate("/login");
          return;
        }
        
        // Fetch order details
        fetchOrder();
      } catch (error) {
        console.error("Error checking auth:", error);
        // Save redirect URL and go to login
        sessionStorage.setItem(
          "redirectAfterLogin",
          "/user/shipping/" + cleanOrderId,
        );
        navigate("/login");
      }
    };
    
    checkAuth();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await orderAPI.getById(cleanOrderId);
      const orderData = response.data || response;
      setOrder(orderData);

      // Pre-fill form with user profile data from backend API
      try {
        const user = await authAPI.getCurrentUser();
        if (user) {
          const parsedPhone = parseStoredPhoneNumber(user.phone || "");
          setFormData((prev) => ({
            ...prev,
            fullName: user.fullName || "",
            phoneCountry: parsedPhone.countryCode,
            phone: parsedPhone.localNumber,
            email: user.email || "",
            address: user.address || "",
            city: user.city || "",
            state: user.state || "",
            pincode: user.pincode || "",
          }));
        }
      } catch (userError) {
        console.error("Error fetching user data:", userError);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching order:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load order details",
        confirmButtonColor: "#2563EB",
      }).then(() => {
        navigate("/user/orders");
      });
    }
  };

  // Validation functions
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

  const validatePhone = (phone) => {
    return validatePhoneNumber(phone, formData.phoneCountry);
  };

  const validateEmail = (email) => {
    const trimmedEmail = email ? email.trim() : "";
    if (!trimmedEmail || trimmedEmail.length === 0) {
      return "Email is required";
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      return "Invalid email format";
    }
    return "";
  };

  const validateAddress = (address) => {
    const trimmedAddress = address ? address.trim() : "";
    if (!trimmedAddress || trimmedAddress.length === 0) {
      return "Address is required";
    }
    if (trimmedAddress.length < 2) {
      return "Invalid address";
    }
    const hasAlphanumeric = /[a-zA-Z0-9]/.test(trimmedAddress);
    if (!hasAlphanumeric) {
      return "Invalid address";
    }
    return "";
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Validate phone - only allow numbers
    if (name === "phone") {
      const numericValue = sanitizePhoneInput(value, formData.phoneCountry);
      const error = validatePhoneNumber(numericValue, formData.phoneCountry);
      setErrors({ ...errors, [name]: error });
      setFormData((prev) => ({ ...prev, [name]: numericValue }));
      return;
    }

    if (name === "phoneCountry") {
      const numericValue = sanitizePhoneInput(formData.phone, value);
      const error = numericValue ? validatePhoneNumber(numericValue, value) : "";
      setErrors({ ...errors, phone: error });
      setFormData((prev) => ({
        ...prev,
        phoneCountry: value,
        phone: numericValue,
      }));
      return;
    }

    // Validate full name - only allow alphabets and spaces
    if (name === "fullName") {
      const alphaValue = value.replace(/[^a-zA-Z ]/g, "");
      let error = "";
      if (alphaValue.length > 0 && alphaValue.length < 2) {
        error = "Name must be at least 2 characters";
      }
      setErrors({ ...errors, [name]: error });
      setFormData((prev) => ({ ...prev, [name]: alphaValue }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all required fields
    const nameError = validateFullName(formData.fullName);
    const phoneError = validatePhone(formData.phone);
    const emailError = validateEmail(formData.email);
    const addressError = validateAddress(formData.address);

    setErrors({
      fullName: nameError,
      phone: phoneError,
      email: emailError,
      address: addressError,
      city: "",
      state: "",
      pincode: "",
    });

    if (nameError || phoneError || emailError || addressError) {
      return;
    }

    setSaving(true);

    try {
      // Get current user from backend API
      const currentUser = await authAPI.getCurrentUser();
      
      if (currentUser) {
        // Update user profile with address (data saved only to backend)
        await userAPI.update(currentUser.id, {
          fullName: formData.fullName,
          phone: formatPhoneForStorage(formData.phone, formData.phoneCountry),
          email: formData.email,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          country: formData.country,
        });
      }

      // Store shipping info in session for payment page
      sessionStorage.setItem(
        "shippingInfo",
        JSON.stringify({
          ...formData,
          orderId: cleanOrderId,
        }),
      );

      // Redirect to payment page with order
      navigate("/user/pay/" + cleanOrderId, {
        state: {
          shippingInfo: formData,
        },
      });
    } catch (error) {
      console.error("Error saving address:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to save address. Please try again.",
        confirmButtonColor: "#2563EB",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate("/user/orders");
  };

  if (loading) {
    return (
      <>
        <Navbar role="user" />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar role="user" />

      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={handleBack}
            className="flex items-center gap-2 text-[#2563EB] hover:text-[#1E3A8A] mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Orders</span>
          </motion.button>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-[#2563EB]" />
            </div>
            <h1 className="text-3xl text-[#1E3A8A] mb-2">Shipping Address</h1>
            <p className="text-gray-600">Please enter your delivery address</p>
          </motion.div>

          {/* Order Info */}
          {order && (
            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-600">
                <strong>Order:</strong> #{order.orderNumber}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Amount:</strong> ₹
                {order.totalAmount?.toLocaleString() || 0}
              </p>
            </div>
          )}

          {/* Shipping Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white rounded-3xl shadow-xl p-5 sm:p-8"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name */}
              <div>
                <label className="block text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent ${errors.fullName ? "border-red-500" : "border-gray-300"}`}
                  placeholder="Enter your full name"
                />
                {errors.fullName && (
                  <p className="mt-1 text-sm text-red-500">{errors.fullName}</p>
                )}
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Phone Number
                  </label>
                  <div className="flex gap-3">
                    <PhoneCountryPicker
                      value={formData.phoneCountry}
                      onChange={(countryCode) =>
                        handleInputChange({
                          target: { name: "phoneCountry", value: countryCode },
                        })
                      }
                    />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      className={`flex-1 min-w-0 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent ${errors.phone ? "border-red-500" : "border-gray-300"}`}
                      placeholder={phoneCountry.example}
                      inputMode="numeric"
                      maxLength={phoneCountry.maxLength}
                    />
                  </div>
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                  )}
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent ${errors.email ? "border-red-500" : "border-gray-300"}`}
                    placeholder="Enter email"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                  )}
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent ${errors.address ? "border-red-500" : "border-gray-300"}`}
                  placeholder="Enter your full address"
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-red-500">{errors.address}</p>
                )}
              </div>

              {/* City, State, Pincode */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">State</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                    placeholder="State"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Pincode</label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                    placeholder="Pincode"
                  />
                </div>
              </div>

              {/* Country */}
              <div>
                <label className="block text-gray-700 mb-2">Country</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  placeholder="Country"
                />
              </div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={saving}
                className="w-full py-4 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Continue to Payment
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        </div>
      </main>

      <Footer />
    </>
  );
}

