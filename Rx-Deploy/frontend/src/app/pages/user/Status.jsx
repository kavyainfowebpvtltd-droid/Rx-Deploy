import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  Clock,
  CheckCircle,
  Package,
  FileText,
  Download,
  Loader2,
  RefreshCw,
  FilePlus,
  Receipt,
  Eye,
  Truck,
  MapPin,
  CreditCard,
  IndianRupee,
} from "lucide-react";
import Swal from "sweetalert2";
import { Navbar } from "../../components/Navbar.jsx";
import { Footer } from "../../components/Footer.jsx";
import {
  orderAPI,
  prescriptionAPI,
  documentAPI,
  authAPI,
  quotationAPI,
  getStoredUser,
  getToken,
} from "@/services/api.js";
import { API_BASE_URL } from "@/config/api.js";
import { formatCurrencyAmount } from "@/app/utils/pricing.js";
import { formatReportId } from "@/app/utils/reportId.js";
import { formatAppDate, formatAppDateTime } from "@/app/utils/dateFormat.js";

const getOrderCountry = (order) =>
  order?.deliveryCountry || order?.user?.country || "India";

const formatOrderAmount = (order) =>
  formatCurrencyAmount(
    parseFloat(order?.totalAmount || 0),
    getOrderCountry(order),
  );

const triggerBrowserDownload = (blob, fallbackFileName, response = null) => {
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  const contentDisposition = response?.headers?.get?.("content-disposition");
  const matchedFileName = contentDisposition?.match(/filename=\"?([^"]+)\"?/i)?.[1];

  link.href = objectUrl;
  link.download = matchedFileName || fallbackFileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();

  window.setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
  }, 1000);
};

const showScrollLockedModal = (options) => {
  const previousBodyOverflow = document.body.style.overflow;
  const previousHtmlOverflow = document.documentElement.style.overflow;

  return Swal.fire({
    ...options,
    heightAuto: false,
    scrollbarPadding: false,
    didOpen: (...args) => {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      options.didOpen?.(...args);
    },
    didClose: (...args) => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      options.didClose?.(...args);
    },
  });
};

export default function UserStatus() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [paidOrders, setPaidOrders] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState("orders"); // 'inquiries' or 'orders'

  // Filter orders based on tab and payment status
  const getFilteredOrders = () => {
    const isOnlinePharmacy = (order) => {
      const serviceType = getServiceType(order);
      return (
        serviceType.includes("Online Pharmacy") ||
        order.serviceType === "ONLINE_PHARMACY"
      );
    };

    if (activeTab === "inquiries") {
      return inquiries;
    } else {
      return paidOrders;
    }
  };

  useEffect(() => {
    // Check if user profile is complete - fetch from backend
    const checkProfileComplete = async () => {
      try {
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
            text: "Please complete your profile (including height and weight) to access all features.",
            confirmButtonColor: "#2563EB",
            confirmButtonText: "Complete Profile",
            allowOutsideClick: false,
          }).then((result) => {
            if (result.isConfirmed) {
              navigate("/user/profile");
            }
          });
        }

        // Also fetch orders with the user data
        fetchOrders(user);
      } catch (error) {
        console.error("Error checking profile:", error);
        navigate("/user/profile");
      }
    };

    checkProfileComplete();
  }, [refreshKey]);

  const refreshOrders = () => {
    setRefreshKey((prev) => prev + 1);
    fetchOrders();
  };

  const fetchOrders = async (userData = null) => {
    setLoading(true);
    try {
      // Get user from parameter or fetch from backend
      let user = userData;
      if (!user) {
        try {
          const userResponse = await authAPI.getCurrentUser();
          // Handle both axios response (response.data) and direct data
          user = userResponse.data || userResponse;
        } catch (e) {
          console.error("Error fetching user:", e);
        }
      }

      if (!user || !user.id) {
        console.log("No user found");
        setLoading(false);
        return;
      }

      console.log("Current user:", user);
      console.log("User ID:", user.id);

      try {
        const [inquiriesResponse, ordersResponse] = await Promise.all([
          orderAPI.getUserInquiries(user.id),
          orderAPI.getUserOrders(user.id),
        ]);

        const inquiryOrders = inquiriesResponse.data || inquiriesResponse || [];
        const successfulOrders = ordersResponse.data || ordersResponse || [];

        console.log("User inquiries fetched:", inquiryOrders);
        console.log("User paid orders fetched:", successfulOrders);

        setInquiries(inquiryOrders);
        setPaidOrders(successfulOrders);
        setOrders([...inquiryOrders, ...successfulOrders]);
      } catch (err) {
        console.error("Failed to fetch orders:", err);
        setInquiries([]);
        setPaidOrders([]);
        setOrders([]);
      }
    } catch (error) {
      console.error("Error in fetchOrders:", error);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper to get service type from order details
  const getServiceType = (order) => {
    // First check direct serviceType field (set by backend)
    if (order.serviceType) {
      if (order.serviceType === "PRESCRIPTION_ANALYSIS")
        return "Prescription Analysis";
      if (order.serviceType === "SECOND_OPINION") return "Second Opinion";
      if (order.serviceType === "ONLINE_PHARMACY") return "Online Pharmacy";
      return order.serviceType
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }

    // Fallback to parsing orderDetails
    try {
      if (order.orderDetails) {
        const details = JSON.parse(order.orderDetails);
        if (details.serviceType) {
          if (details.serviceType === "online-pharmacy") {
            return "Online Pharmacy";
          }
          return details.serviceType
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        }
        if (details.services) {
          const services = [];
          if (
            details.services["prescription-analysis"] ||
            details.services.prescriptionAnalysis
          ) {
            services.push("Prescription Analysis");
          }
          if (
            details.services["second-opinion"] ||
            details.services.secondOpinion
          ) {
            services.push("Second Opinion");
          }
          if (
            details.services["online-pharmacy"] ||
            details.services.onlinePharmacy
          ) {
            services.push("Online Pharmacy");
          }
          if (services.length > 0) return services.join(" + ");
        }
      }
    } catch (e) {
      console.error("Error parsing order details:", e);
    }
    return "Order";
  };

  const hasGeneratedOnlinePharmacyBill = (order) => {
    const orderStatus = (order.status || "").toString().toUpperCase().trim();

    return (
      orderStatus === "SENT" ||
      orderStatus === "ACCEPTED" ||
      Boolean(order.billFilePath) ||
      Boolean(order.quotationNumber) ||
      Number(order.totalAmount || 0) > 0
    );
  };

  const isPrescriptionDownloadService = (order) => {
    const serviceType = getServiceType(order);
    return (
      serviceType.includes("Prescription Analysis") ||
      serviceType.includes("Second Opinion") ||
      order.serviceType === "PRESCRIPTION_ANALYSIS" ||
      order.serviceType === "SECOND_OPINION"
    );
  };

  const hasDoctorPrescriptionReady = (order) =>
    Boolean((order?.prescriptionPath || "").toString().trim());

  const hasDoctorReportReady = (order) =>
    order?.medicalReportStatus === "COMPLETED" ||
    Boolean((order?.medicalReportFilePath || "").toString().trim()) ||
    hasDoctorPrescriptionReady(order);

  const getStatusBadge = (order) => {
    const normalizedStatus = getUserFacingStatus(order);

    if (normalizedStatus === "Completed") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
          <CheckCircle className="w-4 h-4" />
          Completed
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
        <Clock className="w-4 h-4" />
        Pending
      </span>
    );
  };

  const getUserFacingStatus = (order) => {
    const status = order?.status;

    if (isPrescriptionDownloadService(order) && !hasDoctorReportReady(order)) {
      return "Pending";
    }

    switch (status) {
      case "COMPLETED":
      case "DELIVERED":
      case "SENT":
      case "ACCEPTED":
        return "Completed";
      case "DRAFT":
      case "IN_REVIEW":
      case "SUBMITTED":
      case "APPROVED":
      case "PROCESSING":
      case "PENDING":
      case "NOT_STARTED":
      default:
        return "Pending";
    }
  };

  // Handle viewing the prescription
  const handleViewPrescription = async (order) => {
    try {
      Swal.fire({
        title: "Loading Prescription",
        text: "Please wait...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // Use direct fetch like admin page
      const token = getToken();
      const response = await fetch(
        `${API_BASE_URL}/orders/${order.id}/prescription/view`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/pdf")) {
          const blob = await response.blob();
          const pdfUrl = URL.createObjectURL(blob);
          const newWindow = window.open("", "_blank");
          if (newWindow) {
            newWindow.location.href = pdfUrl;
          }
          Swal.close();
        } else {
          const data = await response.json();
          Swal.close();
          Swal.fire({
            icon: "warning",
            title:
              data.hasPrescription === false
                ? "Prescription Not Available"
                : "Error",
            text: data.message || data.error || "Unable to view prescription.",
            confirmButtonColor: "#2563EB",
          });
        }
      } else {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          Swal.close();
          Swal.fire({
            icon: "error",
            title: "Error",
            text: data.message || data.error || "Failed to load prescription",
            confirmButtonColor: "#2563EB",
          });
        } else {
          Swal.close();
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "Failed to load prescription",
            confirmButtonColor: "#2563EB",
          });
        }
      }
    } catch (error) {
      console.error("Error viewing prescription:", error);
      Swal.close();
      Swal.fire({
        icon: "error",
        title: "View Failed",
        text: "Unable to view prescription. Please try again later.",
        confirmButtonColor: "#2563EB",
      });
    }
  };

  // Handle bill PDF download - check documents first, then fall back to order bill path
  const handleDownloadBill = async (order) => {
    try {
      Swal.fire({
        title: "Loading Bill",
        text: "Please wait...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // For Prescription Analysis and Second Opinion, generate the receipt first if not exists
      const isPrescriptionOrOpinion =
        order.serviceType === "PRESCRIPTION_ANALYSIS" ||
        order.serviceType === "SECOND_OPINION";

      if (isPrescriptionOrOpinion) {
        try {
          // Try to generate the receipt first
          console.log("Generating payment receipt for order:", order.id);
          const generateResponse = await orderAPI.generateReceipt(order.id);
          console.log("Generate receipt response:", generateResponse);
        } catch (generateError) {
          console.error("Error generating receipt:", generateError);
          // Continue anyway - the receipt might already exist
        }
      }

      // Try to get bill from documents
      let docs = [];
      try {
        const response = await documentAPI.getDocumentsByOrder(order.id);
        docs = response?.data || response || [];
      } catch (e) {
        console.log("No documents by order:", e.message);
      }

      // If no documents by order, try by user and category
      if (docs.length === 0 && order.user?.id) {
        try {
          const userResponse = await documentAPI.getDocumentsByUserAndCategory(
            order.user.id,
            "BILL",
          );
          docs = userResponse?.data || userResponse || [];
        } catch (e) {
          console.log("No documents by user and category:", e.message);
        }
      }

      // Find bill documents
      const billDocs = docs.filter((doc) => doc.category === "BILL");

      if (billDocs.length > 0) {
        // Get the first bill document
        const billDoc = billDocs[0];

        // If fileData is not present, fetch it
        if (!billDoc.fileData && billDoc.id) {
          const docResponse = await documentAPI.getDocumentWithData(billDoc.id);
          const result = docResponse?.data || docResponse;
          if (result.fileData) {
            billDoc.fileData = result.fileData;
            billDoc.mimeType = result.document?.mimeType || billDoc.mimeType;
          }
        }

        if (billDoc.fileData) {
          const link = document.createElement("a");
          link.href = `data:${billDoc.mimeType || "application/pdf"};base64,${billDoc.fileData}`;
          link.download =
            billDoc.originalFileName || `bill_${order.orderNumber}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          Swal.fire({
            icon: "success",
            title: "Downloaded!",
            text: "Receipt PDF has been downloaded.",
            confirmButtonColor: "#2563EB",
          });
        } else {
          Swal.close();
          Swal.fire({
            icon: "warning",
            title: "Receipt Not Available",
            text: "Receipt document content is not available",
            confirmButtonColor: "#2563EB",
          });
        }
      } else {
        // Try the new receipt download endpoint first
        try {
          const receiptResponse = await orderAPI.downloadReceipt(order.id);
          if (receiptResponse.ok) {
            const blob = await receiptResponse.blob();
            triggerBrowserDownload(
              blob,
              `Payment_Receipt_${order.orderNumber}.pdf`,
              receiptResponse,
            );

            Swal.fire({
              icon: "success",
              title: "Downloaded!",
              text: "Payment receipt has been downloaded.",
              confirmButtonColor: "#2563EB",
            });
            return;
          }
        } catch (receiptError) {
          console.log(
            "Receipt download failed, trying bill endpoint:",
            receiptError,
          );
        }

        // Fall back to the order's bill path
        const pathResponse = await orderAPI.getBillPath(order.id);
        const billPathData = pathResponse?.data || pathResponse;

        if (!billPathData || !billPathData.hasBill) {
          Swal.close();
          Swal.fire({
            icon: "warning",
            title: "Receipt Not Available",
            text: "The payment receipt has not been generated yet. Please try again or contact support.",
            confirmButtonColor: "#2563EB",
          });
          return;
        }

        // Download the existing bill
        const response = await orderAPI.downloadBill(order.id);
        if (response.ok) {
          const blob = await response.blob();
          triggerBrowserDownload(
            blob,
            `Payment_Receipt_${order.orderNumber}.pdf`,
            response,
          );

          Swal.fire({
            icon: "success",
            title: "Downloaded!",
            text: "Payment receipt has been downloaded.",
            confirmButtonColor: "#2563EB",
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Download Failed",
            text: "Unable to download receipt.",
            confirmButtonColor: "#2563EB",
          });
        }
      }
    } catch (error) {
      console.error("Error downloading bill:", error);
      Swal.fire({
        icon: "error",
        title: "Download Failed",
        text: "Unable to download receipt. Please try again later.",
        confirmButtonColor: "#2563EB",
      });
    }
  };

  // Handle viewing the bill PDF
  const handleViewBill = async (order) => {
    try {
      Swal.fire({
        title: "Loading Bill",
        text: "Please wait...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // For Prescription Analysis and Second Opinion, generate the receipt first if not exists
      const isPrescriptionOrOpinion =
        order.serviceType === "PRESCRIPTION_ANALYSIS" ||
        order.serviceType === "SECOND_OPINION";

      if (isPrescriptionOrOpinion) {
        try {
          // Try to generate the receipt first
          console.log("Generating payment receipt for order:", order.id);
          const generateResponse = await orderAPI.generateReceipt(order.id);
          console.log("Generate receipt response:", generateResponse);
        } catch (generateError) {
          console.error("Error generating receipt:", generateError);
          // Continue anyway - the receipt might already exist
        }
      }

      // Try to get bill from documents
      let docs = [];
      try {
        const response = await documentAPI.getDocumentsByOrder(order.id);
        docs = response?.data || response || [];
      } catch (e) {
        console.log("No documents by order:", e.message);
      }

      // If no documents by order, try by user and category
      if (docs.length === 0 && order.user?.id) {
        try {
          const userResponse = await documentAPI.getDocumentsByUserAndCategory(
            order.user.id,
            "BILL",
          );
          docs = userResponse?.data || userResponse || [];
        } catch (e) {
          console.log("No documents by user and category:", e.message);
        }
      }

      // Find bill documents
      const billDocs = docs.filter((doc) => doc.category === "BILL");

      if (billDocs.length > 0) {
        // Get the first bill document
        const billDoc = billDocs[0];

        // If fileData is not present, fetch it
        if (!billDoc.fileData && billDoc.id) {
          const docResponse = await documentAPI.getDocumentWithData(billDoc.id);
          const result = docResponse?.data || docResponse;
          if (result.fileData) {
            billDoc.fileData = result.fileData;
            billDoc.mimeType = result.document?.mimeType || billDoc.mimeType;
          }
        }

        if (billDoc.fileData) {
          // Show in new window
          const pdfData = base64ToBlob(
            billDoc.fileData,
            billDoc.mimeType || "application/pdf",
          );
          const pdfUrl = URL.createObjectURL(pdfData);
          const newWindow = window.open("", "_blank");
          if (newWindow) {
            newWindow.location.href = pdfUrl;
          }
          Swal.close();
        } else {
          Swal.close();
          Swal.fire({
            icon: "warning",
            title: "No Receipt",
            text: "Receipt document content is not available",
            confirmButtonColor: "#2563EB",
          });
        }
      } else {
        // Try the new receipt view endpoint first
        try {
          const receiptResponse = await orderAPI.viewReceipt(order.id);
          if (receiptResponse.ok) {
            const blob = await receiptResponse.blob();
            const url = window.URL.createObjectURL(blob);
            const newWindow = window.open("", "_blank");
            if (newWindow) {
              newWindow.location.href = url;
            }
            Swal.close();
            return;
          }
        } catch (receiptError) {
          console.log(
            "Receipt view failed, trying bill endpoint:",
            receiptError,
          );
        }

        // Fall back to the order's bill path
        const pathResponse = await orderAPI.getBillPath(order.id);
        const billPathData = pathResponse?.data || pathResponse;

        if (!billPathData || !billPathData.hasBill) {
          Swal.close();
          Swal.fire({
            icon: "warning",
            title: "Receipt Not Available",
            text: "The payment receipt has not been generated yet. Please try again or contact support.",
            confirmButtonColor: "#2563EB",
          });
          return;
        }

        // View the bill PDF
        const response = await orderAPI.viewBill(order.id);
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const newWindow = window.open("", "_blank");
          if (newWindow) {
            newWindow.location.href = url;
          }
          Swal.close();
        } else {
          Swal.fire({
            icon: "error",
            title: "View Failed",
            text: "Unable to view receipt.",
            confirmButtonColor: "#2563EB",
          });
        }
      }
    } catch (error) {
      console.error("Error viewing bill:", error);
      Swal.fire({
        icon: "error",
        title: "View Failed",
        text: "Unable to view receipt. Please try again later.",
        confirmButtonColor: "#2563EB",
      });
    }
  };

  // Helper function to convert base64 to blob
  const base64ToBlob = (base64, mimeType) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  // Handle downloading the prescription
  const handleDownloadPrescription = async (order) => {
    try {
      Swal.fire({
        title: "Loading Prescription",
        text: "Please wait...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // Use direct fetch like admin page
      const token = getToken();
      const response = await fetch(
        `${API_BASE_URL}/orders/${order.id}/prescription/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/pdf")) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `Prescription_${order.orderNumber}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);

          Swal.fire({
            icon: "success",
            title: "Downloaded!",
            text: "Prescription PDF has been downloaded.",
            confirmButtonColor: "#2563EB",
          });
        } else {
          const data = await response.json();
          Swal.close();
          Swal.fire({
            icon: "warning",
            title:
              data.hasPrescription === false
                ? "Prescription Not Available"
                : "Error",
            text:
              data.message || data.error || "Unable to download prescription.",
            confirmButtonColor: "#2563EB",
          });
        }
      } else {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          Swal.close();
          Swal.fire({
            icon: "error",
            title: "Error",
            text:
              data.message || data.error || "Failed to download prescription",
            confirmButtonColor: "#2563EB",
          });
        } else {
          Swal.close();
          Swal.fire({
            icon: "error",
            title: "Download Failed",
            text: "Unable to download prescription.",
            confirmButtonColor: "#2563EB",
          });
        }
      }
    } catch (error) {
      console.error("Error downloading prescription:", error);
      Swal.close();
      Swal.fire({
        icon: "error",
        title: "Download Failed",
        text: "Unable to download prescription. Please try again later.",
        confirmButtonColor: "#2563EB",
      });
    }
  };

  // Handle viewing the medical report
  const handleViewReport = async (order) => {
    try {
      Swal.fire({
        title: "Loading Report",
        text: "Please wait...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // Use direct fetch like admin page
      const token = getToken();
      const response = await fetch(
        `${API_BASE_URL}/orders/${order.id}/medical-report/view`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/pdf")) {
          const blob = await response.blob();
          const pdfUrl = URL.createObjectURL(blob);
          const newWindow = window.open("", "_blank");
          if (newWindow) {
            newWindow.location.href = pdfUrl;
          }
          Swal.close();
        } else {
          const data = await response.json();
          Swal.close();
          Swal.fire({
            icon: "warning",
            title: data.hasReport === false ? "Report Not Available" : "Error",
            text: data.message || data.error || "Unable to view report.",
            confirmButtonColor: "#2563EB",
          });
        }
      } else {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          Swal.close();
          Swal.fire({
            icon: "error",
            title: "Error",
            text: data.message || data.error || "Failed to load report",
            confirmButtonColor: "#2563EB",
          });
        } else {
          Swal.close();
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "Failed to load report",
            confirmButtonColor: "#2563EB",
          });
        }
      }
    } catch (error) {
      console.error("Error viewing report:", error);
      Swal.close();
      Swal.fire({
        icon: "error",
        title: "View Failed",
        text: "Unable to view report. Please try again later.",
        confirmButtonColor: "#2563EB",
      });
    }
  };

  // Handle downloading the medical report
  const handleDownloadReport = async (order) => {
    try {
      Swal.fire({
        title: "Loading Report",
        text: "Please wait...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // Use direct fetch like admin page
      const token = getToken();
      const response = await fetch(
        `${API_BASE_URL}/orders/${order.id}/medical-report/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/pdf")) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `Medical_Report_${order.orderNumber}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);

          Swal.fire({
            icon: "success",
            title: "Downloaded!",
            text: "Medical report PDF has been downloaded.",
            confirmButtonColor: "#2563EB",
          });
        } else {
          const data = await response.json();
          Swal.close();
          Swal.fire({
            icon: "warning",
            title: data.hasReport === false ? "Report Not Available" : "Error",
            text: data.message || data.error || "Unable to download report.",
            confirmButtonColor: "#2563EB",
          });
        }
      } else {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          Swal.close();
          Swal.fire({
            icon: "error",
            title: "Error",
            text: data.message || data.error || "Failed to download report",
            confirmButtonColor: "#2563EB",
          });
        } else {
          Swal.close();
          Swal.fire({
            icon: "error",
            title: "Download Failed",
            text: "Unable to download report.",
            confirmButtonColor: "#2563EB",
          });
        }
      }
    } catch (error) {
      console.error("Error downloading report:", error);
      Swal.close();
      Swal.fire({
        icon: "error",
        title: "Download Failed",
        text: "Unable to download report. Please try again later.",
        confirmButtonColor: "#2563EB",
      });
    }
  };

  // Handle Pay Bill functionality - check login and navigate to payment
  const handlePayBill = (order) => {
    // Check if user is logged in
    const token = getToken();
    const storedUser = getStoredUser();

    if (!token || !storedUser) {
      // Not logged in - redirect to login with return URL
      Swal.fire({
        icon: "info",
        title: "Login Required",
        text: "Please login to make payment",
        confirmButtonColor: "#2563EB",
      }).then(() => {
        // Store the order ID for redirect after login
        sessionStorage.setItem("pendingOrderForPayment", JSON.stringify(order));
        sessionStorage.setItem("redirectAfterLogin", `/user/pay/${order.id}`);
        navigate("/login");
      });
      return;
    }

    // User is logged in - proceed directly to payment
    sessionStorage.setItem("pendingOrderForPayment", JSON.stringify(order));
    navigate(`/user/pay/${order.id}`);
  };

  const handleDownloadQuotation = async (order) => {
    try {
      Swal.fire({
        title: "Loading Quotation",
        text: "Please wait...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const quotationResponse = await quotationAPI.getQuotationByOrderId(
        order.id,
      );
      const quotation = quotationResponse?.data || quotationResponse;

      if (!quotation) {
        Swal.fire({
          icon: "warning",
          title: "Quotation Not Available",
          text: "This quotation has not been generated yet.",
          confirmButtonColor: "#2563EB",
        });
        return;
      }

      const fileName = `Quotation_${order.orderNumber || order.id}_${new Date().toISOString().split("T")[0]}.pdf`;
      const response = await quotationAPI.downloadPdfByOrderId(order.id);

      if (!response.ok) {
        throw new Error(`Failed to download quotation PDF: ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);

      Swal.fire({
        icon: "success",
        title: "Downloaded!",
        text: "Quotation PDF has been downloaded.",
        confirmButtonColor: "#2563EB",
      });
    } catch (error) {
      console.error("Error downloading quotation:", error);
      const statusCode = error?.response?.status;
      Swal.fire({
        icon: "error",
        title:
          statusCode === 404 ? "Quotation Not Available" : "Download Failed",
        text:
          statusCode === 404
            ? "This quotation has not been generated yet."
            : "Unable to download quotation. Please try again later.",
        confirmButtonColor: "#2563EB",
      });
    }
  };

  // Handle View Order Details
  const handleViewOrderDetails = async (order) => {
    // Parse order details if available
    let orderDetails = {};
    try {
      if (order.orderDetails) {
        orderDetails = JSON.parse(order.orderDetails);
      }
    } catch (e) {
      console.error("Error parsing order details:", e);
    }

    let uploadedDocuments = [];
    try {
      const documentsResponse = await documentAPI.getDocumentsByOrder(order.id);
      uploadedDocuments = documentsResponse?.data || documentsResponse || [];
    } catch (error) {
      console.error("Error fetching order documents:", error);
    }

    if (
      uploadedDocuments.length === 0 &&
      Array.isArray(orderDetails.documentIds) &&
      orderDetails.documentIds.length > 0
    ) {
      try {
        const documentResponses = await Promise.all(
          orderDetails.documentIds.map((documentId) =>
            documentAPI.getDocumentById(documentId),
          ),
        );

        uploadedDocuments = documentResponses
          .map((response) => response?.data || response)
          .filter(Boolean);
      } catch (error) {
        console.error("Error fetching documents by ids:", error);
      }
    }

    // Build uploaded documents info
    let uploadedDocs = "";
    if (uploadedDocuments.length > 0) {
      uploadedDocs += uploadedDocuments
        .map((document) => {
          const documentName =
            document.originalFileName ||
            document.fileName ||
            document.name ||
            `Document #${document.id}`;
          const documentCategory = document.category
            ? document.category
                .toString()
                .replace(/_/g, " ")
                .replace(/([a-z])([A-Z])/g, "$1 $2")
            : "Uploaded Document";

          return `<div class="bg-gray-50 p-3 rounded-lg mb-2">
        <p class="text-sm font-semibold text-[#1E3A8A]">${documentCategory}:</p>
        <p class="text-sm text-gray-600">${documentName}</p>
      </div>`;
        })
        .join("");
    }
    if (order.prescriptionPath) {
      uploadedDocs += `<div class="bg-gray-50 p-3 rounded-lg mb-2">
        <p class="text-sm font-semibold text-[#1E3A8A]">📄 Prescription:</p>
        <p class="text-sm text-gray-600">${order.prescriptionPath.split("/").pop()}</p>
      </div>`;
    }
    if (order.medicalReportPath) {
      uploadedDocs += `<div class="bg-gray-50 p-3 rounded-lg mb-2">
        <p class="text-sm font-semibold text-[#1E3A8A]">📋 Medical Report:</p>
        <p class="text-sm text-gray-600">${order.medicalReportPath.split("/").pop()}</p>
      </div>`;
    }
    if (!uploadedDocs) {
      uploadedDocs =
        '<p class="text-sm text-gray-500">No documents uploaded</p>';
    }

    // Build payment info
    let paymentInfo = "";
    if (order.paymentStatus === "PAID") {
      paymentInfo = `<div class="bg-green-50 p-3 rounded-lg mb-2">
        <p class="text-sm font-semibold text-green-700">✅ Payment Status: Paid</p>
        <p class="text-sm text-gray-600">Amount: ${formatOrderAmount(order)}</p>
        ${order.paymentMethod ? `<p class="text-sm text-gray-600">Method: ${order.paymentMethod}</p>` : ""}
      </div>`;
    } else {
      paymentInfo = `<div class="bg-yellow-50 p-3 rounded-lg mb-2">
        <p class="text-sm font-semibold text-yellow-700">⏳ Payment Status: Pending</p>
        <p class="text-sm text-gray-600">Amount: ${formatOrderAmount(order)}</p>
      </div>`;
    }

    showScrollLockedModal({
      title: "📦 Order Details",
      html: `
        <div class="text-left">
          <!-- Order Info -->
          <div class="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] p-4 rounded-lg text-white mb-4">
            <p class="text-sm opacity-80">Report ID</p>
            <p class="text-lg font-bold">${formatReportId(order.orderNumber || order.id)}</p>
            <p class="text-sm opacity-80 mt-2">Service Type</p>
            <p class="font-semibold">${getServiceType(order)}</p>
          </div>
          <!-- Uploaded Documents -->
          <div class="mb-4">
            <p class="text-sm font-semibold text-[#1E3A8A] mb-2">📁 Uploaded Documents:</p>
            ${uploadedDocs}
          </div>

          <!-- Payment Info -->
          <div class="mb-4">
            <p class="text-sm font-semibold text-[#1E3A8A] mb-2">💳 Payment Information:</p>
            ${paymentInfo}
          </div>

          <!-- Delivery Address (if online pharmacy) -->
          ${
            order.deliveryAddress
              ? `
          <div class="bg-gray-50 p-3 rounded-lg mb-4">
            <p class="text-sm font-semibold text-[#1E3A8A] mb-1">📍 Delivery Address:</p>
            <p class="text-sm text-gray-600">${order.deliveryAddress}</p>
            ${order.deliveryCity ? `<p class="text-sm text-gray-600">${order.deliveryCity}, ${order.deliveryState} - ${order.deliveryPincode}</p>` : ""}
          </div>
          `
              : ""
          }
        </div>
      `,
      confirmButtonColor: "#2563EB",
      confirmButtonText: "Close",
      width: "500px",
    });
  };

  // Handle View Delivery Tracking
  const handleViewDelivery = (order) => {
    const deliverySteps = [
      {
        status: "Order Placed",
        date: order.createdAt,
        completed: true,
        icon: "📦",
      },
      {
        status: "Payment Received",
        date: order.paymentStatus === "PAID" ? order.updatedAt : null,
        completed: order.paymentStatus === "PAID",
        icon: "💳",
      },
      {
        status: "Processing",
        date:
          order.deliveryStatus === "PROCESSING" ||
          order.deliveryStatus === "SHIPPED" ||
          order.deliveryStatus === "DELIVERED"
            ? order.updatedAt
            : null,
        completed:
          order.deliveryStatus === "PROCESSING" ||
          order.deliveryStatus === "SHIPPED" ||
          order.deliveryStatus === "DELIVERED",
        icon: "⚙️",
      },
      {
        status: "Shipped",
        date:
          order.deliveryStatus === "SHIPPED" ||
          order.deliveryStatus === "DELIVERED"
            ? order.updatedAt
            : null,
        completed:
          order.deliveryStatus === "SHIPPED" ||
          order.deliveryStatus === "DELIVERED",
        icon: "🚚",
      },
      {
        status: "Delivered",
        date: order.deliveryStatus === "DELIVERED" ? order.updatedAt : null,
        completed: order.deliveryStatus === "DELIVERED",
        icon: "✅",
      },
    ];

    const currentStep = deliverySteps.findIndex((s) => !s.completed);

    const stepsHtml = deliverySteps
      .map(
        (step, index) => `
      <div class="flex items-center gap-4 mb-6 relative ${step.completed ? "text-green-600" : index === currentStep ? "text-blue-600" : "text-gray-400"}">
        ${
          index < deliverySteps.length - 1
            ? `
          <div class="absolute left-4 top-10 w-0.5 h-8 ${step.completed ? "bg-green-500" : "bg-gray-200"}"></div>
        `
            : ""
        }
        <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg ${step.completed ? "bg-green-100" : index === currentStep ? "bg-blue-100" : "bg-gray-100"}">
          ${step.completed ? "✓" : step.icon}
        </div>
        <div class="flex-1">
          <p class="font-semibold ${index === currentStep ? "text-blue-600" : ""}">${step.status}</p>
          ${step.date ? `<p class="text-xs text-gray-500">${formatAppDateTime(step.date)}</p>` : ""}
        </div>
        ${step.completed ? '<span class="text-green-500">✓</span>' : ""}
      </div>
    `,
      )
      .join("");

    showScrollLockedModal({
      title: "📍 Delivery Tracking",
      html: `
        <div class="text-left">
          <!-- Order Info -->
          <div class="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] p-4 rounded-lg text-white mb-4">
            <p class="text-sm opacity-80">Report ID</p>
            <p class="text-lg font-bold">${formatReportId(order.orderNumber || order.id)}</p>
          </div>
          
          <!-- Delivery Address -->
          <div class="bg-gray-50 p-3 rounded-lg mb-4">
            <p class="text-sm font-semibold text-[#1E3A8A] mb-1">📍 Delivery Address:</p>
            <p class="text-sm text-gray-600">${order.deliveryAddress || order.user?.address || "Not provided"}</p>
          </div>
          
          <!-- Tracking Steps -->
          <div class="border border-gray-200 rounded-lg p-4">
            ${stepsHtml}
          </div>
          
          <!-- Help -->
          <p class="text-xs text-gray-500 mt-4 text-center">Need help? Contact us at support@rxincredible.com</p>
        </div>
      `,
      confirmButtonColor: "#2563EB",
      confirmButtonText: "Close",
      width: "500px",
    });
  };

  if (loading) {
    return (
      <>
        <Navbar role="user" />
        <div className="flex-1 flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-[#2563EB] animate-spin" />
        </div>
        <Footer />
      </>
    );
  }

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
            className="mb-8"
          >
            <h1 className="text-3xl sm:text-4xl text-[#1E3A8A] mb-4">My Orders</h1>
            <div className="flex items-center gap-4">
              <p className="text-xl text-gray-600">Track your orders</p>
              <button
                onClick={refreshOrders}
                className="flex items-center gap-1 px-3 py-1 text-sm text-[#2563EB] hover:text-[#1E3A8A] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </motion.div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab("orders")}
                className={`px-6 py-3 text-lg font-medium transition-all duration-200 border-b-2 ${
                  activeTab === "orders"
                    ? "border-[#2563EB] text-[#2563EB]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Orders
                </span>
              </button>
              <button
                onClick={() => setActiveTab("inquiries")}
                className={`px-6 py-3 text-lg font-medium transition-all duration-200 border-b-2 ${
                  activeTab === "inquiries"
                    ? "border-[#2563EB] text-[#2563EB]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Enquiry
                </span>
              </button>
            </div>
            <p className="text-gray-600 mt-2">
              {activeTab === "orders"
                ? "Paid orders and other services"
                : "Online Pharmacy inquiries pending payment"}
            </p>
          </div>

          {/* Orders List */}
          <div className="space-y-6">
            {getFilteredOrders().map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Order Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] rounded-xl flex items-center justify-center">
                          <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl text-[#1E3A8A]">
                            {getServiceType(order)}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Report ID: {formatReportId(order.orderNumber || order.id)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <span>
                          Date:{" "}
                          {formatAppDate(order.createdAt)}
                        </span>
                        {(getServiceType(order).includes("Online Pharmacy") ||
                          getServiceType(order).includes(
                            "Prescription Analysis",
                          ) ||
                          getServiceType(order).includes("Second Opinion")) &&
                          order.totalAmount > 0 && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-[#1E3A8A]">
                                Amount: {formatOrderAmount(order)}
                              </span>
                            </>
                          )}
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      {getStatusBadge(order)}
                      {/* View Details Button */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleViewOrderDetails(order)}
                        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white rounded-xl hover:shadow-lg transition-all duration-200 text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </motion.button>

                      {/* Pay Bill Button - show for unpaid Online Pharmacy orders in Inquiries tab */}
                      {activeTab === "inquiries" &&
                        (getServiceType(order).includes("Online Pharmacy") ||
                          order.serviceType === "ONLINE_PHARMACY") &&
                        order.paymentStatus !== "PAID" &&
                        hasGeneratedOnlinePharmacyBill(order) && (
                          <div className="flex flex-wrap gap-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleDownloadQuotation(order)}
                              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[#0F766E] to-[#0EA5A4] text-white rounded-xl hover:shadow-lg transition-all duration-200 text-sm"
                            >
                              <FilePlus className="w-4 h-4" />
                              Download Quotation
                            </motion.button>

                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handlePayBill(order)}
                              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#2563EB] to-[#1E3A8A] text-white rounded-xl hover:shadow-lg transition-all duration-200 text-sm"
                            >
                              <CreditCard className="w-4 h-4" />
                              Pay Now
                            </motion.button>
                          </div>
                        )}
                      {/* Download Receipt Button - only show when order is paid and has bill amount */}
                      {(getServiceType(order).includes("Online Pharmacy") ||
                        getServiceType(order).includes(
                          "Prescription Analysis",
                        ) ||
                        getServiceType(order).includes("Second Opinion")) &&
                        order.totalAmount > 0 &&
                        order.paymentStatus === "PAID" && (
                          <div className="flex flex-wrap gap-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleDownloadBill(order)}
                              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[#059669] to-[#10B981] text-white rounded-xl hover:shadow-lg transition-all duration-200 text-sm"
                            >
                              <Download className="w-4 h-4" />
                              {getServiceType(order).includes(
                                "Online Pharmacy",
                              ) || order.serviceType === "ONLINE_PHARMACY"
                                ? "Download Bill"
                                : "Download Receipt"}
                            </motion.button>

                            {(getServiceType(order).includes(
                              "Online Pharmacy",
                            ) ||
                              order.serviceType === "ONLINE_PHARMACY") &&
                              hasGeneratedOnlinePharmacyBill(order) && (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleDownloadQuotation(order)}
                                  className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[#0F766E] to-[#0EA5A4] text-white rounded-xl hover:shadow-lg transition-all duration-200 text-sm"
                                >
                                  <FilePlus className="w-4 h-4" />
                                  Download Quotation
                                </motion.button>
                              )}
                          </div>
                        )}
                      {/* Download Analysis Report Button - only show after doctor prescription PDF is ready */}
                      {isPrescriptionDownloadService(order) &&
                        hasDoctorPrescriptionReady(order) && (
                          <>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleDownloadPrescription(order)}
                              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[#059669] to-[#10B981] text-white rounded-xl hover:shadow-lg transition-all duration-200 text-sm"
                            >
                              <Download className="w-4 h-4" />
                              Download Analysis Report
                            </motion.button>
                          </>
                        )}
                    </div>
                  </div>

                  {/* Progress Bar (for processing orders) */}
                  {(order.status === "PROCESSING" ||
                    order.status === "APPROVED") && (
                    <div className="mt-6">
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Processing your request</span>
                        <span>65%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: "65%" }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] h-2 rounded-full"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Empty State (if no orders in current tab) */}
          {getFilteredOrders().length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="bg-white rounded-3xl shadow-lg p-12 text-center"
            >
              <Package className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <h3 className="text-2xl text-gray-700 mb-2">No Orders Yet</h3>
              <p className="text-gray-500 mb-6">Start by selecting a service</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/user/services")}
                className="px-5 sm:px-8 py-3 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white rounded-xl hover:shadow-lg transition-all duration-200"
              >
                Browse Services
              </motion.button>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}

