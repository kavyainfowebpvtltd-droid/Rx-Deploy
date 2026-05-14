import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Save,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import Swal from "sweetalert2";
import { Navbar } from "../../components/Navbar.jsx";
import { Footer } from "../../components/Footer.jsx";
import { authAPI, userAPI } from "@/services/api.js";
import { CustomSelect } from "../../components/CustomSelect.jsx";
import { GENDER_OPTIONS } from "@/app/constants/selectOptions.js";

export default function AnalystProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    gender: "",
  });

  // Get analyst info from backend API on mount
  useEffect(() => {
    const fetchAnalystInfo = async () => {
      try {
        // Fetch fresh user data from backend database
        const response = await authAPI.getCurrentUser();
        const analystInfo = response.data || response;
        
        if (analystInfo) {
          setFormData({
            fullName: analystInfo.fullName || analystInfo.name || "",
            email: analystInfo.email || "",
            phone: analystInfo.phone || "",
            address: analystInfo.address || "",
            gender: analystInfo.gender || "",
          });
        }
      } catch (error) {
        console.error("Error fetching analyst info from backend:", error);
        // Redirect to login if not authenticated
        if (error.response?.status === 401) {
          window.location.href = "/login";
        }
      }
    };

    fetchAnalystInfo();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Validate phone - must be 10 digits
    if (name === "phone") {
      if (value && !/^\d*$/.test(value)) {
        return;
      }
      if (value.length > 10) {
        return;
      }
    }

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);

    try {
      // Get current user from backend API
      const currentUserResponse = await authAPI.getCurrentUser();
      const currentUser = currentUserResponse.data || currentUserResponse;
      const analystId = currentUser.id;

      if (!analystId) {
        throw new Error("Analyst ID not found. Please login again.");
      }

      // Prepare update data
      const updateData = {
        fullName: formData.fullName,
        phone: formData.phone,
        address: formData.address,
        gender: formData.gender,
      };

      // Update user via API
      await userAPI.update(analystId, updateData);

      Swal.fire({
        icon: "success",
        title: "Profile Updated!",
        text: "Your profile has been updated successfully.",
        confirmButtonColor: "#2563EB",
        confirmButtonText: "OK",
      }).then((result) => {
        if (result.isConfirmed) {
          navigate("/analyst/reports");
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
      <Navbar role="analyst" />

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
                  onClick={() => navigate("/analyst/reports")}
                  className="p-2 rounded-lg bg-[#E0E7FF] text-[#1E3A8A] hover:bg-[#C7D2FE] transition-all duration-200"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-2xl text-[#1E3A8A] font-bold">
                    Edit Profile
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Update your personal information
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
                        placeholder="Enter your full name"
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-200"
                        required
                      />
                    </div>
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
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="Enter your phone number"
                        pattern="[0-9]{10}"
                        maxLength={10}
                        title="Please enter a 10-digit phone number"
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-200"
                        required
                      />
                    </div>
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-gray-700 mb-2">Gender</label>
                    <CustomSelect
                      value={formData.gender}
                      onChange={(value) =>
                        handleChange({ target: { name: "gender", value } })
                      }
                      options={GENDER_OPTIONS}
                      placeholder="Select Gender"
                    />
                  </div>
                </div>
              </div>

              {/* Address Information Section */}
              <div className="pb-6">
                <h3 className="text-lg font-semibold text-[#1E3A8A] mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Address Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Address */}
                  <div className="md:col-span-2">
                    <label className="block text-gray-700 mb-2">Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Enter your address"
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>
              </div>

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
                  onClick={() => navigate("/analyst/reports")}
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
