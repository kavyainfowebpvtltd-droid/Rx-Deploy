import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { motion } from "motion/react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import Swal from "sweetalert2";
import { Navbar } from "../components/Navbar.jsx";
import { Footer } from "../components/Footer.jsx";
import logo from "@/assets/logo.jpeg";
import { authAPI, userAPI, setStoredUser, setToken } from "@/services/api.js";
import { validateEmail } from "@/app/utils/authValidation.js";

const REMEMBERED_EMAIL_KEY = "rememberedEmail";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(
    () => localStorage.getItem(REMEMBERED_EMAIL_KEY) || "",
  );
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(
    () => Boolean(localStorage.getItem(REMEMBERED_EMAIL_KEY)),
  );
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyOtp, setVerifyOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get redirect URL from query parameter (e.g., /login?redirect=/user/pay/2)
  const redirectParam = searchParams.get("redirect");

  const getRegisterVerifyUrl = (targetEmail) =>
    `/verify-otp?email=${encodeURIComponent(targetEmail)}&type=register`;

  const isUserProfileComplete = (user) =>
    Boolean(
      user?.fullName &&
        user?.phone &&
        user?.address &&
        user?.height &&
        user?.weight,
    );

  const isDoctorProfileComplete = (user) =>
    Boolean(
      user?.fullName &&
        user?.phone &&
        user?.specialization &&
        user?.qualifications &&
        user?.licenseNumber,
    );

  const isAnalystProfileComplete = (user) =>
    Boolean(user?.fullName && user?.phone && user?.address);

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    setErrors((current) => ({
      ...current,
      email: value ? validateEmail(value) : "",
    }));
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    setErrors((current) => ({
      ...current,
      password: value.trim() ? "" : "Password is required",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const emailError = validateEmail(normalizedEmail);
    const passwordError = password.trim() ? "" : "Password is required";

    setErrors({
      email: emailError,
      password: passwordError,
    });

    if (emailError || passwordError) {
      return;
    }

    setLoading(true);

    try {
      // Call the login API endpoint
      const response = await authAPI.login(normalizedEmail, password, {
        suppressErrorAlert: true,
      });

      // Handle both axios and fetch responses
      // axios: response.data contains the actual data
      // fetch: response IS the actual data
      let data = response.data || response;

      if (data?.otpRequired) {
        if (rememberMe) {
          localStorage.setItem(REMEMBERED_EMAIL_KEY, normalizedEmail);
        } else {
          localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        }

        navigate(
          `/verify-otp?email=${encodeURIComponent(normalizedEmail)}&type=admin-login&remember=${rememberMe ? "1" : "0"}`,
        );
        return;
      }
      
      // Store token in the selected auth storage for API authentication
      console.log("Login response data:", JSON.stringify(data));
      console.log("Token from login:", data.token ? "PRESENT" : "MISSING");
      if (data.token) {
        setToken(data.token, rememberMe);
        console.log(
          `Token stored in ${rememberMe ? "localStorage" : "sessionStorage"}:`,
          data.token.substring(0, 30) + "...",
        );
      } else {
        console.error("No token in login response! Response:", data);
      }
      
      // Store user for fallback when /auth/me fails
      const user = data.user;
      if (user) {
        setStoredUser(user, rememberMe);
        console.log("User stored for auth fallback:", user.id, user.email);
      }

      if (rememberMe) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, normalizedEmail);
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      // Debug: Log user from login response
      console.log("=== LOGIN RESPONSE USER ===");
      console.log("user from login:", JSON.stringify(user));
      console.log("user.isVerified:", user.isVerified);
      console.log("user.role:", user.role);

      // Check if user exists
      if (!user) {
        Swal.fire({
          icon: "error",
          title: "Login Failed",
          text: "User not found. Please register first.",
          confirmButtonColor: "#2563EB",
          confirmButtonText: "OK",
        });
        setLoading(false);
        return;
      }

      // Only disabled users should be blocked at login.
      // Inactive users can continue to verification/profile completion flows.
      if ((user.status || "").toLowerCase() === "disabled") {
        Swal.fire({
          icon: "error",
          title: "Account Disabled",
          text: "Your account is disabled. Please contact the administrator.",
          confirmButtonColor: "#2563EB",
          confirmButtonText: "OK",
        });
        setLoading(false);
        return;
      }

      // Fetch fresh user data from backend after login
      // This ensures we get the latest profile data after any updates
      let freshUser = user;
      try {
        console.log("Fetching fresh user data after login...");
        const currentUserResponse = await authAPI.getCurrentUser();
        const currentUserData = currentUserResponse?.data || currentUserResponse;
        console.log("Fresh user data:", JSON.stringify(currentUserData));
        if (currentUserData && currentUserData.role) {
          freshUser = currentUserData;
        } else {
          console.log("Using login response user (fresh user response missing role)");
        }
      } catch (e) {
        console.error("Error fetching fresh user data:", e);
        console.log("Using login response user due to error");
        // Fall back to login response data
      }
      
      // Log which user object we're using
      console.log("Final freshUser:", JSON.stringify(freshUser));

      // Debug: Log the role value
      console.log("=== ROLE DEBUG ===");
      console.log("freshUser:", JSON.stringify(freshUser));
      console.log("freshUser.role:", freshUser.role);
      console.log("freshUser.role type:", typeof freshUser.role);
      console.log("freshUser.isVerified:", freshUser.isVerified);
      console.log("user from login:", JSON.stringify(user));
      console.log("user.role:", user.role);
      console.log("user.isVerified:", user.isVerified);
      
      // Ensure role is uppercase for consistent comparison
      const userRole = (freshUser.role || user.role || "").toUpperCase();
      console.log("Normalized role:", userRole);
      console.log("Is ADMIN?", userRole === "ADMIN");
      console.log("Is verified?", freshUser.isVerified, user.isVerified);
      
      // Role-based conditional redirects
      switch (userRole) {
        case "ADMIN":
          // Admin: Direct login, no OTP, no profile check
          console.log("=== REDIRECTING TO ADMIN DASHBOARD ===");
          navigate("/admin/dashboard");
          break;
        case "ACCOUNTANT":
          // Accountant: Check if email is verified
          console.log("=== ROLE IS ACCOUNTANT ===");
          console.log("Accountant isVerified:", freshUser.isVerified);
          if (!freshUser.isVerified) {
            // Email not verified - redirect to OTP verification
            navigate(getRegisterVerifyUrl(freshUser.email));
            return;
          }
          // Email verified - go to prescriptions
          navigate("/accountant/prescriptions");
          break;
        case "DOCTOR":
          // Doctor: Check if email is verified
          console.log("=== ROLE IS DOCTOR ===");
          console.log("Doctor isVerified:", freshUser.isVerified);
          if (!freshUser.isVerified) {
            // Email not verified - redirect to OTP verification
            navigate(getRegisterVerifyUrl(freshUser.email));
            return;
          }

          if (isDoctorProfileComplete(freshUser)) {
            navigate("/doctor/reports");
          } else {
            // Redirect to profile completion
            Swal.fire({
              icon: "info",
              title: "Profile Required",
              text: "Please complete your doctor profile before accessing reports.",
              confirmButtonColor: "#2563EB",
              confirmButtonText: "Complete Profile",
            });
            navigate("/doctor/profile");
          }
          break;
        case "USER":
          // User: Check if email is verified
          console.log("=== ROLE IS USER ===");
          console.log("User isVerified:", freshUser.isVerified);
          if (!freshUser.isVerified) {
            // Email not verified - redirect to OTP verification
            navigate(getRegisterVerifyUrl(freshUser.email));
            return;
          }

          if (!isUserProfileComplete(freshUser)) {
            // Profile not complete - redirect to profile page
            Swal.fire({
              icon: "info",
              title: "Profile Required",
              text: "Please complete your profile (including height and weight) before accessing services.",
              confirmButtonColor: "#2563EB",
              confirmButtonText: "Complete Profile",
            });
            navigate("/user/profile");
          } else {
            // Everything complete - go to services
            navigate(redirectParam || "/user/services");
          }
          break;
        case "ANALYST":
          // Analyst: Check if email is verified and profile is complete
          console.log("=== ROLE IS ANALYST ===");
          console.log("Analyst isVerified:", freshUser.isVerified);
          if (!freshUser.isVerified) {
            // Email not verified - redirect to OTP verification
            navigate(getRegisterVerifyUrl(freshUser.email));
            return;
          }

          if (isAnalystProfileComplete(freshUser)) {
            navigate("/analyst/reports");
          } else {
            Swal.fire({
              icon: "info",
              title: "Profile Required",
              text: "Please complete your analyst profile before accessing reports.",
              confirmButtonColor: "#2563EB",
              confirmButtonText: "Complete Profile",
            });
            navigate("/analyst/profile");
          }
          break;
        default:
          console.log("=== DEFAULT CASE - Unknown role:", userRole, "redirecting to user services ===");
          navigate("/user/services");
      }
    } catch (error) {
      console.error("Login error:", error);

      if (error.response?.status === 401) {
        Swal.fire({
          icon: "error",
          title: "Login Failed",
          text: "Invalid email or password. Please try again.",
          confirmButtonColor: "#2563EB",
          confirmButtonText: "OK",
        });
      } else if (error.response?.status === 403) {
        const backendError =
          error.response?.data?.error || error.response?.data?.message || "";
        const isBlockedAccountError =
          backendError.toLowerCase().includes("inactive") ||
          backendError.toLowerCase().includes("disabled");

        if (isBlockedAccountError && backendError.toLowerCase().includes("disabled")) {
          Swal.fire({
            icon: "error",
            title: "Account Disabled",
            text:
              backendError ||
              "Your account is disabled. Please contact the administrator.",
            confirmButtonColor: "#2563EB",
            confirmButtonText: "OK",
          });
        } else {
          Swal.fire({
            icon: "info",
            title: "OTP Sent To Your Email",
            text:
              backendError ||
              "Your email is not verified yet. We have sent an OTP to your registered email address.",
            confirmButtonColor: "#2563EB",
            confirmButtonText: "Verify Now",
          }).then(() => {
            navigate(getRegisterVerifyUrl(normalizedEmail));
          });
        }
        setLoading(false);
        return;
      } else {
        Swal.fire({
          icon: "error",
          title: "Login Failed",
          text: "Unable to login. Please try again later.",
          confirmButtonColor: "#2563EB",
          confirmButtonText: "OK",
        });
      }
    }
    setLoading(false);
  };

  // Handle email verification for pending users
  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setVerifying(true);

    try {
      const response = await authAPI.verifyOtp(verifyEmail, verifyOtp);

      Swal.fire({
        icon: "success",
        title: "Email Verified!",
        text: "Your email has been verified. You can now login.",
        confirmButtonColor: "#2563EB",
      });
      setShowVerify(false);
      setVerifyEmail("");
      setVerifyOtp("");
    } catch (error) {
      console.error("Verify error:", error);
      Swal.fire({
        icon: "error",
        title: "Verification Failed",
        text: error.response?.data?.error || "Invalid OTP. Please try again.",
        confirmButtonColor: "#2563EB",
      });
    }
    setVerifying(false);
  };

  // Resend OTP to email
  const handleResendOtp = async () => {
    if (!verifyEmail) {
      Swal.fire({
        icon: "warning",
        title: "Email Required",
        text: "Please enter your email address first.",
        confirmButtonColor: "#2563EB",
      });
      return;
    }

    try {
      await authAPI.resendVerification(verifyEmail);
      Swal.fire({
        icon: "success",
        title: "OTP Sent!",
        text: "A new OTP has been sent to your email.",
        confirmButtonColor: "#2563EB",
      });
    } catch (error) {
      console.error("Resend OTP error:", error);
      Swal.fire({
        icon: "error",
        title: "Failed",
        text:
          error.response?.data?.error ||
          "Could not resend OTP. Please try again.",
        confirmButtonColor: "#2563EB",
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
            {/* Logo */}
            <div className="text-center mb-8">
              <img
                src={logo}
                alt="RxIncredible"
                className="h-16 w-auto mx-auto mb-4"
              />
              <h2 className="text-3xl text-[#1E3A8A]">Welcome Back</h2>
              <p className="text-gray-600 mt-2">Login to access your account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label className="block text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="Enter your email"
                    autoComplete="email"
                    inputMode="email"
                    className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-200 ${errors.email ? "border-red-500" : "border-gray-300"}`}
                    required
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={handlePasswordChange}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className={`w-full pl-12 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-200 ${errors.password ? "border-red-500" : "border-gray-300"}`}
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

              {/* Forgot Password */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="w-4 h-4 text-[#2563EB] rounded border-gray-300 focus:ring-[#2563EB]"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    Remember me
                  </span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-[#2563EB] hover:text-[#1E3A8A]"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50"
              >
                {loading ? "Logging in..." : "Login"}
              </motion.button>
            </form>

            {/* Register Link */}
            <p className="text-center mt-6 text-gray-600">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-[#2563EB] hover:text-[#1E3A8A]"
              >
                Sign up
              </Link>
            </p>

            {/* Verify Email Section */}
            {showVerify && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <h3 className="text-lg font-semibold text-[#1E3A8A] mb-3">
                  Verify Your Email
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Enter the OTP sent to your email to verify your account.
                </p>
                <form onSubmit={handleVerifyEmail} className="space-y-4">
                  <div>
                    <label className="block text-gray-700 mb-2 text-sm">
                      Email
                    </label>
                    <input
                      type="email"
                      value={verifyEmail}
                      onChange={(e) => setVerifyEmail(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2 text-sm">
                      OTP Code
                    </label>
                    <input
                      type="text"
                      value={verifyOtp}
                      onChange={(e) => setVerifyOtp(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowVerify(false)}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={verifying}
                      className="flex-1 px-4 py-2 bg-[#2563EB] text-white rounded-xl hover:bg-blue-600 disabled:opacity-50"
                    >
                      {verifying ? "Verifying..." : "Verify"}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="w-full mt-2 text-sm text-[#2563EB] hover:text-[#1E3A8A]"
                  >
                    Didn't receive OTP? Resend OTP
                  </button>
                </form>
              </div>
            )}
          </div>
        </motion.div>
      </main>

      <Footer />
    </>
  );
}

