import { Link, useLocation } from "react-router";
import { motion } from "motion/react";
import {
  Menu,
  X,
  LogOut,
  User,
  Home,
  ChevronDown,
  Settings,
  Stethoscope,
  Edit,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import logo from "@/assets/logo.jpeg";
import { authAPI, getToken, removeToken } from "@/services/api.js";
import { buildApiUrl } from "@/config/api.js";

const getProfileImageUrl = (user) => {
  const rawValue = user?.profilePicture || user?.avatar || "";

  if (!rawValue) {
    return "";
  }

  if (rawValue.includes(",")) {
    return rawValue;
  }

  if (/^https?:\/\//i.test(rawValue)) {
    return rawValue;
  }

  if (rawValue.startsWith("/uploads/") && user?.id) {
    return buildApiUrl(`/users/${user.id}/profile-picture`);
  }

  if (rawValue.startsWith("/uploads/")) {
    return rawValue;
  }

  return `data:image/jpeg;base64,${rawValue}`;
};

export function Navbar({ role, hideAuth = false, hideMobileMenuButton = false }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const location = useLocation();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setProfileOpen(false);
  }, [location]);

  // Get user info from backend API
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hideAuth || !role) {
      setLoading(false);
      setUserInfo(null);
      return;
    }

    const fetchUserInfo = async () => {
      try {
        // Check if token exists first
        const token = getToken();
        if (!token) {
          // No token - user is not logged in, skip the API call
          setLoading(false);
          return;
        }
        
        const response = await authAPI.getCurrentUser();
        // Handle both axios response (response.data) and direct data
        setUserInfo(response.data || response);
      } catch (error) {
        // Silently handle all errors - user is not logged in
        // This includes 401, network errors, etc.
        // Only clear token if it's an auth error
        if (error.response?.status === 401 || error.response?.status === 403) {
          removeToken();
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  const handleLogout = async () => {
    try {
      // Call logout API to clear the cookie
      await fetch(buildApiUrl("/auth/logout"), {
        method: "POST",
        credentials: "include", // Include cookies
      });
    } catch (error) {
      console.error("Logout API call failed:", error);
    } finally {
      // Clear token from localStorage
      removeToken();
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/login";
    }
  };

  const getRoleLinks = () => {
    switch (role) {
      case "user":
        return [
          { to: "/user/services", label: "Services" },
          { to: "/user/status", label: "My Orders" },
        ];
      case "doctor":
        return [
          { to: "/doctor/reports", label: "Reports" },
          { to: "/doctor/history", label: "History" },
        ];
      case "accountant":
        return [
          { to: "/accountant/prescriptions", label: "Quotation" },
          { to: "/accountant/quotation-history", label: "QuotationHistory" },
        ];
      case "admin":
        return [
          { to: "/admin/dashboard", label: "Dashboard" },
          { to: "/admin/users", label: "Users" },
          { to: "/admin/doctors", label: "Doctors" },
          { to: "/admin/orders", label: "Orders" },
        ];
      case "analyst":
        return [
          { to: "/analyst/reports", label: "Reports" },
          { to: "/analyst/history", label: "History" },
        ];
      default:
        return hideAuth
          ? []
          : [
              { to: "/login", label: "Login" },
              { to: "/register", label: "Sign Up" },
            ];
    }
  };

  const links = getRoleLinks();
  const userDisplayName = userInfo?.fullName || userInfo?.name || "Patient";
  const userEmail = userInfo?.email || "user@example.com";
  const analystDisplayName = userInfo?.fullName || userInfo?.name || "Analyst";
  const analystEmail = userInfo?.email || "analyst@example.com";
  const normalizeRoleLabel = (value, fallback) => {
    if (!value) return fallback;

    return value
      .toString()
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };
  const userRoleLabel = normalizeRoleLabel(userInfo?.role, "User");
  const doctorRoleLabel = normalizeRoleLabel(userInfo?.role, "Doctor");
  const analystRoleLabel = normalizeRoleLabel(userInfo?.role, "Analyst");
  const doctorAvatarUrl = getProfileImageUrl(userInfo);
  const homeLinkByRole = {
    user: "/user/services",
    doctor: "/doctor/reports",
    accountant: "/accountant/prescriptions",
    admin: "/admin/dashboard",
    analyst: "/analyst/reports",
  };
  const profileLinkByRole = {
    user: "/user/profile",
    doctor: "/doctor/profile",
    analyst: "/analyst/profile",
  };
  const mobileProfileLink = profileLinkByRole[role];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white shadow-md sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to={homeLinkByRole[role] || "/"} className="flex-shrink-0">
            <img src={logo} alt="RxIncredible" className="h-12 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                  location.pathname === link.to
                    ? "bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white"
                    : "text-[#1E3A8A] hover:bg-[#E0E7FF]"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Profile Dropdown - For Users */}
            {role === "user" && (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-[#1E3A8A] hover:bg-[#E0E7FF] transition-all duration-200"
                >
                  {doctorAvatarUrl ? (
                    <img
                      src={doctorAvatarUrl}
                      alt={userInfo?.fullName || "Doctor"}
                      className="w-8 h-8 rounded-full object-cover border border-blue-100"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <ChevronDown className="w-4 h-4" />
                </button>

                {/* Profile Dropdown */}
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 mt-2 w-[min(18rem,calc(100vw-2rem))] bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50"
                  >
                    <div className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] p-4 text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-semibold text-lg">
                            {userDisplayName}
                          </p>
                          <p className="text-sm text-white/80">
                            {userEmail}
                          </p>
                          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/70 mt-1">
                            {userRoleLabel}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">Phone</p>
                          <p className="font-medium">
                            {userInfo?.phone || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Gender</p>
                          <p className="font-medium">
                            {userInfo?.gender || "N/A"}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-gray-500">Address</p>
                          <p className="font-medium">
                            {userInfo?.address || "N/A"}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-gray-500">Age</p>
                          <p className="font-medium">
                            {userInfo?.age || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-gray-200 p-3">
                      <Link
                        to="/user/profile"
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-[#1E3A8A] hover:bg-blue-50 rounded-lg transition-all duration-200 mb-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-[#EF4444] hover:bg-red-50 rounded-lg transition-all duration-200"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* Profile Dropdown - Only for Doctors */}
            {role === "doctor" && (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-[#1E3A8A] hover:bg-[#E0E7FF] transition-all duration-200"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {/* Profile Dropdown */}
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 mt-2 w-[min(18rem,calc(100vw-2rem))] bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50"
                  >
                    <div className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] p-4 text-white">
                      <div className="flex items-center gap-3">
                        {doctorAvatarUrl ? (
                          <img
                            src={doctorAvatarUrl}
                            alt={userInfo?.fullName || "Doctor"}
                            className="w-12 h-12 rounded-full object-cover border border-white/30"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <Stethoscope className="w-6 h-6" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-lg">
                            {userInfo?.fullName || userInfo?.name || "Doctor"}
                          </p>
                          <p className="text-sm text-white/80">
                            {userInfo?.email || "doctor@example.com"}
                          </p>
                          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/70 mt-1">
                            {doctorRoleLabel}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">Qualification</p>
                          <p className="font-medium">
                            {userInfo?.qualifications ||
                              userInfo?.qualification ||
                              "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Registration No.</p>
                          <p className="font-medium">
                            {userInfo?.licenseNumber ||
                              userInfo?.registrationNumber ||
                              userInfo?.regNumber ||
                              "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Phone</p>
                          <p className="font-medium">
                            {userInfo?.phone || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Gender</p>
                          <p className="font-medium">
                            {userInfo?.gender || "N/A"}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-gray-500">Address</p>
                          <p className="font-medium">
                            {userInfo?.address || "N/A"}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-gray-500">Specialization</p>
                          <p className="font-medium">
                            {userInfo?.specialization || "General Medicine"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-gray-200 p-3">
                      <Link
                        to="/doctor/profile"
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-[#1E3A8A] hover:bg-blue-50 rounded-lg transition-all duration-200 mb-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-[#EF4444] hover:bg-red-50 rounded-lg transition-all duration-200"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* Profile Dropdown - For Analysts */}
            {role === "analyst" && (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-[#1E3A8A] hover:bg-[#E0E7FF] transition-all duration-200"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 mt-2 w-[min(18rem,calc(100vw-2rem))] bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50"
                  >
                    <div className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] p-4 text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-semibold text-lg">
                            {analystDisplayName}
                          </p>
                          <p className="text-sm text-white/80">
                            {analystEmail}
                          </p>
                          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/70 mt-1">
                            {analystRoleLabel}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">Phone</p>
                          <p className="font-medium">
                            {userInfo?.phone || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Gender</p>
                          <p className="font-medium">
                            {userInfo?.gender || "N/A"}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-gray-500">Address</p>
                          <p className="font-medium">
                            {userInfo?.address || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-gray-200 p-3">
                      <Link
                        to="/analyst/profile"
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-[#1E3A8A] hover:bg-blue-50 rounded-lg transition-all duration-200 mb-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-[#EF4444] hover:bg-red-50 rounded-lg transition-all duration-200"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* Logout Button - For accountant and admin */}
            {(role === "accountant" || role === "admin") && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[#EF4444] hover:bg-red-50 transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          {!hideMobileMenuButton && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-[#1E3A8A] hover:bg-[#E0E7FF]"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          )}
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden py-4 space-y-2"
          >
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg transition-all duration-200 ${
                  location.pathname === link.to
                    ? "bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white"
                    : "text-[#1E3A8A] hover:bg-[#E0E7FF]"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Profile Link - For mobile authenticated profile roles */}
            {mobileProfileLink && (
              <Link
                to={mobileProfileLink}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 ${
                  location.pathname === mobileProfileLink
                    ? "bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white"
                    : "text-[#1E3A8A] hover:bg-[#E0E7FF]"
                }`}
              >
                <User className="w-4 h-4" />
                Profile
              </Link>
            )}

            {/* Logout Button - For authenticated roles in mobile */}
            {["user", "doctor", "accountant", "admin", "analyst"].includes(role) && (
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-3 text-[#EF4444] hover:bg-red-50 rounded-lg transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            )}

          </motion.div>
        )}
      </div>
    </motion.nav>
  );
}
