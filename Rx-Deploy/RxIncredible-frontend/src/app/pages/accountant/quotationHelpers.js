import { formatCurrencyAmount, isIndiaCountry } from "@/app/utils/pricing.js";

export const parseOrderDetails = (orderDetailsStr) => {
  try {
    return JSON.parse(orderDetailsStr || "{}");
  } catch {
    return {};
  }
};

export const getUserRole = () => {
  const userStr = localStorage.getItem("user");
  if (!userStr) return "ACCOUNTANT";

  try {
    const user = JSON.parse(userStr);
    return user.role || "ACCOUNTANT";
  } catch {
    return "ACCOUNTANT";
  }
};

const belowTwenty = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const tensWords = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const toWordsBelowThousand = (value) => {
  if (value === 0) return "";
  if (value < 20) return belowTwenty[value];
  if (value < 100) {
    const tensPart = tensWords[Math.floor(value / 10)];
    const unitPart = belowTwenty[value % 10];
    return unitPart ? `${tensPart} ${unitPart}` : tensPart;
  }

  const hundredPart = `${belowTwenty[Math.floor(value / 100)]} Hundred`;
  const remainder = value % 100;
  return remainder ? `${hundredPart} ${toWordsBelowThousand(remainder)}` : hundredPart;
};

export const numberToWords = (value) => {
  const number = Math.floor(Number(value) || 0);
  if (number === 0) return "Zero";

  const crore = Math.floor(number / 10000000);
  const lakh = Math.floor((number % 10000000) / 100000);
  const thousand = Math.floor((number % 100000) / 1000);
  const hundred = number % 1000;

  return [
    crore ? `${toWordsBelowThousand(crore)} Crore` : "",
    lakh ? `${toWordsBelowThousand(lakh)} Lakh` : "",
    thousand ? `${toWordsBelowThousand(thousand)} Thousand` : "",
    hundred ? toWordsBelowThousand(hundred) : "",
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
};

export const formatDate = (dateStr) => {
  if (!dateStr) return new Date().toLocaleDateString("en-GB");
  const date = new Date(dateStr);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export const resolveOrderCountry = (orderObj = {}, orderDetails = {}, user = {}) =>
  orderObj.deliveryCountry ||
  orderObj.country ||
  orderDetails.country ||
  user.country ||
  "India";

export const formatCurrency = (value, country = "India") =>
  formatCurrencyAmount(Number(value || 0).toFixed(2), country);

export const getCurrencyLabel = (country = "India") =>
  isIndiaCountry(country) ? "₹" : "$";

export const shouldApplyIndiaGst = (country = "India") => isIndiaCountry(country);

export const getDisplayServiceType = (serviceType, userRole) => {
  if (userRole === "ACCOUNTANT") return "Online Pharmacy";
  if (serviceType === "PRESCRIPTION_ANALYSIS") return "Prescription Analysis";
  if (serviceType === "SECOND_OPINION") return "Second Opinion";
  if (serviceType === "ONLINE_PHARMACY") return "Online Pharmacy";
  return serviceType || "Online Pharmacy";
};

export const buildOrderData = (order, documents) => {
  if (!order) return null;

  const orderObj = order.data || order;
  const user = orderObj.user || {};
  const orderDetails = parseOrderDetails(orderObj.orderDetails);

  const patientEmail = user.email || orderObj.userEmail || orderDetails.patientEmail || orderDetails.email || null;

  let patientName = user.fullName || orderObj.patientName || orderDetails.patientName || "Unknown Patient";
  let patientPhone = user.phone || orderObj.patientPhone || orderDetails.patientPhone || "No phone";
  let patientAddress = user.address || orderObj.patientAddress || orderDetails.patientAddress || "No address";

  const deliveryAddress =
    orderObj.deliveryAddress ||
    orderObj.shippingAddress ||
    orderObj.address ||
    orderDetails.shippingAddress ||
    orderDetails.address ||
    user.address ||
    user.deliveryAddress ||
    null;
  const deliveryCity = orderObj.deliveryCity || orderObj.city || orderDetails.city || user.city || null;
  const deliveryState = orderObj.deliveryState || orderObj.state || orderDetails.state || user.state || null;
  const deliveryPincode = orderObj.deliveryPincode || orderObj.pincode || orderDetails.pincode || user.pincode || null;
  const deliveryCountry = resolveOrderCountry(orderObj, orderDetails, user);
  const deliveryPhone = orderObj.deliveryPhone || orderDetails.deliveryPhone || user.deliveryPhone || user.phone || null;

  const fullDeliveryAddress = [
    deliveryAddress,
    deliveryCity,
    deliveryState,
    deliveryPincode,
    deliveryCountry !== "India" ? deliveryCountry : "",
  ]
    .filter(Boolean)
    .join(", ");

  if (
    patientEmail &&
    (patientEmail.includes("@rxincredible.com") ||
      patientEmail.includes("@test.com") ||
      patientEmail.includes("@example.com")) &&
    documents.length > 0 &&
    documents[0]?.user
  ) {
    patientName = documents[0].user.fullName || patientName;
    patientPhone = documents[0].user.phone || patientPhone;
    patientAddress = documents[0].user.address || patientAddress;
  }

  return {
    id: orderObj.id,
    orderNumber: orderObj.orderNumber,
    patientName,
    patientEmail: patientEmail || "No email",
    patientPhone,
    patientAddress,
    deliveryAddress,
    deliveryCity,
    deliveryState,
    deliveryPincode,
    deliveryCountry,
    deliveryPhone,
    fullDeliveryAddress: fullDeliveryAddress || null,
    doctorName: orderObj.assignedDoctor?.fullName || orderObj.doctorName || "Not Assigned",
    uploadedDate: orderObj.createdAt || orderObj.uploadedDate,
    serviceType: orderObj.serviceType || orderDetails.serviceType || "General",
    files: orderDetails.files || [],
    notes: orderDetails.notes || "",
    status: orderObj.status,
    paymentStatus: orderObj.paymentStatus,
  };
};

export const mergeOrderDocuments = (docs, order) => {
  const currentDocs = docs || [];
  if (!order) return currentDocs;

  const orderObj = order.data || order;
  const orderDetails = parseOrderDetails(orderObj.orderDetails);
  const files = Array.isArray(orderDetails.files) ? orderDetails.files : [];

  const merged = [...currentDocs];
  files.forEach((file) => {
    const exists = currentDocs.some(
      (doc) => doc.originalFileName === file.name || doc.fileName === file.name
    );

    if (!exists) {
      merged.push({
        id: `orderdetails_${file.name}`,
        originalFileName: file.name,
        fileName: file.name,
        category: file.category || "uploaded",
        fileSize: file.size || 0,
        mimeType: file.type,
        content: file.content,
        isFromOrderDetails: true,
      });
    }
  });

  return merged;
};

export const createQuotationNumber = (orderData, prescriptionId) =>
  `QT-${String(orderData?.orderNumber || prescriptionId || Date.now()).padStart(6, "0")}`;

