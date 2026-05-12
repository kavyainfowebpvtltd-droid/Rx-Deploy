import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import { Mail, ArrowLeft, Send } from "lucide-react";
import Swal from "sweetalert2";
import { Navbar } from "../components/Navbar.jsx";
import { Footer } from "../components/Footer.jsx";
import { userAPI } from "@/services/api.js";
import logo from "@/assets/logo.jpeg";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Please enter your email address",
        confirmButtonColor: "#2563EB",
        confirmButtonText: "OK"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Call the backend API to send OTP via email
      await userAPI.forgotPassword(email);
      
      setIsLoading(false);
      Swal.fire({
        icon: "success",
        title: "OTP Sent!",
        text: `A verification code has been sent to ${email}. Please check your inbox.`,
        confirmButtonColor: "#2563EB",
        confirmButtonText: "Continue"
      }).then((result) => {
        if (result.isConfirmed) {
          // Navigate to OTP verification page with email as parameter
          navigate(`/verify-otp?email=${encodeURIComponent(email)}&type=forgot`);
        }
      });
    } catch (error) {
      setIsLoading(false);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to send OTP. Please check if the email is registered.",
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
            {/* Back to Login */}
            <Link 
              to="/login" 
              className="flex items-center text-[#2563EB] hover:text-[#1E3A8A] mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Link>

            {/* Logo */}
            <div className="text-center mb-8">
              <img src={logo} alt="RxIncredible" className="h-16 w-auto mx-auto mb-4" />
              <h2 className="text-3xl text-[#1E3A8A]">Forgot Password?</h2>
              <p className="text-gray-600 mt-2">
                Enter your email address and we'll send you a verification code to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label className="block text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending OTP...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Send className="w-5 h-5 mr-2" />
                    Send OTP
                  </span>
                )}
              </motion.button>
            </form>

            {/* Remember Password */}
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
