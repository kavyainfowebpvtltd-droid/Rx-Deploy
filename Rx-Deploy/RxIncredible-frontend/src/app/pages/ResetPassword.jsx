import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft, Lock, Eye, EyeOff, Save, CheckCircle } from "lucide-react";
import Swal from "sweetalert2";
import { Navbar } from "../components/Navbar.jsx";
import { Footer } from "../components/Footer.jsx";
import { userAPI } from "@/services/api.js";
import logo from "@/assets/logo.jpeg";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const passwordRequirements = [
    { label: "At least 8 characters", met: newPassword.length >= 8 },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(newPassword) },
    { label: "Contains lowercase letter", met: /[a-z]/.test(newPassword) },
    { label: "Contains number", met: /[0-9]/.test(newPassword) },
    { label: "Contains special character", met: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) },
  ];

  const allRequirementsMet = passwordRequirements.every(req => req.met);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Please fill in all password fields",
        confirmButtonColor: "#2563EB",
        confirmButtonText: "OK"
      });
      return;
    }

    if (!allRequirementsMet) {
      Swal.fire({
        icon: "error",
        title: "Weak Password",
        text: "Please meet all password requirements",
        confirmButtonColor: "#2563EB",
        confirmButtonText: "OK"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      Swal.fire({
        icon: "error",
        title: "Password Mismatch",
        text: "New password and confirm password do not match",
        confirmButtonColor: "#2563EB",
        confirmButtonText: "OK"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Get OTP from sessionStorage (set during OTP verification)
      const storedOtp = sessionStorage.getItem(`otp_${email}`);
      
      if (!storedOtp) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Session expired. Please verify OTP again.",
          confirmButtonColor: "#2563EB",
          confirmButtonText: "OK"
        });
        setIsLoading(false);
        navigate(`/verify-otp?email=${encodeURIComponent(email)}&type=forgot`);
        return;
      }

      // Call the backend API to reset password
      console.log("Calling resetPassword API with email:", email);
      const response = await userAPI.resetPassword(email, storedOtp, newPassword);
      console.log("ResetPassword response:", response);
      
      setIsLoading(false);
      
      // Clear the stored OTP
      sessionStorage.removeItem(`otp_${email}`);
      
      Swal.fire({
        icon: "success",
        title: "Password Reset Successful!",
        text: "Your password has been updated. Please login with your new password.",
        confirmButtonColor: "#2563EB",
        confirmButtonText: "Login Now"
      }).then((result) => {
        if (result.isConfirmed) {
          navigate("/login");
        }
      });
    } catch (error) {
      setIsLoading(false);
      console.error("Reset password error:", error);
      console.error("Error response:", error.response);
      console.error("Error data:", error.response?.data);
      
      const errorMessage = error.response?.data?.error || error.response?.data?.message || "Failed to reset password. Please try again.";
      
      Swal.fire({
        icon: "error",
        title: "Password Reset Failed",
        text: errorMessage,
        confirmButtonColor: "#2563EB",
        confirmButtonText: "OK"
      });
    }
  };

  return (
    <>
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-[#F1F5F9]">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-3xl shadow-2xl p-5 sm:p-8 md:p-10">
            {/* Back to OTP Verification */}
            <Link 
              to={`/verify-otp?email=${encodeURIComponent(email)}`}
              className="flex items-center text-[#2563EB] hover:text-[#1E3A8A] mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>

            {/* Logo */}
            <div className="text-center mb-8">
              <img src={logo} alt="RxIncredible" className="h-16 w-auto mx-auto mb-4" />
              <h2 className="text-3xl text-[#1E3A8A]">Create New Password</h2>
              <p className="text-gray-600 mt-2">
                Set a new password for your account<br />
                <span className="font-medium text-[#2563EB]">{email}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* New Password */}
              <div>
                <label className="block text-gray-700 mb-2">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-200"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              {newPassword && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</p>
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className="flex items-center text-sm">
                      {req.met ? (
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      ) : (
                        <div className="w-4 h-4 border-2 border-gray-300 rounded-full mr-2" />
                      )}
                      <span className={req.met ? "text-green-600" : "text-gray-500"}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Confirm Password */}
              <div>
                <label className="block text-gray-700 mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-200"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Password Match Indicator */}
              {confirmPassword && (
                <div className={`flex items-center text-sm ${newPassword === confirmPassword ? "text-green-600" : "text-red-500"}`}>
                  {newPassword === confirmPassword ? (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-red-500 rounded-full mr-2" />
                  )}
                  {newPassword === confirmPassword ? "Passwords match" : "Passwords do not match"}
                </div>
              )}

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading || !allRequirementsMet || newPassword !== confirmPassword}
                className="w-full py-3 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Save className="w-5 h-5 mr-2" />
                    Save New Password
                  </span>
                )}
              </motion.button>
            </form>

            {/* Back to Login */}
            <p className="text-center mt-6 text-gray-600">
              Remember your password?{" "}
              <Link to="/login" className="text-[#2563EB] hover:text-[#1E3A8A]">
                Login here
              </Link>
            </p>
          </div>
        </motion.div>
      </main>

      <Footer />
    </>
  );
}
