import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft, ShieldCheck, Timer } from "lucide-react";
import Swal from "sweetalert2";
import { Navbar } from "../components/Navbar.jsx";
import { Footer } from "../components/Footer.jsx";
import { authAPI, setStoredUser, setToken, userAPI } from "@/services/api.js";
import logo from "@/assets/logo.jpeg";

export default function VerifyOTP() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const type = searchParams.get("type") || "forgot"; // 'register', 'forgot', or 'admin-login'
  const rememberMe = searchParams.get("remember") === "1";
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(300);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);
  const navigate = useNavigate();

  // Timer for resend OTP
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => {
        setResendTimer(resendTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const handleInputChange = (index, value) => {
    if (isNaN(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pastedData[i] || "";
    }
    setOtp(newOtp);
    
    // Focus last filled input or first empty
    const lastFilledIndex = pastedData.length - 1;
    if (lastFilledIndex < 6) {
      inputRefs.current[Math.min(lastFilledIndex + 1, 5)]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const otpValue = otp.join("");
    
    if (otpValue.length !== 6) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Please enter the complete 6-digit OTP",
        confirmButtonColor: "#2563EB",
        confirmButtonText: "OK"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Call the backend API to verify OTP
      console.log("Calling verifyOtp API with email:", email, "OTP:", otpValue);
      
      let response;
      if (type === "forgot") {
        // For forgot password, use verifyForgotPassword API
        console.log("Using forgot password flow - calling verifyForgotPassword");
        response = await userAPI.verifyForgotPassword(email, otpValue);
        console.log("VerifyForgotPassword response:", response);
      } else if (type === "admin-login") {
        response = await authAPI.verifyAdminOtp(email, otpValue, {
          suppressErrorAlert: true,
        });
      } else {
        // For registration, use regular verifyOtp API
        response = await userAPI.verifyOtp(email, otpValue);
        console.log("VerifyOTP response:", response);
      }
      console.log("Response.user:", response?.user);
      console.log("Response.data:", response?.data);
      
      setIsLoading(false);
      
      console.log("Full response:", response);
      console.log("Response data:", response?.data);
      console.log("Response data user:", response?.data?.user);
      
      // Check if response contains user object (registration verification) or boolean
      // axios wraps response in .data property
      if (type === "admin-login" && response?.data?.user && response?.data?.token) {
        setToken(response.data.token, rememberMe);
        setStoredUser(response.data.user, rememberMe);

        Swal.fire({
          icon: "success",
          title: "Login Verified!",
          text: "Admin OTP verified successfully.",
          confirmButtonColor: "#2563EB",
          confirmButtonText: "Continue"
        }).then((result) => {
          if (result.isConfirmed) {
            navigate("/admin/dashboard");
          }
        });
      } else if (response?.data?.user) {
        // New registration verified - user object returned
        Swal.fire({
          icon: "success",
          title: "Email Verified!",
          text: "Your account has been created successfully. You can now login.",
          confirmButtonColor: "#2563EB",
          confirmButtonText: "Continue"
        }).then((result) => {
          if (result.isConfirmed) {
            navigate("/login");
          }
        });
      } else if (response?.data === true || response?.data?.success === true) {
        // Existing user verification
        // For forgot password, store the OTP for use in reset password
        if (type === "forgot") {
          sessionStorage.setItem(`otp_${email}`, otpValue);
        }
        
        Swal.fire({
          icon: "success",
          title: "OTP Verified!",
          text: type === "register" 
            ? "Your email has been verified successfully. You can now login."
            : "Your email has been verified. Now you can reset your password.",
          confirmButtonColor: "#2563EB",
          confirmButtonText: "Continue"
        }).then((result) => {
          if (result.isConfirmed) {
            if (type === "register") {
              navigate("/login");
            } else {
              navigate(`/reset-password?email=${encodeURIComponent(email)}`);
            }
          }
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Invalid OTP",
          text: "The verification code you entered is incorrect. Please try again.",
          confirmButtonColor: "#2563EB",
          confirmButtonText: "OK"
        });
      }
    } catch (error) {
      setIsLoading(false);
      console.error("Verify OTP error:", error);
      console.error("Error response:", error.response);
      console.error("Error data:", error.response?.data);
      
      const errorMessage = error.response?.data?.error || error.response?.data?.message || "The verification code you entered is incorrect. Please try again.";
      
      Swal.fire({
        icon: "error",
        title: "Verification Failed",
        text: errorMessage,
        confirmButtonColor: "#2563EB",
        confirmButtonText: "OK"
      });
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    
    setCanResend(false);
    setResendTimer(300);
    setOtp(["", "", "", "", "", ""]);
    
    try {
      // Call the backend API to resend OTP based on type
      if (type === "register") {
        await userAPI.resendVerification(email);
      } else if (type === "admin-login") {
        await authAPI.resendAdminOtp(email, { suppressErrorAlert: true });
      } else {
        // For forgot password, use forgotPassword to get new OTP
        await userAPI.forgotPassword(email);
      }
      
      Swal.fire({
        icon: "success",
        title: "OTP Resent!",
        text: `A new verification code has been sent to ${email}.`,
        confirmButtonColor: "#2563EB",
        confirmButtonText: "OK"
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to resend OTP. Please try again.",
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
            {/* Back Link */}
            <Link 
              to={type === "forgot" ? "/forgot-password" : "/login"}
              className="flex items-center text-[#2563EB] hover:text-[#1E3A8A] mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {type === "forgot" ? "Back" : "Back to Login"}
            </Link>

            {/* Logo */}
            <div className="text-center mb-8">
              <img src={logo} alt="RxIncredible" className="h-16 w-auto mx-auto mb-4" />
              <h2 className="text-3xl text-[#1E3A8A]">
                {type === "admin-login" ? "Verify Admin Login" : "Verify Your Email"}
              </h2>
              <p className="text-gray-600 mt-2">
                Enter the 6-digit code sent to<br />
                <span className="font-medium text-[#2563EB]">{email}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* OTP Input */}
              <div>
                <label className="block text-gray-700 mb-4 text-center">
                  {type === "admin-login" ? "Enter Login OTP" : "Write OTP Below"}
                </label>
                <div className="flex justify-center gap-2" onPaste={handlePaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleInputChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-all duration-200"
                    />
                  ))}
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
                    Verifying...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <ShieldCheck className="w-5 h-5 mr-2" />
                    Verify OTP
                  </span>
                )}
              </motion.button>
            </form>

            {/* Resend OTP */}
            <div className="text-center mt-6">
              {canResend ? (
                <p className="text-gray-600">
                  Didn't receive the code?{" "}
                  <button 
                    onClick={handleResend}
                    className="text-[#2563EB] hover:text-[#1E3A8A] font-medium"
                  >
                    Resend OTP
                  </button>
                </p>
              ) : (
                <div className="flex items-center justify-center text-gray-500">
                  <Timer className="w-4 h-4 mr-1" />
                  Resend available in {resendTimer}s
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </>
  );
}
