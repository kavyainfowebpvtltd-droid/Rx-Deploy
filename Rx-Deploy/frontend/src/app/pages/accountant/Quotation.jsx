import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { motion } from "motion/react";
import { Plus, Trash2, Send, Download, IndianRupee, FileText, Calendar, User, Eye, FolderOpen, Receipt } from "lucide-react";
import { Navbar } from "../../components/Navbar.jsx";
import { Footer } from "../../components/Footer.jsx";
import { CustomSelect } from "../../components/CustomSelect.jsx";
import Swal from "sweetalert2";
import { orderAPI, quotationAPI, documentAPI, getStoredUser } from "@/services/api.js";
import { DocumentsModal, Header } from "./QuotationComponents.jsx";
import {
  buildOrderData,
  formatCurrency,
  getCurrencyLabel,
  getUserRole,
  mergeOrderDocuments,
  shouldApplyIndiaGst,
} from "./quotationHelpers.js";
import { formatReportId } from "@/app/utils/reportId.js";

const MEDICINE_TEXT_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9\s()+,./%-]*$/;
const DOSAGE_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9\s()+,./%-]*$/;
const ACCOUNTANT_SERVICE_OPTIONS = [
  { value: "ONLINE_PHARMACY", label: "Online Pharmacy" },
  { value: "PRESCRIPTION_ANALYSIS", label: "Prescription Analysis" },
  { value: "SECOND_OPINION", label: "Second Opinion" },
];
const GENERAL_SERVICE_OPTIONS = [
  { value: "General", label: "General" },
  { value: "PRESCRIPTION_ANALYSIS", label: "Prescription Analysis" },
  { value: "ONLINE_PHARMACY", label: "Online Pharmacy" },
  { value: "SECOND_OPINION", label: "Second Opinion" },
];

const createEmptyMedicine = () => ({
  name: "",
  brand: "",
  dosage: "",
  quantity: "",
  pricePerUnit: "",
});

const ensureMinimumMedicines = (items = [], minimum = 2) => {
  const normalizedItems = Array.isArray(items)
    ? items.map((item) => ({
        ...createEmptyMedicine(),
        ...item,
        quantity:
          item?.quantity === 0 || item?.quantity
            ? String(item.quantity)
            : "",
        pricePerUnit:
          item?.pricePerUnit === 0 || item?.pricePerUnit
            ? String(item.pricePerUnit)
            : "",
      }))
    : [];

  while (normalizedItems.length < minimum) {
    normalizedItems.push(createEmptyMedicine());
  }

  return normalizedItems;
};

const getCurrentUserId = () => {
  try {
    const storedUser = getStoredUser();

    if (storedUser?.id) {
      return storedUser.id;
    }

    if (storedUser?.userId) {
      return storedUser.userId;
    }

    const fallbackStoredUser =
      localStorage.getItem("user") || sessionStorage.getItem("user");

    if (!fallbackStoredUser) return null;

    const parsedUser = JSON.parse(fallbackStoredUser);
    return parsedUser?.id ?? parsedUser?.userId ?? null;
  } catch {
    return null;
  }
};

const unwrapApiResponse = (response) => response?.data ?? response ?? null;

const EMAIL_REQUEST_TIMEOUT_MS = 20000;
const SUBMISSION_REQUEST_TIMEOUT_MS = 20000;
const DELIVERY_GST_RATE = 0.18;
const LOCKED_QUOTATION_STATUSES = new Set(["SENT", "COMPLETED"]);

const withTimeout = (promise, timeoutMs, message) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);

const sanitizeMedicineText = (value) =>
  value.replace(/[^a-zA-Z0-9\s()+,./%-]/g, "").replace(/\s{2,}/g, " ");

const sanitizeWholeNumber = (value) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return "";
  }

  return String(Number.parseInt(digits, 10));
};

const sanitizePrice = (value) => {
  const sanitized = value.replace(/[^0-9.]/g, "");
  const [wholePart = "", ...decimalParts] = sanitized.split(".");
  const normalizedWholePart =
    wholePart.length > 1 ? wholePart.replace(/^0+(?=\d)/, "") : wholePart;
  const decimalPart = decimalParts.join("").slice(0, 2);

  if (sanitized.includes(".")) {
    return `${normalizedWholePart || "0"}.${decimalPart}`;
  }

  return normalizedWholePart;
};

const isMedicineRowEmpty = (medicine) =>
  !medicine?.name?.trim() &&
  !medicine?.brand?.trim() &&
  !medicine?.dosage?.trim() &&
  !String(medicine?.quantity ?? "").trim() &&
  !String(medicine?.pricePerUnit ?? "").trim();

const validateMedicine = (medicine) => {
  const errors = {};
  const name = medicine?.name?.trim() || "";
  const brand = medicine?.brand?.trim() || "";
  const dosage = medicine?.dosage?.trim() || "";
  const quantityValue = String(medicine?.quantity ?? "").trim();
  const priceValue = String(medicine?.pricePerUnit ?? "").trim();

  if (!name) {
    errors.name = "Active molecule is required.";
  } else if (name.length < 2 || name.length > 100 || !MEDICINE_TEXT_PATTERN.test(name)) {
    errors.name = "Enter a valid active molecule name using letters, numbers, spaces, and standard medicine symbols.";
  }

  if (brand && (brand.length > 100 || !MEDICINE_TEXT_PATTERN.test(brand))) {
    errors.brand = "Enter a valid medicine brand using letters, numbers, spaces, and standard medicine symbols.";
  }

  if (!dosage) {
    errors.dosage = "Dosage is required.";
  } else if (dosage.length > 50 || !DOSAGE_PATTERN.test(dosage)) {
    errors.dosage = "Enter a valid dosage such as 500 mg, 5 ml, or 1 tablet.";
  }

  if (!quantityValue) {
    errors.quantity = "Quantity is required.";
  } else {
    const quantity = Number.parseInt(quantityValue, 10);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 9999) {
      errors.quantity = "Quantity must be a whole number between 1 and 9999.";
    }
  }

  if (!priceValue) {
    errors.pricePerUnit = "Price per unit is required.";
  } else {
    const price = Number.parseFloat(priceValue);
    if (!/^\d+(\.\d{1,2})?$/.test(priceValue) || Number.isNaN(price) || price <= 0 || price > 1000000) {
      errors.pricePerUnit = "Price per unit must be greater than 0 and can include up to 2 decimal places.";
    }
  }

  return errors;
};

export default function AccountantQuotation() {
  const { prescriptionId } = useParams();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const [loading, setLoading] = useState(true);

  const [showAllUsers, setShowAllUsers] = useState(true);
  const [allDocuments, setAllDocuments] = useState([]);
  const [allOrders, setAllOrders] = useState([]);

  const [order, setOrder] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [orderBill, setOrderBill] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [quotationId, setQuotationId] = useState(null);
  const [medicines, setMedicines] = useState(() => ensureMinimumMedicines());
  const [medicineErrors, setMedicineErrors] = useState([]);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserDocuments, setSelectedUserDocuments] = useState([]);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [newQuotationServiceType, setNewQuotationServiceType] =
    useState("ONLINE_PHARMACY");

  const showError = (text, title = "Error") =>
    Swal.fire({ icon: "error", title, text, confirmButtonColor: "#2563EB" });

  const showSuccess = (text, title = "Success") =>
    Swal.fire({ icon: "success", title, text, confirmButtonColor: "#2563EB" });

  const showToast = (icon, title, text) =>
    Swal.fire({
      toast: true,
      position: "top-end",
      icon,
      title,
      text,
      showConfirmButton: false,
      timer: 4500,
      timerProgressBar: true,
    });

  const openDocumentsModal = (user, docs) => {
    setSelectedUser(user);
    setSelectedUserDocuments(docs);
    setShowDocumentsModal(true);
  };

  useEffect(() => {
    if (prescriptionId && prescriptionId !== 'new') {
      fetchQuotationOrOrder();
      setShowAllUsers(false);
    } else if (prescriptionId === 'new') {
      setShowAllUsers(false);
      setLoading(false);
    } else {
      fetchAllOrders();
      fetchAllDocuments();
    }
  }, [prescriptionId]);

  const applyQuotationResponse = async (quotationResponse) => {
    if (!quotationResponse?.id) {
      return false;
    }

    const quotationStatus = String(quotationResponse.status || "").toUpperCase();
    setIsViewOnly(LOCKED_QUOTATION_STATUSES.has(quotationStatus));
    setIsEmailSent(Boolean(quotationResponse.emailSent));
    setQuotationId(quotationResponse.id);

    if (quotationResponse.items) {
      try {
        const items = JSON.parse(quotationResponse.items);
        if (Array.isArray(items) && items.length > 0) {
          setMedicines(ensureMinimumMedicines(items));
        }
      } catch (parseError) {
        console.error("Error parsing quotation items:", parseError);
      }
    }

    setDeliveryCharge(Number(quotationResponse.deliveryCharge || 0));

    if (quotationResponse.order) {
      const loadedOrder = unwrapApiResponse(quotationResponse.order);
      setOrder(loadedOrder);
      if (loadedOrder?.id) {
        await fetchDocumentsForOrder(loadedOrder.id, loadedOrder);
        await fetchOrderBill(loadedOrder.id);
      }
      return true;
    }

    if (quotationResponse.orderId) {
      try {
        const orderResp = await orderAPI.getOrderById(quotationResponse.orderId);
        const loadedOrder = orderResp.data || orderResp;
        if (loadedOrder) {
          setOrder(loadedOrder);
          await fetchDocumentsForOrder(quotationResponse.orderId, loadedOrder);
          await fetchOrderBill(quotationResponse.orderId);
        }
      } catch (e) {
        console.log("Could not fetch order:", e.message);
      }
    }

    return true;
  };

  const fetchQuotationOrOrder = async () => {
    setLoading(true);
    try {
      if (!prescriptionId || prescriptionId === 'new') {
        await fetchOrder();
        setLoading(false);
        return;
      }
      
      const orderId = parseInt(prescriptionId, 10);
      
      let quotationResponse = null;
      try {
        quotationResponse = !isNaN(orderId) && orderId > 0
          ? unwrapApiResponse(await quotationAPI.getQuotationByOrderId(orderId))
          : null;
      } catch (e) {
        quotationResponse = null;
      }

      if (await applyQuotationResponse(quotationResponse)) {
        setLoading(false);
        return;
      }

      try {
        const quotationByIdResponse = !isNaN(orderId) && orderId > 0
          ? unwrapApiResponse(await quotationAPI.getQuotationById(orderId))
          : null;

        if (await applyQuotationResponse(quotationByIdResponse)) {
          setLoading(false);
          return;
        }
      } catch (e) {
        console.log("Could not fetch quotation by id:", e.message);
      }
      
      if (!isNaN(orderId) && orderId > 0) {
        try {
          const loadedOrder = await fetchOrder();
          if (loadedOrder?.id) {
            await fetchDocumentsForOrder(loadedOrder.id, loadedOrder);
            await fetchOrderBill(loadedOrder.id);
          } else if (order?.id) {
            await fetchDocumentsForOrder(order.id, order);
            await fetchOrderBill(order.id);
          }
        } catch (orderError) {
          console.error("Error fetching order:", orderError);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error in fetchQuotationOrOrder:", error);
      setLoading(false);
    }
  };

  const fetchDocumentsForOrder = async (orderId, providedOrder = null) => {
    if (!orderId) return;
    
    try {
      let currentOrder = providedOrder || order;
      if (!currentOrder) {
        try {
          const orderResp = await orderAPI.getOrderById(orderId);
          currentOrder = orderResp.data || orderResp;
        } catch (e) {
          console.log("Could not fetch order:", e.message);
        }
      }

      const orderResponse = await documentAPI.getDocumentsByOrder(orderId).catch(() => []);
      const docs = orderResponse?.data || orderResponse || [];
      setDocuments(mergeOrderDocuments(docs, currentOrder));
    } catch (error) {
      console.error("Error fetching documents:", error);
      setDocuments([]);
    }
  };

  const fetchOrderBill = async (orderId) => {
    if (!orderId) return;
    
    try {
      const response = await orderAPI.getBillPath(orderId);
      const billData = response.data || response;
      if (billData.hasBill && billData.filePath) {
        setOrderBill(billData);
      } else {
        setOrderBill(null);
      }
    } catch (error) {
      console.error("Error fetching bill:", error);
      setOrderBill(null);
    }
  };

  const viewOrderBill = async () => {
    if (!order?.id || !orderBill?.filePath) return;
    
    try {
      const response = await orderAPI.downloadBill(order.id);
      const billData = response.data || response;
      
      if (billData.filePath) {
        window.open(`/api/orders/${order.id}/bill/view`, '_blank');
      } else {
        Swal.fire({ icon: "info", title: "No Bill", text: "No bill found for this order", confirmButtonColor: "#2563EB" });
      }
    } catch (error) {
      console.error("Error viewing bill:", error);
      Swal.fire({ icon: "error", title: "Error", text: "Failed to view bill", confirmButtonColor: "#2563EB" });
    }
  };

  const downloadOrderBill = async () => {
    if (!order?.id || !orderBill?.filePath) return;
    
    try {
      window.open(`/api/orders/${order.id}/bill/download`, '_blank');
    } catch (error) {
      console.error("Error downloading bill:", error);
      Swal.fire({ icon: "error", title: "Error", text: "Failed to download bill", confirmButtonColor: "#2563EB" });
    }
  };

  const fetchAllOrders = async () => {
    setLoading(true);
    try {
      const response = await orderAPI.getAllOrders();
      const orders = response.data || response || [];
      const pendingOrders = orders.filter(order => {
        const status = order.status?.toUpperCase();
        return status !== 'SENT' && status !== 'COMPLETED';
      });
      setAllOrders(pendingOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllDocuments = async () => {
    setLoading(true);
    try {
      const response = await documentAPI.getAll();
      const docs = response.data || response || [];
      setAllDocuments(docs);
    } catch (error) {
      console.error("Error fetching all documents:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchOrder = async () => {
    setLoading(true);
    try {
      // Use getOrderById endpoint to get full order details including user
      const response = await orderAPI.getOrderById(prescriptionId);
      const orderData = response.data || response;
      setOrder(orderData);
      return orderData;
    } catch (error) {
      console.error("Error fetching order with details:", error);
      // Fallback to regular getOrderById
      try {
        const fallbackResponse = await orderAPI.getOrderById(prescriptionId);
        const orderData = fallbackResponse.data || fallbackResponse;
        setOrder(orderData);
        return orderData;
      } catch (fallbackError) {
        console.error("Error fetching order (fallback):", fallbackError);
        return null;
      }
    } finally {
      setLoading(false);
    }
  };

  const viewDocument = async (doc) => {
    let documentData = doc;
    
    Swal.fire({
      title: 'Loading...',
      html: '<div class="w-12 h-12 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto"></div>',
      showCancelButton: false,
      showConfirmButton: false,
      allowOutsideClick: false
    });
    
    if (!doc.fileData && doc.id) {
      try {
        const response = await documentAPI.getDocumentWithData(doc.id);
        const result = response.data || response;
        if (result.fileData) {
          documentData = { ...result.document, fileData: result.fileData };
        } else {
          documentData = result.document;
        }
      } catch (error) {
        console.error("Error fetching document:", error);
        Swal.close();
        Swal.fire({ icon: "error", title: "Error", text: "Failed to load document", confirmButtonColor: "#2563EB" });
        return;
      }
    }
    
    Swal.close();
    
    if (!documentData.fileData) {
      Swal.fire({ icon: "info", title: "No Preview", text: "File content is not available for preview", confirmButtonColor: "#2563EB" });
      return;
    }
    
    const isImage = documentData.mimeType?.startsWith('image/') || documentData.originalFileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const isPdf = documentData.mimeType === 'application/pdf' || documentData.originalFileName?.toLowerCase().endsWith('.pdf');
    
    if (isImage) {
      Swal.fire({
        title: 'Document Preview',
        html: `<img src="data:${documentData.mimeType || 'image/jpeg'};base64,${documentData.fileData}" style="max-width:100%; max-height:500px;" />`,
        width: '600px',
        confirmButtonColor: "#2563EB",
        confirmButtonText: "Close"
      });
    } else if (isPdf) {
      try {
        const pdfData = base64ToBlob(documentData.fileData, documentData.mimeType || 'application/pdf');
        const pdfUrl = URL.createObjectURL(pdfData);
        Swal.fire({
          title: 'Document Preview',
          html: `<iframe src="${pdfUrl}" style="width:100%; height:500px; border:none;"></iframe>`,
          width: '800px',
          confirmButtonColor: "#2563EB",
          confirmButtonText: "Close",
          didClose: () => { URL.revokeObjectURL(pdfUrl); }
        });
      } catch (e) {
        console.error("Error displaying PDF:", e);
        Swal.fire({ icon: "info", title: "PDF Download", text: "PDF cannot be previewed. Please download instead.", confirmButtonColor: "#2563EB" });
      }
    } else {
      Swal.fire({
        title: 'Document Details',
        html: `<div class="text-left"><p><strong>File Name:</strong> ${documentData.originalFileName || 'N/A'}</p><p><strong>Category:</strong> ${documentData.category || 'N/A'}</p><p><strong>Type:</strong> ${documentData.mimeType || 'Unknown'}</p><p><strong>Size:</strong> ${(documentData.fileSize / 1024).toFixed(1)} KB</p></div>`,
        confirmButtonColor: "#2563EB",
        confirmButtonText: "Close"
      });
    }
  };
  
  const base64ToBlob = (base64, mimeType) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  const downloadDocument = async (doc) => {
    let documentData = doc;
    
    Swal.fire({
      title: 'Loading...',
      html: '<div class="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto"></div>',
      showCancelButton: false,
      showConfirmButton: false,
      allowOutsideClick: false,
      timer: 5000
    });
    
    if (!doc.fileData && doc.id) {
      try {
        const response = await documentAPI.getDocumentWithData(doc.id);
        const result = response.data || response;
        if (result.fileData) {
          documentData = { ...result.document, fileData: result.fileData };
        } else {
          documentData = result.document;
        }
      } catch (error) {
        console.error("Error fetching document:", error);
        Swal.close();
        Swal.fire({ icon: "error", title: "Error", text: "Failed to download document", confirmButtonColor: "#2563EB" });
        return;
      }
    }
    
    Swal.close();
    
    if (!documentData.fileData) {
      Swal.fire({ icon: "info", title: "No Download", text: "File content is not available for download", confirmButtonColor: "#2563EB" });
      return;
    }
    
    const link = document.createElement('a');
    link.href = `data:${documentData.mimeType || 'application/octet-stream'};base64,${documentData.fileData}`;
    link.download = documentData.originalFileName || 'document';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    Swal.fire({ icon: "success", title: "Download Started", text: `Downloading ${documentData.originalFileName}...`, confirmButtonColor: "#2563EB" });
  };

  const userRole = useMemo(() => getUserRole(), []);
  const newQuotationServiceOptions =
    userRole === "ACCOUNTANT" ? ACCOUNTANT_SERVICE_OPTIONS : GENERAL_SERVICE_OPTIONS;
  const orderData = useMemo(() => buildOrderData(order, documents), [documents, order]);
  const summary = useMemo(() => {
    const country = orderData?.deliveryCountry || "India";
    const applyGst = shouldApplyIndiaGst(country);
    const subtotal = medicines.reduce(
      (sum, med) =>
        sum + (Number.parseFloat(med.quantity) || 0) * (Number.parseFloat(med.pricePerUnit) || 0),
      0,
    );
    const deliveryGst = applyGst ? deliveryCharge * DELIVERY_GST_RATE : 0;
    const deliveryChargeWithGst = deliveryCharge + deliveryGst;

    return {
      country,
      currencyLabel: getCurrencyLabel(country),
      applyGst,
      subtotal,
      deliveryCharge,
      deliveryGst,
      deliveryChargeWithGst,
      total: subtotal + deliveryChargeWithGst,
    };
  }, [deliveryCharge, medicines, orderData?.deliveryCountry]);

  const addMedicine = (medicine = null) => {
    if (medicine) {
      setMedicines([
        ...medicines,
        {
          ...createEmptyMedicine(),
          name: medicine.name,
          brand: medicine.brand,
          dosage: medicine.dosage,
          quantity: "1",
          pricePerUnit:
            medicine.pricePerUnit === 0 || medicine.pricePerUnit
              ? String(medicine.pricePerUnit)
              : "",
        },
      ]);
    } else {
      setMedicines([...medicines, createEmptyMedicine()]);
    }
  };

  const removeMedicine = (index) => {
    setMedicines(ensureMinimumMedicines(medicines.filter((_, i) => i !== index)));
    setMedicineErrors((prev) => ensureMinimumMedicines(prev.filter((_, i) => i !== index)));
  };

  const updateMedicine = (index, field, value) => {
    const updated = [...medicines];
    let nextValue = value;

    if (field === "name" || field === "brand") {
      nextValue = sanitizeMedicineText(value);
    } else if (field === "dosage") {
      nextValue = sanitizeMedicineText(value);
    } else if (field === "quantity") {
      nextValue = sanitizeWholeNumber(value);
    } else if (field === "pricePerUnit") {
      nextValue = sanitizePrice(value);
    }

    updated[index] = { ...updated[index], [field]: nextValue };
    setMedicines(updated);
    setMedicineErrors((prev) => {
      const nextErrors = [...prev];
      if (nextErrors[index]?.[field]) {
        nextErrors[index] = {
          ...nextErrors[index],
          [field]: undefined,
        };
      }
      return nextErrors;
    });
  };

  const calculateTotal = () => {
    return medicines.reduce(
      (sum, med) =>
        sum + (Number.parseFloat(med.quantity) || 0) * (Number.parseFloat(med.pricePerUnit) || 0),
      0,
    );
  };

  const sendQuotationEmailInBackground = async (orderId) => {
    if (!quotationId) {
      return {
        success: false,
        skipped: true,
        message: "Please save the quotation first, then send the email.",
      };
    }

    return withTimeout(
      quotationAPI.sendEmail(quotationId),
      EMAIL_REQUEST_TIMEOUT_MS,
      "Email request timed out."
    )
      .then(() => ({ success: true }))
      .catch((emailError) => {
        console.error("Quotation email could not be completed in background:", emailError);
        return {
          success: false,
          message:
            emailError?.response?.data?.error ||
            emailError?.response?.data?.message ||
            emailError?.message ||
            "Quotation email could not be sent.",
        };
      });
  };

  const resolveQuotationForEmail = async () => {
    if (quotationId) {
      return quotationId;
    }

    const parsedId = parseInt(prescriptionId, 10);
    if (Number.isNaN(parsedId) || parsedId <= 0) {
      return null;
    }

    try {
      const quotationById = unwrapApiResponse(await quotationAPI.getQuotationById(parsedId));
      if (await applyQuotationResponse(quotationById)) {
        return quotationById.id;
      }
    } catch (error) {
      console.log("Could not resolve quotation by id for email:", error?.message);
    }

    try {
      const quotationByOrderId = unwrapApiResponse(await quotationAPI.getQuotationByOrderId(parsedId));
      if (await applyQuotationResponse(quotationByOrderId)) {
        return quotationByOrderId.id;
      }
    } catch (error) {
      console.log("Could not resolve quotation by order id for email:", error?.message);
    }

    return null;
  };

  const handleSendEmail = async () => {
    if (isEmailSent) {
      showToast("info", "Email already sent", "This quotation email has already been sent.");
      return;
    }

    const resolvedQuotationId = await resolveQuotationForEmail();

    if (!resolvedQuotationId) {
      showError("Please save the quotation first, then send the email.");
      return;
    }

    setSendingEmail(true);

    try {
      const emailStatus = await sendQuotationEmailInBackground(order?.id);

      if (emailStatus?.success) {
        setIsEmailSent(true);
        showToast("success", "Email sent", "Quotation email with PDF attachment was sent successfully.");
      } else {
        showToast(
          "error",
          "Email failed",
          emailStatus?.message || "Quotation email could not be sent."
        );
      }
    } finally {
      setSendingEmail(false);
    }
  };

  const exportPDF = async () => {
    setLoading(true);
    try {
      if (!quotationId && !order?.id) {
        showError("No order data available for PDF export.");
        return;
      }

      const response = quotationId
        ? await quotationAPI.downloadPdf(quotationId)
        : await quotationAPI.downloadPdfByOrderId(order.id);

      if (!response.ok) {
        throw new Error("Failed to download quotation PDF.");
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const fileName = `Quotation_${orderData?.orderNumber || prescriptionId || Date.now()}_${new Date().toISOString().split('T')[0]}.pdf`;
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);

      showSuccess("The quotation has been downloaded successfully.", "PDF Downloaded!");
    } catch (error) {
      console.error('Error generating PDF:', error);
      showError("Failed to generate PDF. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isViewOnly) {
      return;
    }
    
    const normalizedErrors = medicines.map((medicine) =>
      isMedicineRowEmpty(medicine) ? {} : validateMedicine(medicine),
    );
    const hasValidationErrors = normalizedErrors.some(
      (errors) => Object.keys(errors).length > 0,
    );
    const validMedicines = medicines
      .filter((medicine) => !isMedicineRowEmpty(medicine))
      .map((medicine) => ({
        ...medicine,
        name: medicine.name.trim(),
        brand: medicine.brand.trim(),
        dosage: medicine.dosage.trim(),
        quantity: Number.parseInt(medicine.quantity, 10),
        pricePerUnit: Number.parseFloat(medicine.pricePerUnit),
      }));

    setMedicineErrors(normalizedErrors);

    if (!isViewOnly && validMedicines.length === 0) {
      Swal.fire({ icon: "warning", title: "No Medicines Added", text: "Please add at least one medicine before generating the bill.", confirmButtonColor: "#2563EB" });
      return;
    }

    if (hasValidationErrors) {
      Swal.fire({
        icon: "warning",
        title: "Check Medicine Details",
        text: "Please correct the highlighted medicine fields before submitting the quotation.",
        confirmButtonColor: "#2563EB",
      });
      return;
    }
    
    setSubmitting(true);
    
    try {
      const subtotal = calculateTotal();
      const applyGst = shouldApplyIndiaGst(orderData?.deliveryCountry || "India");
      const deliveryGst = applyGst ? deliveryCharge * DELIVERY_GST_RATE : 0;
      const deliveryChargeWithGst = deliveryCharge + deliveryGst;
      const totalAmount = subtotal + deliveryChargeWithGst;
      
      const quotationData = {
        items: JSON.stringify(validMedicines),
        subtotal: subtotal,
        cgst: 0,
        sgst: 0,
        discount: 0,
        deliveryCharge: deliveryCharge,
        deliveryGst: deliveryGst,
        totalAmount: totalAmount,
        status: "SENT",
        orderId: order?.id
      };
      
      const userId = order?.user?.id;
      const createdById = getCurrentUserId();

      if (!userId) {
        throw new Error("Patient account not found for this quotation.");
      }

      if (!createdById) {
        throw new Error("Logged in accountant details not found. Please login again.");
      }
      
      const orderUpdatePromises = [];
      if (order?.id) {
        const totalAmountNum = parseFloat(totalAmount);
        const userEmail = order?.user?.email;
        
        orderUpdatePromises.push(
          orderAPI.updateTotalAmount(order.id, totalAmountNum).catch(err => {
            console.error("Error updating total amount:", err);
            return null;
          }),
          orderAPI.updateOrderStatus(order.id, "SENT").catch(err => {
            console.error("Error updating order status:", err);
            return null;
          })
        );
        
        if (userEmail) {
          orderUpdatePromises.push(
            orderAPI.updateUserEmail(order.id, userEmail).catch(err => {
              console.error("Error updating user email:", err);
              return null;
            })
          );
        }
      }
      
      await withTimeout(
        Promise.all(orderUpdatePromises),
        SUBMISSION_REQUEST_TIMEOUT_MS,
        "Order update request timed out. Please try again."
      );
      const savedQuotation = await withTimeout(
        quotationAPI.createQuotation(quotationData, userId, createdById, order?.id),
        SUBMISSION_REQUEST_TIMEOUT_MS,
        "Quotation save request timed out. Please try again."
      );
      const savedQuotationData = unwrapApiResponse(savedQuotation);
      setQuotationId(savedQuotationData?.id || null);
      setIsViewOnly(true);
      setOrder((prevOrder) =>
        prevOrder
          ? {
              ...prevOrder,
              status: "SENT",
            }
          : prevOrder,
      );

      await Swal.fire({
        icon: "success",
        title: "Premium Bill Generated!",
        text: "The premium bill has been saved successfully.",
        confirmButtonColor: "#2563EB",
        confirmButtonText: "OK"
      });
    } catch (error) {
      console.error("Error saving quotation:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to save bill. Please try again.";

      Swal.fire({ icon: "error", title: "Error", text: errorMessage, confirmButtonColor: "#2563EB" });
    } finally {
      setSubmitting(false);
    }
  };




  if (loading) {
    return (
      <>
        <Navbar role="accountant" />
        <main className="flex-1 py-16 px-4 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500 text-lg">Loading...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (showAllUsers) {
    return (
      <>
        <Navbar role="accountant" />
        <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
          <div className="max-w-7xl mx-auto">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-[#1E3A8A] mb-2">Prescription Bills</h1>
                <p className="text-lg text-gray-600">View and manage patient prescription bills</p>
              </div>
              <button onClick={() => { setShowAllUsers(false); setOrder(null); setDocuments([]); navigate('/accountant/quotation/new'); }} className="flex items-center gap-2 px-5 sm:px-8 py-3.5 bg-gradient-to-r from-[#16A34A] to-[#15803D] text-white rounded-xl hover:from-[#15803D] hover:to-[#166534] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                <Plus className="w-5 h-5" /> Create New Bill
              </button>
            </motion.div>

            {allOrders.length === 0 && allDocuments.length === 0 ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl shadow-xl p-16 text-center border border-gray-100">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FolderOpen className="w-12 h-12 text-[#2563EB]" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-700 mb-3">No Prescriptions Found</h3>
                <p className="text-gray-500 text-lg">No prescriptions have been submitted yet.</p>
              </motion.div>
            ) : (
              <>
                {allOrders.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
                    <div className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] px-6 py-4">
                      <h2 className="text-xl text-white font-semibold">Orders / Bills</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 text-gray-700">
                          <tr>
                            <th className="px-6 py-3 text-left font-semibold">Report ID</th>
                            <th className="px-6 py-3 text-left font-semibold">Patient Name</th>
                            <th className="px-6 py-3 text-left font-semibold">Email</th>
                            <th className="px-6 py-3 text-left font-semibold">Service Type</th>
                            <th className="px-6 py-3 text-left font-semibold">Amount</th>
                            <th className="px-6 py-3 text-center font-semibold">Status</th>
                            <th className="px-6 py-3 text-center font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {allOrders.map((order, index) => {
                            let displayServiceType = order.serviceType || 'General';
                            try {
                              if (order.orderDetails) {
                                const orderDetails = JSON.parse(order.orderDetails);
                                displayServiceType = order.serviceType || orderDetails.serviceType || 'General';
                              }
                            } catch (e) { }
                            
                            return (
                              <tr key={order.id || index} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                  <span className="font-medium text-gray-900">
                                    {formatReportId(order.orderNumber || order.id)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-gray-600">{order.user?.fullName || 'Unknown'}</td>
                                <td className="px-6 py-4 text-gray-600">{order.user?.email || 'N/A'}</td>
                                <td className="px-6 py-4 text-gray-600">{displayServiceType}</td>
                                <td className="px-6 py-4 text-gray-700 font-semibold">{formatCurrency(order.totalAmount, order.deliveryCountry || order.user?.country || "India")}</td>
                                <td className="px-6 py-4 text-center">
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                    order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                    order.status === 'PROCESSING' ? 'bg-blue-100 text-blue-700' :
                                    order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                    'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {order.status || 'PENDING'}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => navigate(`/accountant/quotation/${order.id}`)} className="px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1E40AF] flex items-center gap-2 transition-colors">
                                      <Eye className="w-4 h-4" />
                                      Preview
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}

                {allDocuments.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-4">
                      <h2 className="text-xl text-white font-semibold">Uploaded Prescriptions / Documents</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 text-gray-700">
                          <tr>
                            <th className="px-6 py-3 text-left font-semibold">Patient Name</th>
                            <th className="px-6 py-3 text-left font-semibold">File Name</th>
                            <th className="px-6 py-3 text-left font-semibold">Category</th>
                            <th className="px-6 py-3 text-left font-semibold">Date</th>
                            <th className="px-6 py-3 text-center font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {allDocuments.map((doc, index) => (
                            <tr key={doc.id || index} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                    <User className="w-4 h-4 text-purple-600" />
                                  </div>
                                  <span className="font-medium text-gray-900">{doc.user?.fullName || 'Unknown User'}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-gray-600">{doc.originalFileName || doc.fileName}</td>
                              <td className="px-6 py-4 text-gray-600">{doc.category || 'Document'}</td>
                              <td className="px-6 py-4 text-gray-600">{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'N/A'}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button onClick={() => viewDocument(doc)} className="px-3 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1E40AF] flex items-center gap-1 text-sm">
                                    <Eye className="w-4 h-4" /> View
                                  </button>
                                  <button onClick={() => downloadDocument(doc)} className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 text-sm">
                                    <Download className="w-4 h-4" /> Download
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </main>
        <Footer />


      </>
    );
  }

  const isNewQuotation = !order && prescriptionId === 'new';

  return (
    <>
      <Navbar role="accountant" />
      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <Header
            showAllUsers={false}
            onBack={() => { setShowAllUsers(true); navigate("/accountant/quotation"); }}
            orderData={orderData}
            isNewQuotation={isNewQuotation}
            isViewOnly={isViewOnly}
            documentsCount={documents.length}
            onOpenDocuments={() => openDocumentsModal({ user: order?.user, documents }, documents)}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-8">
            <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24 border border-gray-100">
                <h3 className="text-xl font-semibold text-[#1E3A8A] mb-4">{isNewQuotation ? 'Customer Details' : 'Patient & Order Details'}</h3>
                <div className="space-y-3 text-gray-700">
                  {isNewQuotation ? (
                    <>
                      <div className="flex items-start gap-2"><User className="w-4 h-4 mt-1 text-gray-400" /><div><p className="text-sm text-gray-500">Customer Name</p><input type="text" placeholder="Enter customer name" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2563EB]" /></div></div>
                      <div className="flex items-start gap-2"><FileText className="w-4 h-4 mt-1 text-gray-400" /><div><p className="text-sm text-gray-500">Email</p><input type="email" placeholder="Enter email" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2563EB]" /></div></div>
                      <div className="flex items-start gap-2"><Calendar className="w-4 h-4 mt-1 text-gray-400" /><div><p className="text-sm text-gray-500">Phone</p><input type="tel" placeholder="Enter phone" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2563EB]" /></div></div>
                      <div className="pt-3 border-t border-gray-200">
                        <p className="text-sm text-gray-500 mb-1">Service Type</p>
                        <CustomSelect
                          value={newQuotationServiceType}
                          onChange={setNewQuotationServiceType}
                          buttonClassName="rounded-lg px-3 py-2"
                          menuClassName="rounded-xl"
                          optionClassName="rounded-lg px-3 py-2.5"
                          options={newQuotationServiceOptions}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-2"><User className="w-4 h-4 mt-1 text-gray-400" /><div><p className="text-sm text-gray-500">Patient</p><p>{orderData?.patientName}</p></div></div>
                      <div className="flex items-start gap-2"><FileText className="w-4 h-4 mt-1 text-gray-400" /><div><p className="text-sm text-gray-500">Email</p><p>{orderData?.patientEmail}</p></div></div>
                      <div className="flex items-start gap-2"><Calendar className="w-4 h-4 mt-1 text-gray-400" /><div><p className="text-sm text-gray-500">Date</p><p>{new Date(orderData?.uploadedDate).toLocaleDateString()}</p></div></div>
                      <div className="pt-3 border-t border-gray-200">
                        <p className="text-sm text-gray-500 mb-1">Service Type</p>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          {userRole === 'ACCOUNTANT' ? 'Online Pharmacy' : orderData?.serviceType === 'PRESCRIPTION_ANALYSIS' ? 'Prescription Analysis' : orderData?.serviceType === 'SECOND_OPINION' ? 'Second Opinion' : orderData?.serviceType}
                        </span>
                      </div>
                      {orderData?.deliveryAddress && (
                        <div className="pt-3 border-t border-gray-200">
                          <p className="text-sm text-gray-500 mb-1">Delivery Address</p>
                          <div className="text-sm text-gray-700 space-y-1">
                            {orderData?.deliveryAddress && <p>{orderData.deliveryAddress}</p>}
                            {orderData?.deliveryCity && <p>{orderData.deliveryCity}{orderData?.deliveryState || orderData?.deliveryPincode ? ', ' : ''}{orderData?.deliveryState}{orderData?.deliveryPincode ? ' - ' : ''}{orderData?.deliveryPincode}</p>}
                            {orderData?.deliveryCountry && orderData.deliveryCountry !== 'India' && <p>{orderData.deliveryCountry}</p>}
                            {orderData?.deliveryPhone && <p className="flex items-center gap-1 mt-2">
                              <span className="text-xs">📞</span> {orderData.deliveryPhone}
                            </p>}
                          </div>
                        </div>
                      )}
                      {orderData?.notes && (
                        <div className="pt-3 border-t border-gray-200">
                          <p className="text-sm text-gray-500 mb-1">Notes</p>
                          <p className="text-sm">{orderData.notes}</p>
                        </div>
                      )}
                      {orderBill && (
                        <div className="pt-3 border-t border-gray-200">
                          <p className="text-sm text-gray-500 mb-2">OnLipharmacy Bill</p>
                          <div className="flex items-center justify-between bg-green-50 rounded-lg p-3 border border-green-200">
                            <div className="flex items-center gap-2">
                                <Receipt className="w-5 h-5 text-green-600" />
                                <div>
                                  <p className="text-sm text-green-700 font-medium">Pharmacy Bill Available</p>
                                  <p className="text-xs text-gray-500">Bill for Online Pharmacy order</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={viewOrderBill} className="px-2 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700">View</button>
                              <button onClick={downloadOrderBill} className="px-2 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700">Download</button>
                            </div>
                          </div>
                        </div>
                      )}
                      {documents.length > 0 && (
                        <div className="pt-3 border-t border-gray-200">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-sm text-gray-500">Uploaded Documents ({documents.length})</p>
                            <button onClick={() => { setSelectedUser({ user: order?.user, documents: documents }); setSelectedUserDocuments(documents); setShowDocumentsModal(true); }} className="px-3 py-1 text-sm bg-[#2563EB] text-white rounded-lg hover:bg-[#1E40AF] flex items-center gap-1">
                              <Eye className="w-3 h-3" /> View All
                            </button>
                          </div>
                          <div className="space-y-2">
                            {documents.slice(0, 3).map((doc, index) => (
                              <div key={doc.id || index} className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg p-3">
                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                  <FileText className="w-5 h-5 shrink-0 text-[#2563EB]" />
                                  <div className="min-w-0 flex-1">
                                    <p className="break-all text-sm text-gray-700 font-medium">{doc.originalFileName || doc.fileName}</p>
                                    <p className="text-xs text-gray-500">{doc.user?.fullName ? `By: ${doc.user.fullName} • ` : ''}{doc.category || 'Document'} • {(doc.fileSize / 1024).toFixed(1)} KB</p>
                                  </div>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                  <button onClick={() => viewDocument(doc)} className="px-2 py-1 text-xs bg-[#2563EB] text-white rounded-lg hover:bg-[#1E40AF]">View</button>
                                  <button onClick={() => downloadDocument(doc)} className="px-2 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700">Download</button>
                                </div>
                              </div>
                            ))}
                            {documents.length > 3 && (
                              <p className="text-xs text-gray-500 text-center">+{documents.length - 3} more documents</p>
                            )}
                          </div>
                        </div>
                      )}
                      {orderData?.files && orderData.files.length > 0 && (
                        <div className="pt-3 border-t border-gray-200">
                          <p className="text-sm text-gray-500 mb-2">Uploaded Documents (Legacy)</p>
                          <div className="space-y-2">
                            {orderData.files.map((file, index) => (
                              <div key={index} className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg p-3">
                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                  <FileText className="w-5 h-5 shrink-0 text-[#2563EB]" />
                                  <div className="min-w-0 flex-1">
                                    <p className="break-all text-sm text-gray-700 font-medium">{file.name || file.category}</p>
                                    <p className="text-xs text-gray-500">{file.category}</p>
                                  </div>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                  <button onClick={() => viewLegacyFile(file)} className="px-2 py-1 text-xs bg-[#2563EB] text-white rounded-lg hover:bg-[#1E40AF]">View</button>
                                  {file.content && (
                                    <button onClick={() => downloadLegacyFile(file)} className="px-2 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700">Download</button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-gray-700 font-semibold mb-3">Total Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600"><span>Subtotal:</span><span>{formatCurrency(summary.subtotal, summary.country)}</span></div>
                    <div className="flex justify-between text-gray-600"><span>{summary.applyGst ? "Delivery Charge (incl. GST):" : "Delivery Charge:"}</span><span>{formatCurrency(summary.deliveryChargeWithGst, summary.country)}</span></div>
                    <div className="flex justify-between text-[#1E3A8A] pt-2 border-t border-gray-200 font-semibold"><span>Total:</span><span className="text-xl">{formatCurrency(summary.total, summary.country)}</span></div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-8 border border-gray-100">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold text-[#1E3A8A]">Medicine List</h3>
                    {!isViewOnly && (
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={() => addMedicine(null)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#16A34A] to-[#15803D] text-white rounded-xl hover:from-[#15803D] hover:to-[#166534] transition-all duration-300 shadow-md hover:shadow-lg">
                        <Plus className="w-4 h-4" /> Add Medicine
                      </motion.button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {medicines.map((medicine, index) => {
                      const errors = medicineErrors[index] || {};
                      const inputClass = (field) =>
                        `w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-transparent ${
                          errors[field] ? "border-red-300 bg-red-50" : "border-gray-300"
                        }`;

                      return (
                      <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div><label className="block text-sm text-gray-700 mb-2">Active Molecule</label><input type="text" value={medicine.name} onChange={(e) => updateMedicine(index, "name", e.target.value)} className={inputClass("name")} maxLength={100} placeholder="e.g. Paracetamol" required disabled={isViewOnly} />{errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}</div>
                          <div><label className="block text-sm text-gray-700 mb-2">Medicine Brand</label><input type="text" value={medicine.brand || ""} onChange={(e) => updateMedicine(index, "brand", e.target.value)} className={inputClass("brand")} maxLength={100} placeholder="e.g. Crocin" disabled={isViewOnly} />{errors.brand && <p className="mt-1 text-xs text-red-600">{errors.brand}</p>}</div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div><label className="block text-sm text-gray-700 mb-2">Dosage</label><input type="text" value={medicine.dosage} onChange={(e) => updateMedicine(index, "dosage", e.target.value)} className={inputClass("dosage")} maxLength={50} placeholder="e.g. 500 mg" required disabled={isViewOnly} />{errors.dosage && <p className="mt-1 text-xs text-red-600">{errors.dosage}</p>}</div>
                          <div><label className="block text-sm text-gray-700 mb-2">Quantity</label><input type="text" inputMode="numeric" value={medicine.quantity} onChange={(e) => updateMedicine(index, "quantity", e.target.value)} className={inputClass("quantity")} required disabled={isViewOnly} placeholder="Enter quantity" />{errors.quantity && <p className="mt-1 text-xs text-red-600">{errors.quantity}</p>}</div>
                          <div><label className="block text-sm text-gray-700 mb-2">Price/Unit ({summary.currencyLabel})</label><input type="text" inputMode="decimal" value={medicine.pricePerUnit} onChange={(e) => updateMedicine(index, "pricePerUnit", e.target.value)} className={inputClass("pricePerUnit")} required disabled={isViewOnly} placeholder="Enter price per unit" />{errors.pricePerUnit && <p className="mt-1 text-xs text-red-600">{errors.pricePerUnit}</p>}</div>
                        </div>
                        {!isViewOnly && (
                          <button type="button" onClick={() => removeMedicine(index)} className="mt-2 text-red-500 hover:text-red-700 flex items-center gap-1"><Trash2 className="w-4 h-4" /> Remove</button>
                        )}
                      </motion.div>
                      );
                    })}
                  </div>
                  
                  <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-5 text-center text-[#2563EB] font-semibold">{summary.currencyLabel}</span>
                      <h4 className="text-gray-700 font-medium">Delivery Charge</h4>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="block text-sm text-gray-600 mb-1">{summary.applyGst ? "Enter Delivery Charge (GST 18% will be added)" : "Enter Delivery Charge"}</label>
                        <input 
                          type="number" 
                          value={deliveryCharge === 0 ? "" : deliveryCharge} 
                          onChange={(e) => setDeliveryCharge(parseFloat(e.target.value) || 0)} 
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-transparent" 
                          min="0" 
                          step="0.01"
                          disabled={isViewOnly}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="text-sm text-gray-600 bg-white px-4 py-2 rounded-lg border border-gray-200">
                        <span className="text-gray-500">{summary.applyGst ? "With GST (18%):" : "Total:"}</span>
                        <span className="ml-1 font-semibold text-[#2563EB]">{formatCurrency(summary.deliveryChargeWithGst, summary.country)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 pt-6">
                    <motion.button whileHover={{ scale: isViewOnly ? 1 : 1.02 }} whileTap={{ scale: isViewOnly ? 1 : 0.98 }} type="submit" disabled={submitting || medicines.length === 0 || isViewOnly} className="flex-1 py-4 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md">
                      {submitting ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Submitting...</> : isViewOnly ? <><Send className="w-5 h-5" />Submitted</> : <><Send className="w-5 h-5" />Submit</>}
                    </motion.button>
                    {order?.id && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={handleSendEmail}
                        disabled={sendingEmail || isEmailSent}
                        className="px-6 py-4 bg-gradient-to-r from-[#0F766E] to-[#0D9488] text-white rounded-xl hover:from-[#0D9488] hover:to-[#0F766E] flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendingEmail ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Sending...</> : isEmailSent ? <><Send className="w-5 h-5" />Email Sent</> : <><Send className="w-5 h-5" />Send Email</>}
                      </motion.button>
                    )}
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
      <DocumentsModal
        isOpen={showDocumentsModal}
        selectedUser={selectedUser}
        documents={selectedUserDocuments}
        onClose={() => setShowDocumentsModal(false)}
        onView={viewDocument}
        onDownload={downloadDocument}
      />
    </>
  );
}