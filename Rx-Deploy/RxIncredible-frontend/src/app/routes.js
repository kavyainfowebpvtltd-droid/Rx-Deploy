 import { createBrowserRouter } from "react-router";
import Root from "./pages/Root.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import VerifyOTP from "./pages/VerifyOTP.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import UserServices from "./pages/user/Services.jsx";
import UserUpload from "./pages/user/Upload.jsx";
import UserPayment from "./pages/user/Payment.jsx";
import UserShipping from "./pages/user/Shipping.jsx";
import UserStatus from "./pages/user/Status.jsx";
import UserProfile from "./pages/user/Profile.jsx";
import DoctorReports from "./pages/doctor/Reports.jsx";
import DoctorHistory from "./pages/doctor/History.jsx";
import DoctorGenerate from "./pages/doctor/Generate.jsx";
import DoctorProfile from "./pages/doctor/Profile.jsx";
import AccountantPrescriptions from "./pages/accountant/Prescriptions.jsx";
import AccountantQuotation from "./pages/accountant/Quotation.jsx";
import AccountantQuotationHistory from "./pages/accountant/QuotationHistory.jsx";
import AdminDashboard from "./pages/admin/Dashboard.jsx";
import AdminUsers from "./pages/admin/Users.jsx";
import AdminDoctors from "./pages/admin/Doctors.jsx";
import AdminOrders from "./pages/admin/Orders.jsx";
import AnalystProfile from "./pages/analyst/Profile.jsx";
import AnalystHistory from "./pages/analyst/History.jsx";
import AnalystGenerate from "./pages/analyst/Generate.jsx";
import AnalystReports from "./pages/analyst/Reports.jsx";
import PrescriptionBill from "./pages/PrescriptionBill.jsx";
import Invoice from "./pages/Invoice.jsx";
import TermsAndConditions from "./pages/TermsAndConditions.jsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.jsx";
import NotFound from "./pages/NotFound.jsx";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Landing },
      { path: "login", Component: Login },
      { path: "register", Component: Register },
      { path: "forgot-password", Component: ForgotPassword },
      { path: "verify-otp", Component: VerifyOTP },
      { path: "reset-password", Component: ResetPassword },
      { path: "terms-and-conditions", Component: TermsAndConditions },
      { path: "terms-of-service", Component: TermsAndConditions },
      { path: "privacy-policy", Component: PrivacyPolicy },
      
      // User Routes
      { path: "user/services", Component: UserServices },
      { path: "user/upload/:serviceType", Component: UserUpload },
      { path: "user/shipping/:orderId", Component: UserShipping },
      { path: "user/payment/:serviceId", Component: UserPayment },
      { path: "user/pay/:orderId", Component: UserPayment },
      { path: "user/reject/:orderId", Component: UserPayment },
      { path: "user/status", Component: UserStatus },
      { path: "user/orders", Component: UserStatus },
      { path: "user/profile", Component: UserProfile },
      
      // Doctor Routes
      { path: "doctor/reports", Component: DoctorReports },
      { path: "doctor/history", Component: DoctorHistory },
      { path: "doctor/generate/:reportId", Component: DoctorGenerate },
      { path: "doctor/profile", Component: DoctorProfile },
      
      // Accountant Routes
      { path: "accountant/prescriptions", Component: AccountantPrescriptions },
      { path: "accountant/quotation", Component: AccountantQuotation },
      { path: "accountant/quotation/:prescriptionId", Component: AccountantQuotation },
      { path: "accountant/quotation-history", Component: AccountantQuotationHistory },
      
      // Admin Routes
      { path: "admin/dashboard", Component: AdminDashboard },
      { path: "admin/users", Component: AdminUsers },
      { path: "admin/doctors", Component: AdminDoctors },
      { path: "admin/orders", Component: AdminOrders },
      
      // Analyst Routes
      { path: "analyst/reports", Component: AnalystReports },
      { path: "analyst/profile", Component: AnalystProfile },
      { path: "analyst/history", Component: AnalystHistory },
      { path: "analyst/generate/:reportId", Component: AnalystGenerate },
      
      // Invoice Page
      { path: "/invoice", Component: Invoice },
      
      // Prescription Bill Preview
      { path: "/prescription-bill", Component: PrescriptionBill },
      
      { path: "*", Component: NotFound },
    ],
  },
]);
