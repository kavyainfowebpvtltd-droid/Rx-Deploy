import { Link, useLocation, useNavigate } from "react-router";
import {
  Mail,
  Phone,
  MapPin,
  Facebook,
  Instagram,
  Linkedin,
} from "lucide-react";
import logo from "@/assets/logo.jpeg";
import { getStoredUser, getToken } from "@/services/api.js";

export function Footer() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = `${location.pathname}${location.search}${location.hash}`;
  const privacyPath = `/privacy-policy?from=${encodeURIComponent(currentPath)}`;
  const termsPath = `/terms-and-conditions?from=${encodeURIComponent(currentPath)}`;

  const handleServiceNavigation = (e) => {
    e.preventDefault();

    const token = getToken();
    const user = getStoredUser();
    const userRole = user?.role?.toUpperCase();
    const servicesPath = "/user/services";
    const loginPath = `/login?redirect=${encodeURIComponent(servicesPath)}`;

    if (!token) {
      navigate(loginPath);
      return;
    }

    if (userRole === "USER") {
      navigate(servicesPath);
      return;
    }

    navigate(loginPath);
  };

  return (
    <footer className="bg-gradient-to-r from-[#1E3A8A] via-[#2563EB] to-[#60A5FA] text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <img src={logo} alt="RxIncredible" className="h-12 w-auto" />
            <p className="text-blue-100">
              Think Beyond Thought. Your trusted partner in healthcare and
              prescription management.
            </p>
          </div>

          <div>
            <h3 className="text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/"
                  className="text-blue-100 hover:text-white transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className="text-blue-100 hover:text-white transition-colors"
                >
                  Login
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  className="text-blue-100 hover:text-white transition-colors"
                >
                  Register
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg mb-4">Our Services</h3>
            <ul className="space-y-2 text-blue-100">
              <li>
                <Link
                  to="/user/services"
                  onClick={handleServiceNavigation}
                  className="hover:text-white hover:underline transition-colors"
                >
                  Prescription Analysis
                </Link>
              </li>
              <li>
                <Link
                  to="/user/services"
                  onClick={handleServiceNavigation}
                  className="hover:text-white hover:underline transition-colors"
                >
                  Online Pharmacy
                </Link>
              </li>
              <li>
                <Link
                  to="/user/services"
                  onClick={handleServiceNavigation}
                  className="hover:text-white hover:underline transition-colors"
                >
                  Second Opinion
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-blue-100">
                <Mail className="w-4 h-4" />
                <a
                  href="mailto:info@rxincredible.com"
                  className="hover:text-white hover:underline transition-colors"
                >
                  info@rxincredible.com
                </a>
              </li>
              <li className="flex items-center gap-2 text-blue-100">
                <Phone className="w-4 h-4" />
                <a
                  href="tel:+919822848689"
                  className="hover:text-white hover:underline transition-colors"
                >
                  9822848689
                </a>
              </li>
              <li className="flex items-center gap-2 text-blue-100">
                <MapPin className="w-4 h-4" />
                <a
                  href="https://www.google.com/maps/search/?api=1&query=234+Shree+Nagar+Nagpur-15"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white hover:underline transition-colors"
                >
                  234 Shree Nagar,Nagpur-15
                </a>
              </li>
            </ul>

            <div className="flex gap-4 mt-4">
              <a
                href="https://www.facebook.com/profile.php?id=61566156037486"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open RxIncredible on Facebook"
                className="text-blue-100 hover:text-white transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://x.com/rxincredible"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open RxIncredible on X"
                className="text-blue-100 hover:text-white transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="w-5 h-5"
                  fill="currentColor"
                >
                  <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.847h-7.406l-5.8-7.584-6.637 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932zM17.61 20.645h2.039L6.486 3.24H4.298z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/rxincredible/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open RxIncredible on Instagram"
                className="text-blue-100 hover:text-white transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://www.linkedin.com/company/rxincredible/about/?viewAsMember=true"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open RxIncredible on LinkedIn"
                className="text-blue-100 hover:text-white transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-blue-400 mt-8 pt-8 text-center text-blue-100 flex flex-col items-center justify-between gap-4 md:flex-row md:text-left">
          <p className="min-w-0">
            {" "}
            Copyright &copy; 2026 RxIncredible. All rights reserved. |{" "}
            <Link
              to={privacyPath}
              state={{ from: currentPath }}
              className="text-blue-100 hover:text-white transition-colors cursor-pointer"
            >
              Privacy Policy
            </Link>{" "}
            |{" "}
            <Link
              to={termsPath}
              state={{ from: currentPath }}
              className="text-blue-100 hover:text-white transition-colors cursor-pointer"
            >
              Terms and Conditions
            </Link>
          </p>
          <p className="min-w-0 md:text-right">
            Designed & Developed by{" "}
            <a
              href="https://kavyainfoweb.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-blue-200"
            >
              Kavya Infoweb Pvt Ltd
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
