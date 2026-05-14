import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Wallet,
  Eye,
  X,
  User,
  Calendar,
  Package,
  CreditCard,
  MapPin,
  Phone,
  Mail,
  Loader2,
  Receipt,
  Send,
  Download,
  FilePlus,
} from "lucide-react";
import { Navbar } from "../../components/Navbar";
import { Footer } from "../../components/Footer";
import { CustomSelect } from "../../components/CustomSelect";
import { TablePagination } from "../../components/TablePagination.jsx";
import Swal from "sweetalert2";
import {
  orderAPI,
  userAPI,
  prescriptionAPI,
  documentAPI,
  quotationAPI,
  getToken,
} from "@/services/api.js";
import { API_BASE_URL } from "@/config/api.js";

const SEARCH_ALLOWED_CHARACTERS = /^[a-zA-Z0-9\s-]*$/;
const TABLE_PAGE_SIZE = 10;

const sanitizeSearchValue = (value) => value.replace(/[^a-zA-Z0-9\s-]/g, "");

const formatOrderAmount = (order) => {
  if (order?.displayAmount) {
    return order.displayAmount;
  }

  const amount = parseFloat(order?.totalAmount || 0).toLocaleString();
  const symbol = order?.currencySymbol || "₹";
  return `${symbol}${amount}`;
};

const getStatusBucket = (status) => {
  switch (status) {
    case "DRAFT":
    case "IN_REVIEW":
    case "SUBMITTED":
    case "APPROVED":
    case "PROCESSING":
      return "PROCESSING";
    case "COMPLETED":
      return "COMPLETED";
    case "PENDING":
      return "PENDING";
    case "REJECTED":
      return "REJECTED";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return status || "PENDING";
  }
};

const getOrderTimestamp = (order) => {
  const timestamp = new Date(
    order?.updatedAt ||
      order?.createdAt ||
      order?.orderDate ||
      order?.created_date ||
      0,
  ).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
};

export default function AdminOrders() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [analysts, setAnalysts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchError, setSearchError] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterService, setFilterService] = useState("all");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [showAnalystModal, setShowAnalystModal] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [selectedSpecialization, setSelectedSpecialization] = useState("all");
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [prescriptionStatus, setPrescriptionStatus] = useState({});
  const [selectedPriority, setSelectedPriority] = useState("MEDIUM");
  const [assigningDoctorId, setAssigningDoctorId] = useState(null);
  const [assigningAnalystId, setAssigningAnalystId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Download Bill PDF - from documents
  const handleDownloadBillFromDocuments = async (orderId) => {
    try {
      // First try to get documents by order ID
      let docs = [];
      try {
        const response = await documentAPI.getDocumentsByOrder(orderId);
        docs = response.data || response || [];
      } catch (e) {
        console.log("No documents by order:", e.message);
      }

      // If no documents by order, try by user and category
      if (docs.length === 0 && selectedOrder?.user?.id) {
        try {
          const userResponse = await documentAPI.getDocumentsByUserAndCategory(
            selectedOrder.user.id,
            "BILL",
          );
          docs = userResponse.data || userResponse || [];
        } catch (e) {
          console.log("No documents by user and category:", e.message);
        }
      }

      // If still no documents, try all documents for this user
      if (docs.length === 0 && selectedOrder?.user?.id) {
        try {
          const userResponse = await documentAPI.getDocumentsByUser(
            selectedOrder.user.id,
          );
          docs = userResponse.data || userResponse || [];
        } catch (e) {
          console.log("No documents by user:", e.message);
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
          const result = docResponse.data || docResponse;
          if (result.fileData) {
            billDoc.fileData = result.fileData;
            billDoc.mimeType = result.document?.mimeType || billDoc.mimeType;
          }
        }

        if (billDoc.fileData) {
          const link = document.createElement("a");
          link.href = `data:${billDoc.mimeType || "application/pdf"};base64,${billDoc.fileData}`;
          link.download = billDoc.originalFileName || `bill_${orderId}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          Swal.fire({
            title: "No Bill",
            text: "Bill document content is not available",
            icon: "info",
            confirmButtonText: "OK",
          });
        }
      } else {
        // Try the order's bill path
        await handleDownloadBill(orderId);
      }
    } catch (error) {
      console.error("Error downloading bill from documents:", error);
      // Fallback to order bill
      await handleDownloadBill(orderId);
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
  const openPdfBlob = (blob, fileName) => {
    const url = window.URL.createObjectURL(blob);
    const newWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (!newWindow) {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      newWindow.focus();
    }
    window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
  };
  const handleDownloadQuotation = async (orderId) => {
    try {
      const response = await quotationAPI.downloadPdfByOrderId(orderId);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `quotation_${orderId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else if (response.status === 404) {
        Swal.fire({
          title: "No Quotation",
          text: "Quotation has not been generated for this order yet",
          icon: "info",
          confirmButtonText: "OK",
        });
      } else {
        throw new Error("Failed to download quotation");
      }
    } catch (error) {
      console.error("Error downloading quotation:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to download quotation: " + error.message,
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };
  const handleViewMedicalReport = async (orderId) => {
    try {
      const token = getToken();
      const response = await fetch(
        `${API_BASE_URL}/orders/${orderId}/medical-report/view`,
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
          openPdfBlob(blob, `prescription_${orderId}.pdf`);
        } else {
          const data = await response.json();
          Swal.fire({
            title: data.hasReport === false ? "No Report" : "Info",
            text:
              data.message ||
              "Medical report is not yet available for this order",
            icon: data.hasReport === false ? "info" : "info",
            confirmButtonText: "OK",
          });
        }
      } else {
        Swal.fire({
          title: "Error",
          text: "Failed to load medical report",
          icon: "error",
          confirmButtonText: "OK",
        });
      }
    } catch (error) {
      console.error("Error viewing medical report:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to load medical report: " + error.message,
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  // Generate Bill PDF
  const handleGenerateBill = async (orderId) => {
    try {
      const token = getToken();
      const response = await fetch(
        `${API_BASE_URL}/orders/${orderId}/generate-bill`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        Swal.fire({
          title: "Bill Generated!",
          text: "The bill has been generated and saved successfully",
          icon: "success",
          confirmButtonText: "OK",
        });
        // Refresh orders to get updated bill info
        const ordersRes = await orderAPI.getAllOrdersWithDetails();
        setOrders(ordersRes.data);
      } else {
        throw new Error("Failed to generate bill");
      }
    } catch (error) {
      console.error("Error generating bill:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to generate bill: " + error.message,
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  // Download Bill PDF
  const handleDownloadBill = async (orderId) => {
    try {
      const token = getToken();
      const response = await fetch(
        `${API_BASE_URL}/orders/${orderId}/bill/download`,
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
          const link = document.createElement("a");
          link.href = url;
          link.download = `bill_${orderId}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } else {
          const data = await response.json();
          Swal.fire({
            title: data.hasBill === false ? "No Bill" : "Info",
            text: data.message || "Bill is not yet available for this order",
            icon: data.hasBill === false ? "info" : "info",
            confirmButtonText: "OK",
          });
        }
      } else {
        throw new Error("Failed to download bill");
      }
    } catch (error) {
      console.error("Error downloading bill:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to download bill: " + error.message,
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  // Download Medical Report
  const handleDownloadMedicalReport = async (orderId) => {
    try {
      const token = getToken();
      const response = await fetch(
        `${API_BASE_URL}/orders/${orderId}/medical-report/download`,
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
          const link = document.createElement("a");
          link.href = url;
          link.download = `medical_report_${orderId}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } else {
          const data = await response.json();
          Swal.fire({
            title: data.hasReport === false ? "No Report" : "Info",
            text:
              data.message ||
              "Medical report is not yet available for this order",
            icon: data.hasReport === false ? "info" : "info",
            confirmButtonText: "OK",
          });
        }
      } else {
        Swal.fire({
          title: "Error",
          text: "Failed to download medical report",
          icon: "error",
          confirmButtonText: "OK",
        });
      }
    } catch (error) {
      console.error("Error downloading medical report:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to download medical report: " + error.message,
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  // View Prescription PDF
  const handleViewPrescription = async (orderId) => {
    try {
      const token = getToken();
      const response = await fetch(
        `${API_BASE_URL}/orders/${orderId}/prescription/view`,
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
          openPdfBlob(blob, `prescription_${orderId}.pdf`);
        } else {
          const data = await response.json();
          Swal.fire({
            title: data.hasPrescription === false ? "No Prescription" : "Info",
            text:
              data.message || "Prescription is not available for this order",
            icon: "info",
            confirmButtonText: "OK",
          });
        }
      } else {
        Swal.fire({
          title: "Error",
          text: "Failed to load prescription",
          icon: "error",
          confirmButtonText: "OK",
        });
      }
    } catch (error) {
      console.error("Error viewing prescription:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to load prescription: " + error.message,
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  // Download Prescription PDF
  const handleDownloadPrescription = async (orderId) => {
    try {
      const token = getToken();
      const response = await fetch(
        `${API_BASE_URL}/orders/${orderId}/prescription/download`,
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
          const link = document.createElement("a");
          link.href = url;
          link.download = `prescription_${orderId}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } else {
          const data = await response.json();
          Swal.fire({
            title: data.hasPrescription === false ? "No Prescription" : "Info",
            text:
              data.message || "Prescription is not available for this order",
            icon: "info",
            confirmButtonText: "OK",
          });
        }
      } else {
        throw new Error("Failed to download prescription");
      }
    } catch (error) {
      console.error("Error downloading prescription:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to download prescription: " + error.message,
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterPaymentStatus]);

  useEffect(() => {
    const shouldLockScroll =
      showDetailsModal ||
      showDoctorModal ||
      showAnalystModal ||
      showPreviewModal;

    if (!shouldLockScroll) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [showDetailsModal, showDoctorModal, showAnalystModal, showPreviewModal]);

  const fetchData = async () => {
    try {
      // Get payment status filter - only apply when it's not 'all' and is specifically 'PAID'
      const paymentStatusFilter =
        filterPaymentStatus !== "all" ? filterPaymentStatus : null;

      const [ordersRes, doctorsRes, analystsRes] = await Promise.all([
        orderAPI.getAllOrdersWithDetails(paymentStatusFilter),
        userAPI.getByRole("DOCTOR"),
        userAPI.getByRole("ANALYST"),
      ]);
      setOrders(ordersRes.data);
      setDoctors(doctorsRes.data);
      setAnalysts(analystsRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if order is Online Pharmacy
  const isOnlinePharmacyOrder = (order) => {
    // Check serviceType field directly
    if (
      order.serviceType === "ONLINE_PHARMACY" ||
      order.serviceType === "online-pharmacy"
    ) {
      return true;
    }
    // Also check orderDetails JSON
    try {
      const details = JSON.parse(order.orderDetails || "{}");
      if (
        details.serviceType === "online-pharmacy" ||
        details.services?.onlinePharmacy
      ) {
        return true;
      }
    } catch (e) {}
    return false;
  };

  const filteredOrders = orders
    .filter((order) => {
      // Try to get serviceType from the field, or parse from orderDetails JSON
      const getOrderServiceType = (o) => {
        if (o.serviceType) return o.serviceType;
        try {
          const details = JSON.parse(o.orderDetails || "{}");
          if (details.serviceType) {
            // Map from frontend format (prescription-analysis) to backend format
            if (details.serviceType === "prescription-analysis")
              return "PRESCRIPTION_ANALYSIS";
            if (details.serviceType === "second-opinion")
              return "SECOND_OPINION";
            if (details.serviceType === "online-pharmacy")
              return "ONLINE_PHARMACY";
            return details.serviceType;
          }
          if (details.services) {
            if (details.services.prescriptionAnalysis)
              return "PRESCRIPTION_ANALYSIS";
            if (details.services.secondOpinion) return "SECOND_OPINION";
            if (details.services.onlinePharmacy) return "ONLINE_PHARMACY";
          }
        } catch (e) {}
        return null;
      };

      const orderServiceType = getOrderServiceType(order);
      const normalizedStatus = getStatusBucket(order.status);

      const normalizedSearchTerm = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !normalizedSearchTerm ||
        order.orderNumber?.toLowerCase().includes(normalizedSearchTerm) ||
        order.user?.fullName?.toLowerCase().includes(normalizedSearchTerm);
      const matchesFilter =
        filterStatus === "all" || normalizedStatus === filterStatus;
      const matchesPaymentFilter =
        filterPaymentStatus === "all" ||
        order.paymentStatus === filterPaymentStatus;
      const matchesService =
        filterService === "all" || orderServiceType === filterService;

      // CRITICAL: For Online Pharmacy orders, NEVER show unpaid orders in the list
      // They should only appear after payment is complete (PAID status)
      if (isOnlinePharmacyOrder(order) && order.paymentStatus !== "PAID") {
        return false;
      }

      return (
        matchesSearch && matchesFilter && matchesPaymentFilter && matchesService
      );
    })
    .sort((a, b) => getOrderTimestamp(b) - getOrderTimestamp(a));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterService, filterPaymentStatus]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / TABLE_PAGE_SIZE));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, filteredOrders.length]);

  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * TABLE_PAGE_SIZE,
    currentPage * TABLE_PAGE_SIZE,
  );

  const getStatusBadge = (status) => {
    const styles = {
      SUBMITTED: "bg-yellow-100 text-yellow-700",
      DRAFT: "bg-blue-100 text-blue-700",
      IN_REVIEW: "bg-blue-100 text-blue-700",
      PENDING: "bg-yellow-100 text-yellow-700",
      PROCESSING: "bg-blue-100 text-blue-700",
      APPROVED: "bg-blue-100 text-blue-700",
      COMPLETED: "bg-green-100 text-green-700",
      CANCELLED: "bg-red-100 text-red-700",
      REJECTED: "bg-red-100 text-red-700",
    };
    return styles[status] || "bg-gray-100 text-gray-700";
  };

  const handleSearchChange = (event) => {
    const { value } = event.target;
    const sanitizedValue = sanitizeSearchValue(value);

    setSearchTerm(sanitizedValue);
    setSearchError(
      SEARCH_ALLOWED_CHARACTERS.test(value)
        ? ""
        : "Search supports only letters, numbers, spaces, and hyphens.",
    );
  };

  const getStatusLabel = (status) => {
    switch (getStatusBucket(status)) {
      case "PROCESSING":
        return "Processing";
      case "COMPLETED":
        return "Completed";
      case "PENDING":
        return "Pending";
      case "REJECTED":
        return "Rejected";
      case "CANCELLED":
        return "Cancelled";
      default:
        return status || "Pending";
    }
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      HIGH: "bg-red-100 text-red-700",
      MEDIUM: "bg-yellow-100 text-yellow-700",
      LOW: "bg-green-100 text-green-700",
    };
    return styles[priority] || "bg-gray-100 text-gray-700";
  };

  const handleApproveClick = (order) => {
    setPendingOrder(order);
    // For Prescription Analysis orders, show analyst modal; for others, show doctor modal
    if (isPrescriptionAnalysis(order)) {
      setShowAnalystModal(true);
    } else {
      setShowDoctorModal(true);
    }
  };

  const handleAssignDoctor = async (doctor) => {
    if (!pendingOrder || assigningDoctorId) {
      return;
    }

    const currentOrder = pendingOrder;
    const token = getToken();
    setAssigningDoctorId(doctor.id);

    try {
      // For non-Prescription Analysis orders, use assign-doctor API
      const assignResponse = await fetch(
        `${API_BASE_URL}/orders/${currentOrder.id}/assign-doctor?doctorId=${doctor.id}&priority=${selectedPriority}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!assignResponse.ok) {
        throw new Error("Failed to assign doctor");
      }

      // Refresh orders to get updated data (status will be IN_REVIEW from backend)
      const ordersRes = await orderAPI.getAllOrdersWithDetails();
      setOrders(ordersRes.data);
      setShowDoctorModal(false);
      setPendingOrder(null);
      setSelectedPriority("MEDIUM");
      Swal.fire({
        title: "Order Approved!",
        text: `Order ${currentOrder.orderNumber} has been assigned to ${doctor.fullName}`,
        icon: "success",
        confirmButtonText: "OK",
      });
    } catch (error) {
      console.error("Error updating order:", error);
      // Fallback - update status manually
      setOrders(
        orders.map((o) =>
          o.id === currentOrder.id
            ? { ...o, status: "IN_REVIEW", assignedDoctor: doctor }
            : o,
        ),
      );
      setShowDoctorModal(false);
      setPendingOrder(null);
      setSelectedPriority("MEDIUM");
      Swal.fire({
        title: "Order Approved!",
        text: `Order ${currentOrder.orderNumber} has been approved`,
        icon: "success",
        confirmButtonText: "OK",
      });
    } finally {
      setAssigningDoctorId(null);
    }
  };

  const handleAssignAnalyst = async (analyst) => {
    if (!pendingOrder || assigningAnalystId) {
      return;
    }

    const currentOrder = pendingOrder;
    const token = getToken();
    setAssigningAnalystId(analyst.id);

    try {
      // For Prescription Analysis orders, use assign-analyst API
      const assignResponse = await fetch(
        `${API_BASE_URL}/orders/${currentOrder.id}/assign-analyst?analystId=${analyst.id}&priority=${selectedPriority}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!assignResponse.ok) {
        throw new Error("Failed to assign analyst");
      }

      // Refresh orders to get updated data
      const ordersRes = await orderAPI.getAllOrdersWithDetails();
      setOrders(ordersRes.data);
      setShowAnalystModal(false);
      setPendingOrder(null);
      setSelectedPriority("MEDIUM");
      Swal.fire({
        title: "Order Approved!",
        text: `Order ${currentOrder.orderNumber} has been assigned to ${analyst.fullName}`,
        icon: "success",
        confirmButtonText: "OK",
      });
    } catch (error) {
      console.error("Error updating order:", error);
      // Fallback - update status manually
      setOrders(
        orders.map((o) =>
          o.id === currentOrder.id
            ? { ...o, status: "IN_REVIEW", assignedAnalyst: analyst }
            : o,
        ),
      );
      setShowAnalystModal(false);
      setPendingOrder(null);
      setSelectedPriority("MEDIUM");
      Swal.fire({
        title: "Order Approved!",
        text: `Order ${currentOrder.orderNumber} has been approved`,
        icon: "success",
        confirmButtonText: "OK",
      });
    } finally {
      setAssigningAnalystId(null);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await orderAPI.updateStatus(orderId, newStatus);
      setOrders(
        orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
      );
      Swal.fire({
        title: "Order Updated!",
        text: `Order status changed to ${newStatus}`,
        icon: "success",
        confirmButtonText: "OK",
      });
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar role="admin" />
        <div className="flex-1 flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-[#2563EB] animate-spin" />
        </div>
        <Footer />
      </>
    );
  }

  const stats = {
    pending: orders.filter((o) => {
      // Exclude unpaid Online Pharmacy orders from pending count
      const isOnlinePharmacy =
        o.serviceType === "ONLINE_PHARMACY" ||
        o.serviceType === "online-pharmacy" ||
        (() => {
          try {
            const details = JSON.parse(o.orderDetails || "{}");
            return (
              details.serviceType === "online-pharmacy" ||
              details.services?.onlinePharmacy
            );
          } catch (e) {
            return false;
          }
        })();
      if (isOnlinePharmacy && o.paymentStatus !== "PAID") return false;
      return getStatusBucket(o.status) === "PENDING";
    }).length,
    approved: orders.filter(
      (o) =>
        getStatusBucket(o.status) === "PROCESSING" ||
        o.paymentStatus === "PAID",
    ).length,
    completed: orders.filter((o) => getStatusBucket(o.status) === "COMPLETED")
      .length,
    revenue: orders
      .filter((o) => o.paymentStatus === "PAID")
      .reduce((sum, o) => sum + parseFloat(o.totalAmount || 0), 0),
  };

  // Get unique specializations from doctors
  const specializations = [
    "all",
    ...new Set(
      doctors.filter((d) => d.specialization).map((d) => d.specialization),
    ),
  ];

  // Filter doctors by selected specialization
  const filteredDoctors =
    selectedSpecialization === "all"
      ? doctors
      : doctors.filter((d) => d.specialization === selectedSpecialization);

  // Helper function to check if order is Prescription Analysis
  const isPrescriptionAnalysis = (order) => {
    if (order.serviceType === "PRESCRIPTION_ANALYSIS") return true;
    try {
      const details = JSON.parse(order.orderDetails || "{}");
      if (
        details.serviceType === "prescription-analysis" ||
        details.services?.prescriptionAnalysis
      )
        return true;
    } catch (e) {}
    return false;
  };

  const getOrderServiceLabel = (order) => {
    if (order.serviceType === "PRESCRIPTION_ANALYSIS")
      return "Prescription Analysis";
    if (order.serviceType === "ONLINE_PHARMACY") return "Online Pharmacy";
    if (order.serviceType === "SECOND_OPINION") return "Second Opinion";

    try {
      const details = JSON.parse(order.orderDetails || "{}");
      if (
        details.serviceType === "prescription-analysis" ||
        details.services?.prescriptionAnalysis
      )
        return "Prescription Analysis";
      if (
        details.serviceType === "online-pharmacy" ||
        details.services?.onlinePharmacy
      )
        return "Online Pharmacy";
      if (
        details.serviceType === "second-opinion" ||
        details.services?.secondOpinion
      )
        return "Second Opinion";
      if (details.serviceType) return details.serviceType;
    } catch (e) {}

    return "N/A";
  };

  const getOrderAssigneeLabel = (order) => {
    if (isPrescriptionAnalysis(order)) {
      return order.assignedAnalyst?.fullName || "Not assigned";
    }

    return order.assignedDoctor?.fullName
      ? `Dr. ${order.assignedDoctor.fullName}`
      : "Not assigned";
  };

  const isPrescriptionService = (order) => {
    if (!order) return false;
    if (
      order.serviceType === "PRESCRIPTION_ANALYSIS" ||
      order.serviceType === "SECOND_OPINION"
    )
      return true;
    try {
      const details = JSON.parse(order.orderDetails || "{}");
      return (
        details.serviceType === "prescription-analysis" ||
        details.services?.prescriptionAnalysis ||
        details.serviceType === "second-opinion" ||
        details.services?.secondOpinion
      );
    } catch (e) {
      return false;
    }
  };

  const hasGeneratedPrescriptionFile = (order) => {
    if (!order) return false;

    if (
      order.serviceType === "SECOND_OPINION" ||
      order.serviceType === "PRESCRIPTION_ANALYSIS"
    ) {
      return Boolean(order.prescriptionPath || order.prescription);
    }

    try {
      const details = JSON.parse(order.orderDetails || "{}");
      if (
        details.serviceType === "second-opinion" ||
        details.services?.secondOpinion ||
        details.serviceType === "prescription-analysis" ||
        details.services?.prescriptionAnalysis
      ) {
        return Boolean(order.prescriptionPath || order.prescription);
      }
    } catch (e) {}

    return false;
  };

  const shouldShowPrescriptionActions = (order) => {
    if (!isPrescriptionService(order)) return false;
    return (
      hasGeneratedPrescriptionFile(order) ||
      order.status === "COMPLETED" ||
      order.medicalReportStatus === "COMPLETED"
    );
  };

  return (
    <>
      <Navbar role="admin" />

      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8 sm:mb-12"
          >
            <h1 className="text-3xl sm:text-4xl text-[#1E3A8A] mb-2">
              Manage Orders
            </h1>
            <p className="text-base sm:text-xl text-gray-600">
              Review and approve pending orders
            </p>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-4 sm:p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 mb-2">Pending</p>
                  <p className="text-2xl sm:text-3xl text-[#F59E0B]">
                    {stats.pending}
                  </p>
                </div>
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-[#F59E0B] to-[#FBBF24] rounded-xl flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg p-4 sm:p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 mb-2">Approved</p>
                  <p className="text-2xl sm:text-3xl text-[#2563EB]">
                    {stats.approved}
                  </p>
                </div>
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] rounded-xl flex items-center justify-center shrink-0">
                  <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white rounded-2xl shadow-lg p-4 sm:p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 mb-2">Completed</p>
                  <p className="text-2xl sm:text-3xl text-[#16A34A]">
                    {stats.completed}
                  </p>
                </div>
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-[#16A34A] to-[#22C55E] rounded-xl flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-white rounded-2xl shadow-lg p-4 sm:p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 mb-2">Total Revenue</p>
                  <p className="text-2xl sm:text-3xl text-[#8B5CF6] break-words">
                    ₹{stats.revenue.toFixed(2)}
                  </p>
                </div>
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-[#8B5CF6] to-[#A78BFA] rounded-xl flex items-center justify-center shrink-0">
                  <Wallet className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Service Tabs */}
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <button
                onClick={() => setFilterService("all")}
                className={`min-h-12 px-3 py-2.5 text-sm font-medium rounded-xl transition-all sm:px-6 sm:py-3 sm:text-base ${
                  filterService === "all"
                    ? "bg-[#1E3A8A] text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                }`}
              >
                All Orders
              </button>
              <button
                onClick={() => setFilterService("ONLINE_PHARMACY")}
                className={`min-h-12 px-3 py-2.5 text-sm font-medium rounded-xl transition-all sm:px-6 sm:py-3 sm:text-base ${
                  filterService === "ONLINE_PHARMACY"
                    ? "bg-[#1E3A8A] text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                }`}
              >
                Online Pharmacy
              </button>

              <button
                onClick={() => setFilterService("PRESCRIPTION_ANALYSIS")}
                className={`min-h-12 px-3 py-2.5 text-sm font-medium rounded-xl transition-all sm:px-6 sm:py-3 sm:text-base ${
                  filterService === "PRESCRIPTION_ANALYSIS"
                    ? "bg-[#1E3A8A] text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                }`}
              >
                Prescription Analysis
              </button>

              <button
                onClick={() => setFilterService("SECOND_OPINION")}
                className={`min-h-12 px-3 py-2.5 text-sm font-medium rounded-xl transition-all sm:px-6 sm:py-3 sm:text-base ${
                  filterService === "SECOND_OPINION"
                    ? "bg-[#1E3A8A] text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                }`}
              >
                Second Opinion
              </button>
            </div>
          </div>

          {/* Filters & Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto]"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order ID or patient name..."
                value={searchTerm}
                onChange={handleSearchChange}
                aria-invalid={Boolean(searchError)}
                className={`h-14 w-full rounded-xl border bg-white py-0 pl-12 pr-4 text-sm shadow-sm focus:border-transparent focus:ring-2 sm:h-[58px] sm:text-base ${
                  searchError
                    ? "border-red-300 focus:ring-red-500"
                    : "border-gray-300 focus:ring-[#2563EB]"
                }`}
              />
              {searchError && (
                <p className="mt-2 flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {searchError}
                </p>
              )}
            </div>
            <div className="min-w-0">
              <label className="mb-1.5 block text-xs font-medium text-gray-600 lg:sr-only">
                Status
              </label>
              <CustomSelect
                value={filterStatus}
                onChange={setFilterStatus}
                placeholder="Select status"
                buttonClassName="h-14 flex-nowrap px-4 py-0 text-sm sm:h-[58px] sm:px-6 sm:text-base lg:min-w-[200px]"
                textClassName="font-medium text-gray-800"
                options={[
                  { value: "all", label: "All Status" },
                  { value: "PENDING", label: "Pending" },
                  { value: "PROCESSING", label: "Processing" },
                  { value: "COMPLETED", label: "Completed" },
                  { value: "REJECTED", label: "Rejected" },
                  { value: "CANCELLED", label: "Cancelled" },
                ]}
              />
            </div>
            <div className="min-w-0">
              <label className="mb-1.5 block text-xs font-medium text-gray-600 lg:sr-only">
                Payment
              </label>
              <CustomSelect
                value={filterPaymentStatus}
                onChange={setFilterPaymentStatus}
                placeholder="Select payment"
                buttonClassName="h-14 flex-nowrap px-4 py-0 text-sm sm:h-[58px] sm:px-6 sm:text-base lg:min-w-[200px]"
                textClassName="font-medium text-gray-800"
                options={[
                  { value: "all", label: "All Payments" },
                  { value: "PENDING", label: "Pending" },
                  { value: "PAID", label: "Paid" },
                  { value: "FAILED", label: "Failed" },
                ]}
              />
            </div>
          </motion.div>

          {/* Orders */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="hidden overflow-hidden md:block">
              <table className="w-full table-fixed">
                <colgroup>
                  <col className="w-[10%]" />
                  <col className="w-[13%]" />
                  <col className="w-[13%]" />
                  <col className="w-[16%]" />
                  <col className="w-[9%]" />
                  <col className="w-[9%]" />
                  <col className="w-[10%]" />
                  <col className="w-[20%]" />
                </colgroup>
                <thead className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white">
                  <tr>
                    <th className="px-3 py-4 text-left text-sm lg:px-5 lg:text-base">
                      Order ID
                    </th>
                    <th className="px-3 py-4 text-left text-sm lg:px-5 lg:text-base">
                      Patient
                    </th>
                    <th className="px-3 py-4 text-left text-sm lg:px-5 lg:text-base">
                      Service
                    </th>
                    <th className="px-3 py-4 text-left text-sm lg:px-5 lg:text-base">
                      {filterService === "PRESCRIPTION_ANALYSIS"
                        ? "Assigned Analyst"
                        : filterService === "all"
                          ? "Assigned Doctor/Analyst"
                          : "Assigned Doctor"}
                    </th>
                    <th className="px-3 py-4 text-left text-sm lg:px-5 lg:text-base">
                      Amount
                    </th>
                    <th className="px-3 py-4 text-left text-sm lg:px-5 lg:text-base">
                      Date
                    </th>
                    <th className="px-3 py-4 text-left text-sm lg:px-5 lg:text-base">
                      Status
                    </th>
                    <th className="px-2 py-4 text-center text-sm lg:px-3 lg:text-base">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((order, index) => (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.7 + index * 0.05 }}
                      className="border-b border-gray-200 hover:bg-[#F1F5F9] transition-colors"
                    >
                      <td className="px-3 py-4 text-sm text-gray-700 lg:px-5 lg:text-base">
                        {order.orderNumber}
                      </td>
                      <td className="px-3 py-4 lg:px-5">
                        <div className="flex items-center gap-2 lg:gap-3">
                          <div className="w-9 h-9 shrink-0 bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] rounded-full flex items-center justify-center text-white">
                            {order.user?.fullName?.charAt(0)}
                          </div>
                          <span className="text-sm text-gray-700 break-normal lg:text-base">
                            {order.user?.fullName}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-4 lg:px-5">
                        <span className="text-sm text-gray-700 break-normal lg:text-base">
                          {getOrderServiceLabel(order)}
                        </span>
                      </td>
                      <td className="px-3 py-4 lg:px-5">
                        <span
                          className={`text-sm ${
                            getOrderAssigneeLabel(order) === "Not assigned"
                              ? "italic text-gray-400"
                              : "text-gray-700"
                          } break-normal`}
                        >
                          {getOrderAssigneeLabel(order)}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-700 lg:px-5 lg:text-base">
                        {formatOrderAmount(order)}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-600 lg:px-5 lg:text-base">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td className="px-3 py-4 lg:px-5">
                        <span
                          className={`whitespace-nowrap px-2.5 py-1 rounded-full text-xs lg:text-sm ${getStatusBadge(order.status)}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-2 py-4 lg:px-3">
                        <div className="flex min-w-[178px] items-center justify-center gap-2 whitespace-nowrap">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="min-w-[86px] px-3 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1E3A8A] transition-colors text-sm flex items-center justify-center gap-1.5 whitespace-nowrap lg:gap-2"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowDetailsModal(true);
                            }}
                          >
                            <Eye className="w-4 h-4 shrink-0" />
                            View
                          </motion.button>
                          {(order.status === "SUBMITTED" ||
                            order.status === "PENDING") && (
                            <>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-green-200 bg-green-50 text-green-600 transition-colors hover:bg-green-100 lg:h-9 lg:w-9"
                                title="Approve"
                                aria-label="Approve order"
                                onClick={() => handleApproveClick(order)}
                              >
                                <CheckCircle className="h-5 w-5" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-500 transition-colors hover:bg-red-100 lg:h-9 lg:w-9"
                                title="Reject"
                                aria-label="Reject order"
                                onClick={() =>
                                  handleUpdateStatus(order.id, "REJECTED")
                                }
                              >
                                <XCircle className="h-5 w-5" />
                              </motion.button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-gray-200 md:hidden">
              {paginatedOrders.map((order, index) => (
                <motion.article
                  key={order.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.05 * index }}
                  className="bg-white p-4"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Order ID</p>
                      <p className="break-words text-sm font-medium text-[#1E3A8A]">
                        {order.orderNumber}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs ${getStatusBadge(order.status)}`}
                    >
                      {getStatusLabel(order.status)}
                    </span>
                  </div>

                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] text-white">
                      {order.user?.fullName?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {order.user?.fullName || "Unknown patient"}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {getOrderServiceLabel(order)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Assigned</p>
                      <p
                        className={`mt-0.5 break-words ${
                          getOrderAssigneeLabel(order) === "Not assigned"
                            ? "italic text-gray-400"
                            : "text-gray-800"
                        }`}
                      >
                        {getOrderAssigneeLabel(order)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Amount</p>
                      <p className="mt-0.5 text-gray-800">
                        {formatOrderAmount(order)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Date</p>
                      <p className="mt-0.5 text-gray-800">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Payment</p>
                      <p className="mt-0.5 text-gray-800">
                        {order.paymentStatus || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-sm text-white transition-colors hover:bg-[#1E3A8A]"
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowDetailsModal(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </motion.button>
                    {(order.status === "SUBMITTED" ||
                      order.status === "PENDING") && (
                      <>
                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-green-200 bg-green-50 text-green-600"
                          title="Approve"
                          aria-label="Approve order"
                          onClick={() => handleApproveClick(order)}
                        >
                          <CheckCircle className="h-5 w-5" />
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-500"
                          title="Reject"
                          aria-label="Reject order"
                          onClick={() =>
                            handleUpdateStatus(order.id, "REJECTED")
                          }
                        >
                          <XCircle className="h-5 w-5" />
                        </motion.button>
                      </>
                    )}
                  </div>
                </motion.article>
              ))}
            </div>

            {/* Pagination */}
            <TablePagination
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              totalItems={filteredOrders.length}
              itemLabel="orders"
              pageSize={TABLE_PAGE_SIZE}
            />
          </motion.div>
        </div>
      </main>

      {/* Order Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black bg-opacity-50 p-2 sm:p-4"
            onClick={() => setShowDetailsModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-2xl sm:max-h-[90vh] sm:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-5 flex items-start justify-between gap-3 sm:mb-6 sm:items-center">
                <div>
                  <h2 className="text-2xl text-[#1E3A8A] mb-1 sm:text-3xl">
                    Order Details
                  </h2>
                  <p className="text-sm text-gray-600 sm:text-base">
                    Complete information about this order
                  </p>
                </div>
                <button
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => setShowDetailsModal(false)}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1">
                {/* Order Summary */}
                <div className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] rounded-xl p-4 sm:p-6 mb-6 text-white">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm opacity-90 mb-1">Order ID</p>
                      <p className="break-words text-xl sm:text-2xl">
                        {selectedOrder.orderNumber}
                      </p>
                    </div>
                    <span
                      className={`px-4 py-2 rounded-full text-sm font-medium ${
                        selectedOrder.status === "COMPLETED"
                          ? "bg-green-500"
                          : selectedOrder.status === "DRAFT"
                            ? "bg-blue-500"
                            : selectedOrder.status === "IN_REVIEW"
                              ? "bg-blue-500"
                              : selectedOrder.status === "SUBMITTED"
                                ? "bg-yellow-500"
                                : selectedOrder.status === "APPROVED"
                                  ? "bg-blue-500"
                                  : selectedOrder.status === "REJECTED"
                                    ? "bg-red-500"
                                    : selectedOrder.status === "CANCELLED"
                                      ? "bg-red-500"
                                      : "bg-yellow-500"
                      }`}
                    >
                      {getStatusLabel(selectedOrder.status)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      <span>
                        {selectedOrder.createdAt
                          ? new Date(
                              selectedOrder.createdAt,
                            ).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {selectedOrder.priority && (
                        <span
                          className={`px-3 py-1 rounded-full text-sm ${getPriorityBadge(selectedOrder.priority)}`}
                        >
                          {selectedOrder.priority} Priority
                        </span>
                      )}
                      <div className="break-words text-2xl sm:text-3xl">
                        {formatOrderAmount(selectedOrder)}
                      </div>
                    </div>
                  </div>
                  {selectedOrder.serviceType && (
                    <div className="mt-4 pt-4 border-t border-white/20">
                      <span className="text-white">
                        {selectedOrder.serviceType === "PRESCRIPTION_ANALYSIS"
                          ? "Prescription Analysis"
                          : selectedOrder.serviceType === "ONLINE_PHARMACY"
                            ? "Online Pharmacy"
                            : selectedOrder.serviceType === "SECOND_OPINION"
                              ? "Second Opinion"
                              : selectedOrder.serviceType}
                      </span>
                    </div>
                  )}
                  {/* Also check orderDetails JSON for service type */}
                  {!selectedOrder.serviceType && selectedOrder.orderDetails && (
                    <div className="mt-4 pt-4 border-t border-white/20">
                      <span className="text-white">
                        {(() => {
                          try {
                            const details = JSON.parse(
                              selectedOrder.orderDetails,
                            );
                            if (
                              details.serviceType === "prescription-analysis" ||
                              details.services?.prescriptionAnalysis
                            )
                              return "Prescription Analysis";
                            if (
                              details.serviceType === "online-pharmacy" ||
                              details.services?.onlinePharmacy
                            )
                              return "Online Pharmacy";
                            if (
                              details.serviceType === "second-opinion" ||
                              details.services?.secondOpinion
                            )
                              return "Second Opinion";
                            if (details.serviceType) return details.serviceType;
                          } catch (e) {}
                          return null;
                        })()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Services Section */}
                <div className="mb-6">
                  <h3 className="text-xl text-[#1E3A8A] mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Services Requested
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4 sm:p-6">
                    {selectedOrder.serviceType ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedOrder.serviceType ===
                          "PRESCRIPTION_ANALYSIS" && (
                          <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                            Prescription Analysis
                          </span>
                        )}
                        {selectedOrder.serviceType === "SECOND_OPINION" && (
                          <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                            Second Opinion
                          </span>
                        )}
                        {selectedOrder.serviceType === "ONLINE_PHARMACY" && (
                          <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                            Online Pharmacy
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          try {
                            const details = JSON.parse(
                              selectedOrder.orderDetails || "{}",
                            );
                            if (details.services?.prescriptionAnalysis) {
                              return (
                                <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                                  Prescription Analysis
                                </span>
                              );
                            }
                            if (details.services?.secondOpinion) {
                              return (
                                <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                                  Second Opinion
                                </span>
                              );
                            }
                            if (details.services?.onlinePharmacy) {
                              return (
                                <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                                  Online Pharmacy
                                </span>
                              );
                            }
                            if (
                              details.serviceType === "prescription-analysis"
                            ) {
                              return (
                                <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                                  Prescription Analysis
                                </span>
                              );
                            }
                            if (details.serviceType === "second-opinion") {
                              return (
                                <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                                  Second Opinion
                                </span>
                              );
                            }
                            if (details.serviceType === "online-pharmacy") {
                              return (
                                <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                                  Online Pharmacy
                                </span>
                              );
                            }
                          } catch (e) {}
                          return null;
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Patient Information */}
                <div className="mb-6">
                  <h3 className="text-xl text-[#1E3A8A] mb-4 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Patient Information
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4 sm:p-6 space-y-3">
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-gray-500 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm text-gray-600">Full Name</p>
                        <p className="break-words text-base text-gray-900 sm:text-lg">
                          {selectedOrder.user?.fullName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-gray-500 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm text-gray-600">Email Address</p>
                        <p className="break-words text-base text-gray-900 sm:text-lg">
                          {selectedOrder.user?.email}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delivery Address - Show for Online Pharmacy orders */}
                {selectedOrder.serviceType === "ONLINE_PHARMACY" && (
                  <div className="mb-6">
                    <h3 className="text-xl text-[#1E3A8A] mb-4 flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Delivery Address
                    </h3>
                    <div className="bg-purple-50 rounded-xl p-4 sm:p-6 border border-purple-200">
                      {selectedOrder.deliveryAddress ||
                      selectedOrder.deliveryCity ||
                      selectedOrder.deliveryState ||
                      selectedOrder.user?.address ||
                      selectedOrder.user?.city ? (
                        <div className="space-y-2">
                          {selectedOrder.deliveryAddress ||
                          selectedOrder.user?.address ? (
                            <p className="text-gray-900 font-medium">
                              {selectedOrder.deliveryAddress ||
                                selectedOrder.user?.address}
                            </p>
                          ) : null}
                          {(selectedOrder.deliveryCity ||
                            selectedOrder.user?.city) && (
                            <p className="text-gray-700">
                              <span className="font-medium">City:</span>{" "}
                              {selectedOrder.deliveryCity ||
                                selectedOrder.user?.city}
                              {(selectedOrder.deliveryState ||
                                selectedOrder.user?.state) && <span>, </span>}
                              {selectedOrder.deliveryState ||
                                selectedOrder.user?.state}
                              {(selectedOrder.deliveryPincode ||
                                selectedOrder.user?.pincode) && (
                                <span> - </span>
                              )}
                              {selectedOrder.deliveryPincode ||
                                selectedOrder.user?.pincode}
                            </p>
                          )}
                          {(selectedOrder.deliveryCountry ||
                            selectedOrder.user?.country) && (
                            <p className="text-gray-700">
                              <span className="font-medium">Country:</span>{" "}
                              {selectedOrder.deliveryCountry ||
                                selectedOrder.user?.country}
                            </p>
                          )}
                          {selectedOrder.deliveryStatus && (
                            <div className="mt-3 pt-3 border-t border-purple-200">
                              <span
                                className={`px-3 py-1 rounded-full text-sm ${
                                  selectedOrder.deliveryStatus === "DELIVERED"
                                    ? "bg-green-100 text-green-700"
                                    : selectedOrder.deliveryStatus ===
                                        "OUT_FOR_DELIVERY"
                                      ? "bg-blue-100 text-blue-700"
                                      : selectedOrder.deliveryStatus ===
                                          "PROCESSING"
                                        ? "bg-yellow-100 text-yellow-700"
                                        : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {selectedOrder.deliveryStatus}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">
                          No delivery address provided
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Payment Information */}
                <div className="mb-6">
                  <h3 className="text-xl text-[#1E3A8A] mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payment Information
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4 sm:p-6">
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-gray-700">Payment Status</span>
                      <span
                        className={`px-4 py-2 rounded-lg border ${
                          selectedOrder.paymentStatus === "PAID"
                            ? "bg-green-50 border-green-200 text-green-700"
                            : selectedOrder.paymentStatus === "PENDING"
                              ? "bg-yellow-50 border-yellow-200 text-yellow-700"
                              : "bg-red-50 border-red-200 text-red-700"
                        }`}
                      >
                        {selectedOrder.paymentStatus}
                      </span>
                    </div>
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-gray-700">Total Amount</span>
                      <span className="break-words text-xl text-[#1E3A8A] sm:text-2xl">
                        {formatOrderAmount(selectedOrder)}
                      </span>
                    </div>
                    {selectedOrder.paymentMethod &&
                      selectedOrder.paymentMethod !== "NONE" && (
                        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-gray-700">Payment Method</span>
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                            {selectedOrder.paymentMethod === "CREDIT_CARD" ||
                            selectedOrder.paymentMethod === "CARD"
                              ? "Card"
                              : selectedOrder.paymentMethod}
                          </span>
                        </div>
                      )}
                    {selectedOrder.paymentReference && (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-gray-700">Payment Reference</span>
                        <span className="break-all text-sm text-gray-900">
                          {selectedOrder.paymentReference}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Doctor Assignment Information */}
                {(selectedOrder.assignedDoctor ||
                  selectedOrder.assignedAnalyst) && (
                  <div className="mb-6">
                    <h3 className="text-xl text-[#1E3A8A] mb-4 flex items-center gap-2">
                      <User className="w-5 h-5" />
                      {isPrescriptionAnalysis(selectedOrder)
                        ? "Assigned Analyst"
                        : "Assigned Doctor"}
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-4 sm:p-6">
                      <div className="flex items-start gap-4 sm:items-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] rounded-full flex items-center justify-center text-white font-semibold">
                          {isPrescriptionAnalysis(selectedOrder)
                            ? selectedOrder.assignedAnalyst?.fullName?.charAt(0)
                            : selectedOrder.assignedDoctor?.fullName?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-lg font-semibold text-gray-900">
                            {isPrescriptionAnalysis(selectedOrder)
                              ? selectedOrder.assignedAnalyst?.fullName
                              : `Dr. ${selectedOrder.assignedDoctor?.fullName}`}
                          </p>
                          <p className="break-words text-sm text-gray-600">
                            {isPrescriptionAnalysis(selectedOrder)
                              ? selectedOrder.assignedAnalyst?.email
                              : selectedOrder.assignedDoctor?.email}
                          </p>
                          {selectedOrder.priority && (
                            <div className="mt-2">
                              <span
                                className={`px-3 py-1 rounded-full text-sm ${getPriorityBadge(selectedOrder.priority)}`}
                              >
                                {selectedOrder.priority} Priority
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Prescription PDF Section - show only when a prescription file actually exists */}
                {shouldShowPrescriptionActions(selectedOrder) && (
                  <div className="mb-6">
                    <h3 className="text-xl text-[#1E3A8A] mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Prescription PDF
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-4 sm:p-6">
                      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-gray-700">
                          Prescription Status
                        </span>
                        <span
                          className={`px-4 py-2 rounded-lg border ${
                            selectedOrder.medicalReportStatus === "COMPLETED" ||
                            selectedOrder.status === "COMPLETED"
                              ? "bg-green-50 border-green-200 text-green-700"
                              : "bg-yellow-50 border-yellow-200 text-yellow-700"
                          }`}
                        >
                          {selectedOrder.medicalReportStatus === "COMPLETED" ||
                          selectedOrder.status === "COMPLETED"
                            ? "Completed"
                            : "Pending"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#059669] to-[#10B981] px-4 py-2 text-white transition-colors hover:opacity-90"
                          onClick={() =>
                            handleViewPrescription(selectedOrder.id)
                          }
                        >
                          <Eye className="w-4 h-4" />
                          View Prescription
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] px-4 py-2 text-white transition-colors hover:opacity-90"
                          onClick={() =>
                            handleDownloadPrescription(selectedOrder.id)
                          }
                        >
                          <Download className="w-4 h-4" />
                          Download Prescription
                        </motion.button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Order Details */}
                {selectedOrder.orderDetails && (
                  <div className="mb-6">
                    <h3 className="text-xl text-[#1E3A8A] mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Order Details
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-4 sm:p-6">
                      {(() => {
                        try {
                          const details = JSON.parse(
                            selectedOrder.orderDetails,
                          );
                          return (
                            <div className="space-y-3">
                              {details.services && (
                                <div>
                                  <p className="text-sm text-gray-600 mb-1">
                                    Services:
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {details.services.prescriptionAnalysis && (
                                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                        Prescription Analysis
                                      </span>
                                    )}
                                    {details.services.secondOpinion && (
                                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                                        Second Opinion
                                      </span>
                                    )}
                                    {details.services.onlinePharmacy && (
                                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                                        Online Pharmacy
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                              {details.notes && (
                                <div>
                                  <p className="text-sm text-gray-600 mb-1">
                                    Notes:
                                  </p>
                                  <p className="text-gray-900">
                                    {details.notes}
                                  </p>
                                </div>
                              )}
                              {(details.briefHealthIssue ||
                                details.healthIssue ||
                                details.chiefComplaints) && (
                                <div>
                                  <p className="text-sm text-gray-600 mb-1">
                                    Brief Health Issue:
                                  </p>
                                  <p className="text-gray-900">
                                    {details.briefHealthIssue ||
                                      details.healthIssue ||
                                      details.chiefComplaints}
                                  </p>
                                </div>
                              )}
                              {details.documentIds &&
                                details.documentIds.length > 0 && (
                                  <div>
                                    <p className="text-sm text-gray-600 mb-1">
                                      Documents:
                                    </p>
                                    <p className="text-gray-900">
                                      {details.documentIds.length} document(s)
                                      uploaded
                                    </p>
                                  </div>
                                )}
                            </div>
                          );
                        } catch (e) {
                          return (
                            <p className="text-gray-900">
                              {selectedOrder.orderDetails}
                            </p>
                          );
                        }
                      })()}
                    </div>
                  </div>
                )}

                {/* Action Buttons - Show for Online Pharmacy orders when paid */}
                <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row">
                  {/* View/Download Bill buttons - show only for Online Pharmacy paid orders */}
                  {selectedOrder.paymentStatus === "PAID" &&
                    selectedOrder.serviceType === "ONLINE_PHARMACY" && (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] px-4 py-2 text-white transition-colors hover:opacity-90"
                          onClick={() =>
                            handleDownloadBillFromDocuments(selectedOrder.id)
                          }
                        >
                          <Download className="w-4 h-4" />
                          Download Bill
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 px-4 py-2 text-white transition-colors hover:opacity-90"
                          onClick={() =>
                            handleDownloadQuotation(selectedOrder.id)
                          }
                        >
                          <FilePlus className="w-4 h-4" />
                          Download Quotation
                        </motion.button>
                      </>
                    )}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
                    onClick={() => setShowDetailsModal(false)}
                  >
                    Close
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Doctor Assignment Modal */}
      <AnimatePresence>
        {showDoctorModal && pendingOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4"
            onClick={() => setShowDoctorModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex items-start justify-between gap-3 sm:items-center">
                <div>
                  <h2 className="text-2xl text-[#1E3A8A] mb-1">
                    Assign Doctor
                  </h2>
                  <p className="text-gray-600">
                    Select a doctor for this order
                  </p>
                </div>
                <button
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => {
                    setShowDoctorModal(false);
                    setSelectedPriority("MEDIUM");
                  }}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Specialization Filter */}
              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-2">
                  Filter by Specialization:
                </label>
                <CustomSelect
                  value={selectedSpecialization}
                  onChange={setSelectedSpecialization}
                  options={[
                    { value: "all", label: "All Specializations" },
                    ...[
                      ...new Set(
                        doctors
                          .filter((d) => d.specialization)
                          .map((d) => d.specialization),
                      ),
                    ].map((spec) => ({
                      value: spec,
                      label: spec,
                    })),
                  ]}
                />
              </div>

              {/* Priority Selection */}
              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-2">
                  Select Priority:
                </label>
                <CustomSelect
                  value={selectedPriority}
                  onChange={setSelectedPriority}
                  options={[
                    { value: "HIGH", label: "High Priority" },
                    { value: "MEDIUM", label: "Medium Priority" },
                    { value: "LOW", label: "Low Priority" },
                  ]}
                />
              </div>

              {/* Doctor List */}
              <div className="space-y-3 max-h-80 overflow-y-auto">
                <p className="text-sm text-gray-600 mb-2">Available Doctors:</p>
                {filteredDoctors.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No doctors found for this specialization
                  </p>
                ) : (
                  filteredDoctors.map((doctor) => (
                    <motion.button
                      key={doctor.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAssignDoctor(doctor)}
                      disabled={!doctor.isActive || Boolean(assigningDoctorId)}
                      className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                        doctor.isActive && !assigningDoctorId
                          ? "border-gray-200 hover:border-[#2563EB] bg-white hover:bg-blue-50 cursor-pointer"
                          : doctor.isActive
                            ? "border-blue-200 bg-blue-50 cursor-wait"
                            : "border-gray-100 bg-gray-50 cursor-not-allowed opacity-50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] rounded-full flex items-center justify-center text-white font-semibold">
                          {doctor.fullName?.charAt(0)}
                        </div>
                        <div className="text-left">
                          <p className="text-lg font-semibold text-gray-900">
                            {doctor.fullName}
                          </p>
                          <p className="text-sm text-gray-600">
                            {doctor.specialization || "General Medicine"}
                          </p>
                          {doctor.qualifications && (
                            <p className="text-xs text-gray-500">
                              {doctor.qualifications}
                            </p>
                          )}
                          {doctor.licenseNumber && (
                            <p className="text-xs text-gray-500">
                              License: {doctor.licenseNumber}
                            </p>
                          )}
                          {doctor.experienceYears && (
                            <p className="text-xs text-gray-500">
                              {doctor.experienceYears} years experience
                            </p>
                          )}
                        </div>
                      </div>
                      {assigningDoctorId === doctor.id ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Approving...
                        </span>
                      ) : doctor.isActive ? (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                          Available
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-sm">
                          Unavailable
                        </span>
                      )}
                    </motion.button>
                  ))
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  disabled={Boolean(assigningDoctorId)}
                  className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={() => {
                    setShowDoctorModal(false);
                    setSelectedPriority("MEDIUM");
                  }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analyst Assignment Modal */}
      <AnimatePresence>
        {showAnalystModal && pendingOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4"
            onClick={() => setShowAnalystModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex items-start justify-between gap-3 sm:items-center">
                <div>
                  <h2 className="text-2xl text-[#1E3A8A] mb-1">
                    Assign Analyst
                  </h2>
                  <p className="text-gray-600">
                    Select an analyst for this prescription analysis order
                  </p>
                </div>
                <button
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => {
                    setShowAnalystModal(false);
                    setSelectedPriority("MEDIUM");
                  }}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Priority Selection */}
              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-2">
                  Select Priority:
                </label>
                <CustomSelect
                  value={selectedPriority}
                  onChange={setSelectedPriority}
                  options={[
                    { value: "HIGH", label: "High Priority" },
                    { value: "MEDIUM", label: "Medium Priority" },
                    { value: "LOW", label: "Low Priority" },
                  ]}
                />
              </div>

              {/* Analyst List */}
              <div className="space-y-3 max-h-80 overflow-y-auto">
                <p className="text-sm text-gray-600 mb-2">
                  Available Analysts:
                </p>
                {analysts.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No analysts available
                  </p>
                ) : (
                  analysts.map((analyst) => (
                    <motion.button
                      key={analyst.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAssignAnalyst(analyst)}
                      disabled={
                        !analyst.isActive || Boolean(assigningAnalystId)
                      }
                      className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                        analyst.isActive && !assigningAnalystId
                          ? "border-gray-200 hover:border-[#2563EB] bg-white hover:bg-blue-50 cursor-pointer"
                          : analyst.isActive
                            ? "border-blue-200 bg-blue-50 cursor-wait"
                            : "border-gray-100 bg-gray-50 cursor-not-allowed opacity-50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#059669] to-[#10B981] rounded-full flex items-center justify-center text-white font-semibold">
                          {analyst.fullName?.charAt(0)}
                        </div>
                        <div className="text-left">
                          <p className="text-lg font-semibold text-gray-900">
                            {analyst.fullName}
                          </p>
                          <p className="text-sm text-gray-600">
                            {analyst.email}
                          </p>
                          {analyst.qualifications && (
                            <p className="text-xs text-gray-500">
                              {analyst.qualifications}
                            </p>
                          )}
                          {analyst.specialization && (
                            <p className="text-xs text-gray-500">
                              {analyst.specialization}
                            </p>
                          )}
                        </div>
                      </div>
                      {assigningAnalystId === analyst.id ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Approving...
                        </span>
                      ) : analyst.isActive ? (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                          Available
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-sm">
                          Unavailable
                        </span>
                      )}
                    </motion.button>
                  ))
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  disabled={Boolean(assigningAnalystId)}
                  className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={() => {
                    setShowAnalystModal(false);
                    setSelectedPriority("MEDIUM");
                  }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bill Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
            onClick={() => setShowPreviewModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[95vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Company Header */}
              <div className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] px-6 py-4 flex justify-between items-center flex-shrink-0">
                <div className="text-white">
                  <h2 className="text-xl font-bold">RxIncredible</h2>
                  <p className="text-xs">Medical & Pharmacy Services</p>
                </div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="text-white hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="text-center py-4 border-b">
                  <h3 className="text-lg font-bold text-[#1E3A8A]">
                    PRESCRIPTION BILL
                  </h3>
                  <p className="text-sm text-gray-500">
                    Bill No: {selectedOrder.orderNumber}
                  </p>
                </div>

                <div className="px-6 py-3 bg-gray-50 border-b">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Patient Name:</p>
                      <p className="font-medium">
                        {selectedOrder.user?.fullName || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Date:</p>
                      <p className="font-medium">
                        {selectedOrder.createdAt
                          ? new Date(
                              selectedOrder.createdAt,
                            ).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Email:</p>
                      <p className="font-medium">
                        {selectedOrder.user?.email || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Service:</p>
                      <p className="font-medium">
                        {selectedOrder.serviceType || "Online Pharmacy"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t mt-4">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-medium">
                          {formatOrderAmount(selectedOrder)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-300 text-lg font-bold text-[#1E3A8A]">
                        <span>Total:</span>
                        <span>{formatOrderAmount(selectedOrder)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-3 border-t text-center text-xs text-gray-500 mt-4">
                  <p>Generated by RxIncredible - Thank you for choosing us!</p>
                </div>
              </div>

              <div className="px-6 py-4 border-t flex gap-3 flex-shrink-0 bg-white">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </>
  );
}
