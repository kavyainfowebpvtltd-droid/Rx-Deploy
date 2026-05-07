import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Link } from "react-router";
import {
  FileText,
  ShoppingCart,
  Stethoscope,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Navbar } from "../../components/Navbar.jsx";
import { Footer } from "../../components/Footer.jsx";
import { authAPI } from "@/services/api.js";
import Swal from "sweetalert2";

export default function UserServices() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in and profile is complete - only when clicking a service
  const handleServiceClick = async (e, serviceCategory) => {
    e.preventDefault();

    try {
      // Try to get user - if fails, user is not logged in
      const userResponse = await authAPI.getCurrentUser();
      // Handle both axios response (response.data) and direct data
      const user = userResponse.data || userResponse;

      // For patients, profile is complete if fullName, phone, address, height and weight are present
      const isProfileComplete =
        user?.fullName &&
        user?.phone &&
        user?.address &&
        user?.height &&
        user?.weight;

      if (!isProfileComplete) {
        Swal.fire({
          icon: "warning",
          title: "Profile Incomplete",
          text: "Please complete your profile (including height and weight) before accessing services.",
          confirmButtonColor: "#2563EB",
          confirmButtonText: "Complete Profile",
          allowOutsideClick: false,
        }).then((result) => {
          if (result.isConfirmed) {
            navigate("/user/profile");
          }
        });
        return;
      }

      // Profile complete - go to upload page
      navigate(`/user/upload/${serviceCategory}`);
    } catch (error) {
      // Any error means user is not logged in - redirect to login with return URL
      navigate(`/login?redirect=/user/upload/${serviceCategory}`);
    }
  };

  // User role is always USER for this page
  const userRole = "USER";

  // Default services as fallback
  const defaultServices = [
    {
      id: "prescription-analysis",
      icon: FileText,
      title: "Prescription Analysis",
      description:
        "Upload your prescription and get a detailed analysis from our expert doctors",
      gradient: "from-[#1E3A8A] to-[#2563EB]",
      category: "PRESCRIPTION",
    },
    {
      id: "online-pharmacy",
      icon: ShoppingCart,
      title: "Online Pharmacy",
      description: "Order medicines online with instant quotations",
      gradient: "from-[#2563EB] to-[#60A5FA]",
      category: "PHARMACY",
    },
    {
      id: "second-opinion",
      icon: Stethoscope,
      title: "Second Opinion",
      description:
        "Get a second medical opinion from certified healthcare professionals",
      gradient: "from-[#16A34A] to-[#22C55E]",
      category: "CONSULTATION",
    },
  ];

  // Only show these 3 services (filter out any extra services from backend)
  const ALLOWED_SERVICES = ["prescription", "pharmacy", "consultation"];

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);

      // Always use default 3 services - ignore backend services to avoid showing extra services
      // This ensures only prescription, pharmacy, consultation are shown
      setServices(defaultServices);
    } catch (err) {
      console.error("Error fetching services:", err);
      // Fallback to default services on error
      setServices(defaultServices);
      setError("Using offline services. Connect to backend for live data.");
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (category) => {
    const cat = category?.toUpperCase();
    switch (cat) {
      case "PRESCRIPTION":
        return FileText;
      case "PHARMACY":
        return ShoppingCart;
      case "CONSULTATION":
        return Stethoscope;
      default:
        return FileText;
    }
  };

  const getGradient = (index) => {
    const gradients = [
      "from-[#1E3A8A] to-[#2563EB]",
      "from-[#2563EB] to-[#60A5FA]",
      "from-[#16A34A] to-[#22C55E]",
    ];
    return gradients[index % gradients.length];
  };

  const getDefaultDescription = (category) => {
    const cat = category?.toUpperCase();
    switch (cat) {
      case "PRESCRIPTION":
        return "Upload your prescription and get a detailed analysis from our expert doctors";
      case "PHARMACY":
        return "Order medicines online with instant quotations";
      case "CONSULTATION":
        return "Get a second medical opinion from certified healthcare professionals";
      default:
        return "Professional medical service";
    }
  };

  return (
    <>
      <Navbar role="user" />

      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-3xl sm:text-4xl text-[#1E3A8A] mb-4">Select a Service</h1>
            <p className="text-xl text-gray-600">
              Select the service you need assistance with
            </p>
          </motion.div>

          {/* Error Banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-700"
            >
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-[#2563EB] animate-spin" />
              <span className="ml-3 text-gray-600">Loading services...</span>
            </div>
          ) : (
            /* Services Grid */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8">
              {services.map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -10, scale: 1.02 }}
                  className="relative group cursor-pointer"
                  onClick={(e) =>
                    handleServiceClick(
                      e,
                      service.category?.toLowerCase() || service.id,
                    )
                  }
                >
                  <div className="bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 h-full">
                    {/* Icon */}
                    <div
                      className={`w-20 h-20 bg-gradient-to-br ${service.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                    >
                      <service.icon className="w-10 h-10 text-white" />
                    </div>

                    {/* Content */}
                    <h3 className="text-2xl text-[#1E3A8A] mb-3">
                      {service.title}
                    </h3>
                    <p className="text-gray-600 mb-4">{service.description}</p>

                    {/* Arrow */}
                    <div className="flex items-center text-[#2563EB] group-hover:translate-x-2 transition-transform duration-300">
                      <span className="mr-2">Get Started</span>
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Help Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-16 bg-gradient-to-r from-[#1E3A8A] via-[#2563EB] to-[#60A5FA] rounded-3xl p-8 text-white text-center"
          >
            <h2 className="text-3xl mb-4">Need Help ?</h2>
            <p className="text-blue-100  max-w-2xl mx-auto">
              Contact Number : <a href="tel:9822848689">9822848689</a>
            </p>
            <p className="text-blue-100 max-w-2xl mx-auto">
              Email :{" "}
              <a href="mailto:info@rxincredible.com">info@rxincredible.com</a>
            </p>
          </motion.div>
        </div>
      </main>

      <Footer />
    </>
  );
}
