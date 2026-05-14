import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router";
import { motion } from "motion/react";
import {
  CheckCircle,
  FileText,
  Stethoscope,
  Pill,
  ArrowLeft,
  Loader2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import Swal from "sweetalert2";
import { Navbar } from "../../components/Navbar.jsx";
import { Footer } from "../../components/Footer.jsx";
import {
  orderAPI,
  paymentAPI,
  documentAPI,
  authAPI,
  getToken,
} from "@/services/api.js";
import {
  formatCurrencyAmount,
  getServicePricing,
  shouldApplyGstForCountry,
} from "@/app/utils/pricing.js";

const GST_RATE = 0.18;
const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

const hasRealPaymentReference = (reference) =>
  typeof reference === "string" &&
  reference.trim() !== "" &&
  !reference.startsWith("SUBMITTED-");

const loadRazorpayScript = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }

    const existingScript = document.querySelector(
      `script[src="${RAZORPAY_SCRIPT_URL}"]`,
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.Razorpay), {
        once: true,
      });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Failed to load Razorpay checkout.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) {
        resolve(window.Razorpay);
        return;
      }

      reject(new Error("Razorpay checkout did not initialize correctly."));
    };
    script.onerror = () =>
      reject(new Error("Failed to load Razorpay checkout."));
    document.body.appendChild(script);
  });

const getNormalizedServiceFee = (order, country) => {
  const orderAmount = Number(order?.totalAmount || 0);
  const serviceType = order?.serviceType;

  if (!serviceType) {
    return orderAmount;
  }

  const pricing = getServicePricing(country);
  const serviceKey =
    serviceType === "PRESCRIPTION_ANALYSIS"
      ? "prescription-analysis"
      : serviceType === "SECOND_OPINION"
        ? "second-opinion"
        : serviceType === "ONLINE_PHARMACY"
          ? "online-pharmacy"
          : null;

  if (!serviceKey) {
    return orderAmount;
  }

  const expectedBase = Number(pricing[serviceKey]?.price || 0);
  const expectedTotal =
    shouldApplyGstForCountry(country) &&
    (serviceType === "PRESCRIPTION_ANALYSIS" ||
      serviceType === "SECOND_OPINION")
      ? expectedBase + Math.round(expectedBase * GST_RATE)
      : expectedBase;

  return orderAmount === expectedTotal ? expectedBase : orderAmount;
};

export default function UserPayment() {
  const navigate = useNavigate();
  const { orderId: serviceId } = useParams();
  const location = useLocation();
  const getInitialPricingCountry = () => {
    const stateOrder = location.state?.order;
    const stateCountry =
      stateOrder?.deliveryCountry || stateOrder?.user?.country;
    if (stateCountry) {
      return stateCountry;
    }

    try {
      const storedOrder = sessionStorage.getItem("pendingOrderForPayment");
      if (storedOrder) {
        const parsedOrder = JSON.parse(storedOrder);
        const storedCountry =
          parsedOrder?.deliveryCountry || parsedOrder?.user?.country;
        if (storedCountry) {
          return storedCountry;
        }
      }
    } catch (error) {
      console.warn(
        "Unable to read pending order country from session storage",
        error,
      );
    }

    return null;
  };
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pricingCountry, setPricingCountry] = useState(
    getInitialPricingCountry,
  );
  const servicePricing = getServicePricing(pricingCountry);

  // Check if this is from email payment link
  const isPaymentLink = location.pathname.startsWith("/user/pay/");
  const isRejectLink = location.pathname.startsWith("/user/reject/");

  // Debug: Log the full path
  console.log("=== FULL PATH DEBUG ===");
  console.log("location.pathname:", location.pathname);
  console.log("serviceId from useParams:", serviceId);
  console.log("isPaymentLink:", isPaymentLink);
  console.log("isRejectLink:", isRejectLink);

  // Extract orderId from URL if it's a payment/reject link
  // Clean the serviceId - remove any trailing slashes or extra characters
  const cleanOrderId = serviceId ? serviceId.replace(/[^0-9]/g, "") : null;
  const orderIdFromUrl = isPaymentLink || isRejectLink ? cleanOrderId : null;

  console.log(
    "Payment component - serviceId:",
    serviceId,
    "cleanOrderId:",
    cleanOrderId,
    "isPaymentLink:",
    isPaymentLink,
  );

  // IMMEDIATE REDIRECT: For payment links, redirect to login BEFORE rendering
  // This runs synchronously on every render
  // Only redirect to login if user is NOT logged in
  if (isPaymentLink && orderIdFromUrl) {
    // Check if user is logged in by checking for token in localStorage
    const token = getToken();
    if (!token) {
      // User not logged in - save redirect URL and go to login
      sessionStorage.setItem(
        "redirectAfterLogin",
        "/user/pay/" + orderIdFromUrl,
      );
      // Use window.location for immediate redirect (bypasses React rendering)
      window.location.href = "/login";
      return null; // Stop rendering
    }
    // If user IS logged in, continue to show payment page
  }

  // Check if this is for an existing order (from Shipping page)
  const [existingOrder, setExistingOrder] = useState(null);

  // Handle reject mode
  const [rejectMode, setRejectMode] = useState(isRejectLink);

  // Service data from upload page or direct from services
  const [serviceData, setServiceData] = useState(null);

  const triggerBrowserDownload = (blob, fallbackFileName, response = null) => {
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const contentDisposition = response?.headers?.get?.("content-disposition");
    const matchedFileName = contentDisposition?.match(
      /filename=\"?([^"]+)\"?/i,
    )?.[1];

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

  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  const generateAndDownloadReceipt = async (orderId) => {
    if (!orderId) return;

    try {
      console.log("Generating payment receipt for order:", orderId);
      await orderAPI.generateReceipt(orderId);
      await wait(800);

      let lastReceiptError = null;

      for (let attempt = 1; attempt <= 5; attempt += 1) {
        try {
          console.log(
            `Downloading generated receipt for order ${orderId}, attempt ${attempt}`,
          );
          const downloadResponse = await orderAPI.downloadReceipt(orderId);

          if (!downloadResponse.ok) {
            throw new Error(
              `Receipt download response failed with status ${downloadResponse.status}`,
            );
          }

          const blob = await downloadResponse.blob();
          if (!blob || blob.size === 0) {
            throw new Error("Receipt download returned an empty file");
          }

          triggerBrowserDownload(
            blob,
            `Payment_Receipt_${orderId}.pdf`,
            downloadResponse,
          );
          console.log("Receipt downloaded successfully");
          return true;
        } catch (downloadError) {
          lastReceiptError = downloadError;
          console.warn(
            `Receipt download attempt ${attempt} failed:`,
            downloadError,
          );
          if (attempt < 5) {
            await wait(1200);
          }
        }
      }

      console.warn(
        "Receipt download failed after retries, trying bill download fallback",
      );
      const billResponse = await orderAPI.downloadBill(orderId);
      if (!billResponse.ok) {
        throw (
          lastReceiptError || new Error("Receipt and bill download both failed")
        );
      }

      const fallbackBlob = await billResponse.blob();
      if (!fallbackBlob || fallbackBlob.size === 0) {
        throw new Error("Bill fallback download returned an empty file");
      }

      triggerBrowserDownload(
        fallbackBlob,
        `Payment_Receipt_${orderId}.pdf`,
        billResponse,
      );
      console.log("Receipt fallback downloaded successfully");
      return true;
    } catch (receiptError) {
      console.error("Error generating/downloading receipt:", receiptError);
      return false;
    }
  };

  // Fetch existing order for payment (defined before useEffects)
  const fetchExistingOrder = async (orderId, userObj = null) => {
    console.log("fetchExistingOrder called with orderId:", orderId);
    try {
      console.log("Calling orderAPI.getById with:", orderId);
      const response = await orderAPI.getById(orderId);
      console.log("Order API response:", response);
      const order = response.data || response;
      console.log("Order data:", order);

      // Verify order ownership - use userObj if passed, otherwise fetch from API
      let user = userObj;
      if (!user) {
        try {
          const userResponse = await authAPI.getCurrentUser();
          user = userResponse.data || userResponse;
        } catch (e) {
          console.log("Could not fetch user for order verification");
        }
      }
      if (user && order.user && order.user.id !== user.id) {
        Swal.fire({
          icon: "error",
          title: "Access Denied",
          text: "You don't have permission to view this order.",
          confirmButtonColor: "#2563EB",
        }).then(() => {
          navigate("/user/orders");
        });
        return;
      }

      setExistingOrder(order);
      setPricingCountry(
        order.deliveryCountry ||
          order.user?.country ||
          user?.country ||
          "India",
      );

      // FORCE PAYMENT - Allow payment regardless of current status
      // This fixes the issue where users can't pay even though they haven't paid
      if (order.paymentStatus === "PAID") {
        // Only block if there's a valid paymentReference (real payment made)
        if (hasRealPaymentReference(order.paymentReference)) {
          Swal.fire({
            icon: "info",
            title: "Already Paid",
            text: "This order has already been paid.",
            confirmButtonColor: "#2563EB",
          }).then(() => {
            navigate("/user/orders");
          });
          return;
        }
        // Otherwise, force status to PENDING to allow payment
        console.log("Forcing payment status to PENDING to allow payment");
        order.paymentStatus = "PENDING";
        // Update the state with the modified order
        setExistingOrder(order);
      }

      // Also check sessionStorage for order details
      const storedOrder = sessionStorage.getItem("pendingOrderForPayment");
      if (storedOrder) {
        try {
          const parsed = JSON.parse(storedOrder);
          // Merge with fetched order
          setExistingOrder({ ...order, ...parsed });
        } catch (e) {}
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching order:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load order. Please try again.",
        confirmButtonColor: "#2563EB",
      }).then(() => {
        navigate("/user/orders");
      });
    }
  };

  // Handle reject mode from email link - ALWAYS redirect to login first
  useEffect(() => {
    if (isRejectLink && orderIdFromUrl) {
      // Check if we've already processed this redirect
      const isProcessing = sessionStorage.getItem("processingRejectRedirect");

      if (isProcessing === "true") {
        // Already processed, clear and fetch order
        sessionStorage.removeItem("processingRejectRedirect");
        // Fetch user from API using async IIFE
        (async () => {
          try {
            const userResponse = await authAPI.getCurrentUser();
            const user = userResponse.data || userResponse;
            fetchExistingOrder(orderIdFromUrl, user);
          } catch (e) {
            console.log("Could not fetch user");
          }
        })();
        return;
      }

      // First time - go to login
      sessionStorage.setItem("processingRejectRedirect", "true");
      sessionStorage.setItem("redirectAfterLogin", location.pathname);
      navigate("/login");
    }
  }, [isRejectLink, orderIdFromUrl, navigate, location.pathname]);

  // Check if we have an order passed via state (from Shipping page)
  useEffect(() => {
    console.log("Order from state useEffect", { state: location.state });
    const stateOrder = location.state?.order;
    if (stateOrder) {
      console.log("Order from state:", stateOrder);
      setExistingOrder(stateOrder);
      setPricingCountry(
        stateOrder.deliveryCountry || stateOrder.user?.country || "India",
      );
      // Store in session storage for persistence
      sessionStorage.setItem(
        "pendingOrderForPayment",
        JSON.stringify(stateOrder),
      );
      setLoading(false);
    }
  }, [location.state]);

  // Main useEffect - fetch order from URL for email payment links
  useEffect(() => {
    console.log("=== Main useEffect START ===", {
      serviceId,
      orderIdFromUrl,
      isPaymentLink,
      pathname: location.pathname,
    });

    // Check if user profile is complete - fetch from backend
    const checkProfileComplete = async () => {
      try {
        const userResponse = await authAPI.getCurrentUser();
        // Handle both axios response (response.data) and direct data
        const user = userResponse.data || userResponse;

        // For patients, profile is complete if fullName, phone, and address are present
        return user?.fullName && user?.phone && user?.address;
      } catch (error) {
        console.error("Error checking profile:", error);
        return false;
      }
    };

    // Only check profile completeness for new payments (not existing order payments)
    if (!existingOrder && !orderIdFromUrl && !isPaymentLink) {
      (async () => {
        const profileComplete = await checkProfileComplete();
        if (!profileComplete) {
          Swal.fire({
            icon: "warning",
            title: "Profile Incomplete",
            text: "Please complete your profile before making payment.",
            confirmButtonColor: "#2563EB",
            confirmButtonText: "Complete Profile",
            allowOutsideClick: false,
          }).then((result) => {
            if (result.isConfirmed) {
              navigate("/user/profile");
            }
          });
        }
      })();
    }

    // Handle payment link from email - check if user is logged in
    if (isPaymentLink && orderIdFromUrl) {
      console.log("=== Handling payment link, orderId:", orderIdFromUrl, "===");

      // Check if user is logged in by checking for token
      const token = getToken();
      if (token) {
        // Use async IIFE to handle async API call
        (async () => {
          try {
            const userResponse = await authAPI.getCurrentUser();
            const user = userResponse.data || userResponse;
            console.log("User logged in, fetching order...", orderIdFromUrl);
            fetchExistingOrder(orderIdFromUrl, user);
          } catch (e) {
            console.log("User not logged in, redirecting to login");
            sessionStorage.setItem(
              "redirectAfterLogin",
              "/user/pay/" + orderIdFromUrl,
            );
            navigate("/login");
          }
        })();
      } else {
        console.log("User not logged in, redirecting to login");
        sessionStorage.setItem(
          "redirectAfterLogin",
          "/user/pay/" + orderIdFromUrl,
        );
        navigate("/login");
      }
      return;
    }

    console.log("Not a payment link, checking other conditions...");

    // Handle numeric serviceId (existing order from Shipping page)
    if (
      serviceId &&
      !isNaN(serviceId) &&
      parseInt(serviceId) > 0 &&
      !isPaymentLink
    ) {
      // This is an existing order - verify user is logged in first
      const token = getToken();
      if (!token) {
        sessionStorage.setItem(
          "redirectAfterLogin",
          "/user/payment/" + serviceId,
        );
        Swal.fire({
          icon: "warning",
          title: "Login Required",
          text: "Please login to proceed with payment.",
          confirmButtonColor: "#2563EB",
        }).then(() => {
          navigate("/login");
        });
        return;
      }

      // Fetch user from API and verify role using async IIFE
      (async () => {
        try {
          const userResponse = await authAPI.getCurrentUser();
          const user = userResponse.data || userResponse;

          if (user.role && user.role !== "USER") {
            Swal.fire({
              icon: "error",
              title: "Access Denied",
              text: "This page is only accessible for patient accounts.",
              confirmButtonColor: "#2563EB",
            }).then(() => {
              navigate("/");
            });
            return;
          }

          // Fetch the order and verify ownership
          fetchExistingOrder(serviceId, user);
        } catch (e) {
          Swal.fire({
            icon: "error",
            title: "Authentication Error",
            text: "Please login to proceed with payment.",
            confirmButtonColor: "#2563EB",
          }).then(() => {
            navigate("/login");
          });
        }
      })();
      return;
    }

    // For new payments, wait until we know the user's country so the first
    // render uses the correct currency instead of flashing the India default.
    if (
      !existingOrder &&
      !orderIdFromUrl &&
      !isPaymentLink &&
      !pricingCountry
    ) {
      return;
    }

    // First check if we have serviceId from URL (direct from services page)
    const currentServicePricing = getServicePricing(pricingCountry);
    if (serviceId && currentServicePricing[serviceId]) {
      const serviceInfo = currentServicePricing[serviceId];
      setServiceData({
        services: { [serviceId]: true },
        totalPrice: serviceInfo.price,
        files: [],
      });
      setLoading(false);
      return;
    }

    // Otherwise check sessionStorage (from upload page)
    const storedData = sessionStorage.getItem("pendingService");
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        setServiceData(parsedData);
      } catch (e) {
        console.error("Error parsing service data:", e);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Invalid service data. Please try again.",
          confirmButtonColor: "#2563EB",
        }).then(() => {
          navigate("/user/services");
        });
      }
    } else {
      // No service data, redirect to services
      Swal.fire({
        icon: "warning",
        title: "No Service Selected",
        text: "Please select a service first.",
        confirmButtonColor: "#2563EB",
      }).then(() => {
        navigate("/user/services");
      });
    }
    setLoading(false);
  }, [
    navigate,
    serviceId,
    orderIdFromUrl,
    isPaymentLink,
    location.pathname,
    pricingCountry,
  ]);

  useEffect(() => {
    let isMounted = true;

    authAPI
      .getCurrentUser()
      .then((response) => {
        const user = response.data || response;
        if (isMounted && user?.country) {
          setPricingCountry(user.country);
        }
      })
      .catch(() => {
        if (isMounted) {
          setPricingCountry((currentCountry) => currentCountry || "India");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const shouldApplyGst = () => {
    const country =
      existingOrder?.deliveryCountry ||
      existingOrder?.user?.country ||
      pricingCountry;

    if (!shouldApplyGstForCountry(country)) {
      return false;
    }

    if (existingOrder) {
      return (
        existingOrder.serviceType === "PRESCRIPTION_ANALYSIS" ||
        existingOrder.serviceType === "SECOND_OPINION"
      );
    }

    if (!serviceData) {
      return false;
    }

    const hasPrescriptionAnalysis = Boolean(
      serviceData?.services?.prescriptionAnalysis,
    );
    const hasSecondOpinion = Boolean(serviceData?.services?.secondOpinion);
    const hasOnlinePharmacyOnly =
      (serviceData?.services?.onlinePharmacy ||
        serviceId === "online-pharmacy") &&
      !hasPrescriptionAnalysis &&
      !hasSecondOpinion;

    return (
      !hasOnlinePharmacyOnly && (hasPrescriptionAnalysis || hasSecondOpinion)
    );
  };

  // Calculate totals with India GST for prescription analysis and second opinion
  const calculateTotals = () => {
    const applyGst = shouldApplyGst();

    if (existingOrder) {
      const serviceFee = getNormalizedServiceFee(existingOrder, pricingCountry);
      const gst = applyGst ? Math.round(serviceFee * GST_RATE) : 0;
      return {
        serviceFee,
        gst,
        total: serviceFee + gst,
        gstRate: applyGst ? 18 : 0,
      };
    }

    if (!serviceData) return { serviceFee: 0, gst: 0, total: 0, gstRate: 0 };

    let serviceFee = serviceData.totalPrice || 0;
    const gst = applyGst ? Math.round(serviceFee * GST_RATE) : 0;
    return {
      serviceFee,
      gst,
      total: serviceFee + gst,
      gstRate: applyGst ? 18 : 0,
    };
  };

  const { serviceFee, gst, total, gstRate } = calculateTotals();

  const handlePayment = async (e) => {
    e.preventDefault();
    setProcessing(true);
    let createdOrderDuringPayment = null;

    try {
      const userResponse = await authAPI.getCurrentUser();
      const user = userResponse.data || userResponse;

      if (!user || !user.id) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Please login to continue",
          confirmButtonColor: "#2563EB",
        });
        navigate("/login");
        return;
      }

      if (!Number(total) || Number(total) <= 0) {
        throw new Error(
          "A payable amount is required before starting payment.",
        );
      }

      const isExistingOrderPayment = Boolean(existingOrder);
      let orderForPayment = existingOrder;

      if (!orderForPayment) {
        let primaryServiceType = "ONLINE_PHARMACY";
        if (serviceData?.services?.prescriptionAnalysis) {
          primaryServiceType = "PRESCRIPTION_ANALYSIS";
        } else if (serviceData?.services?.secondOpinion) {
          primaryServiceType = "SECOND_OPINION";
        } else if (serviceId === "prescription-analysis") {
          primaryServiceType = "PRESCRIPTION_ANALYSIS";
        } else if (serviceId === "second-opinion") {
          primaryServiceType = "SECOND_OPINION";
        } else if (serviceId === "online-pharmacy") {
          primaryServiceType = "ONLINE_PHARMACY";
        }

        const orderPayload = {
          user: { id: user.id },
          orderDetails: JSON.stringify({
            services: serviceData?.services || {},
            documentIds: serviceData?.documentIds || [],
            briefHealthIssue: serviceData?.briefHealthIssue || "",
            serviceType: serviceData?.serviceType || serviceId,
          }),
          totalAmount: serviceFee,
          status: "PENDING",
          paymentStatus: "PENDING",
          serviceType: primaryServiceType,
        };

        const orderResponse = await orderAPI.create(orderPayload);
        orderForPayment = orderResponse.data || orderResponse;
        createdOrderDuringPayment = orderForPayment;
      }

      const razorpayConfigResponse = await paymentAPI.getRazorpayKey();
      const razorpayConfig =
        razorpayConfigResponse.data || razorpayConfigResponse;
      const isConfigured = String(razorpayConfig?.configured) === "true";
      const isMockMode = String(razorpayConfig?.mockMode) === "true";

      if (!isMockMode && (!isConfigured || !razorpayConfig?.key)) {
        throw new Error(
          "Payment gateway is not configured yet. Please contact support.",
        );
      }

      if (!isMockMode) {
        await loadRazorpayScript();
      }

      const amountInPaise = Math.round(Number(total) * 100);
      const razorpayOrderResponse = await paymentAPI.createRazorpayOrder({
        userId: user.id,
        orderId: orderForPayment.id,
        amount: amountInPaise,
        currency: shouldApplyGstForCountry(
          existingOrder?.deliveryCountry ||
            existingOrder?.user?.country ||
            pricingCountry,
        )
          ? "INR"
          : "USD",
      });
      const razorpayOrder = razorpayOrderResponse.data || razorpayOrderResponse;

      const razorpayPayment = isMockMode
        ? await (async () => {
            const result = await Swal.fire({
              icon: "question",
              title: "Mock Payment Mode",
              text: `Simulate successful payment of ${formatCurrencyAmount(total, pricingCountry)}?`,
              confirmButtonColor: "#2563EB",
              cancelButtonColor: "#6B7280",
              confirmButtonText: "Simulate Success",
              cancelButtonText: "Cancel",
              showCancelButton: true,
            });

            if (!result.isConfirmed) {
              throw new Error("Mock payment cancelled.");
            }

            const timestamp = Date.now();
            return {
              razorpay_order_id: razorpayOrder.razorpayOrderId,
              razorpay_payment_id: `mock_pay_${timestamp}`,
              razorpay_signature: `mock_signature_${timestamp}`,
            };
          })()
        : await new Promise((resolve, reject) => {
            const checkout = new window.Razorpay({
              key: razorpayConfig.key,
              amount: razorpayOrder.amount,
              currency: razorpayOrder.currency || "INR",
              name: "RXIncredible",
              description: isExistingOrderPayment
                ? `Payment for Order #${orderForPayment.orderNumber || orderForPayment.id}`
                : "Service payment",
              order_id: razorpayOrder.razorpayOrderId,
              prefill: {
                name: user.fullName || "",
                email: user.email || "",
                contact: user.phone || "",
              },
              notes: {
                local_order_id: String(orderForPayment.id),
                source: "payment_summary",
              },
              theme: {
                color: "#2563EB",
              },
              modal: {
                ondismiss: () => reject(new Error("Razorpay checkout closed.")),
              },
              handler: (response) => resolve(response),
            });

            checkout.on("payment.failed", (response) => {
              reject(
                new Error(
                  response?.error?.description || "Razorpay payment failed.",
                ),
              );
            });

            checkout.open();
          });

      await paymentAPI.verifyRazorpayPayment({
        razorpayOrderId: razorpayPayment.razorpay_order_id,
        razorpayPaymentId: razorpayPayment.razorpay_payment_id,
        razorpaySignature: razorpayPayment.razorpay_signature,
      });

      if (!isExistingOrderPayment) {
        const documentIds = serviceData?.documentIds || [];
        for (const docId of documentIds) {
          try {
            await documentAPI.linkDocumentToOrder(docId, orderForPayment.id);
          } catch (linkError) {
            console.error("Error linking document to order:", linkError);
          }
        }
      }

      await generateAndDownloadReceipt(orderForPayment.id);

      sessionStorage.removeItem("pendingService");
      sessionStorage.removeItem("pendingOrderForPayment");
      sessionStorage.removeItem("shippingInfo");

      Swal.fire({
        icon: "success",
        title: "Payment Successful!",
        text: `Your payment of ${formatCurrencyAmount(total, pricingCountry)} has been processed successfully.`,
        confirmButtonColor: "#2563EB",
        confirmButtonText: "View Orders",
      }).then((result) => {
        if (result.isConfirmed) {
          navigate("/user/orders");
        }
      });
    } catch (error) {
      console.error("Payment error:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "";
      const isNetworkError =
        errorMessage === "Network Error" ||
        errorMessage === "Failed to fetch" ||
        error?.code === "ERR_NETWORK";
      const isUserCancelled =
        errorMessage === "Razorpay checkout closed." ||
        errorMessage === "Mock payment cancelled.";

      if (isUserCancelled && createdOrderDuringPayment?.id) {
        try {
          await orderAPI.delete(createdOrderDuringPayment.id);
          sessionStorage.removeItem("pendingOrderForPayment");
        } catch (cleanupError) {
          console.error(
            "Unable to remove cancelled temporary order:",
            cleanupError,
          );
        }
      }

      Swal.fire({
        icon: isUserCancelled ? "info" : "error",
        title: isUserCancelled
          ? "Payment Cancelled"
          : isNetworkError
            ? "Server Unavailable"
            : "Payment Failed",
        text: isUserCancelled
          ? "Payment flow was cancelled before completion."
          : isNetworkError
            ? "Payment server is temporarily unavailable or restarting. Please wait a few seconds and try again."
            : errorMessage ||
              "There was an error processing your payment. Please try again.",
        confirmButtonColor: "#2563EB",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  // Handle bill rejection from email
  const handleReject = async () => {
    if (!orderIdFromUrl) return;

    const result = await Swal.fire({
      icon: "warning",
      title: "Reject Bill?",
      text: "Are you sure you want to reject this bill? This action cannot be undone.",
      confirmButtonColor: "#DC2626",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, Reject",
      cancelButtonText: "Cancel",
      showCancelButton: true,
    });

    if (result.isConfirmed) {
      try {
        // Update order status to REJECTED
        await orderAPI.updateStatus(parseInt(orderIdFromUrl), "REJECTED");

        Swal.fire({
          icon: "success",
          title: "Bill Rejected",
          text: "The bill has been rejected successfully.",
          confirmButtonColor: "#2563EB",
        }).then(() => {
          navigate("/user/orders");
        });
      } catch (error) {
        console.error("Error rejecting bill:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to reject bill. Please try again.",
          confirmButtonColor: "#2563EB",
        });
      }
    }
  };

  if (loading) {
    return (
      <>
        <Navbar role="user" />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
        </main>
        <Footer />
      </>
    );
  }

  // Show reject confirmation screen if accessed from reject link
  if (rejectMode && orderIdFromUrl) {
    return (
      <>
        <Navbar role="user" />
        <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-xl p-5 sm:p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-3xl text-[#1E3A8A] mb-4">Bill Rejection</h1>
              <p className="text-gray-600 mb-8">
                You are about to reject the bill for order #{orderIdFromUrl}.
                This action cannot be undone.
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleReject}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  Yes, Reject Bill
                </button>
                <button
                  onClick={() => navigate("/user/orders")}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar role="user" />

      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={handleBack}
            className="flex items-center gap-2 text-[#2563EB] hover:text-[#1E3A8A] mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </motion.button>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-3xl sm:text-4xl text-[#1E3A8A] mb-4">
              Payment
            </h1>
            <p className="text-xl text-gray-600">
              Complete your payment to proceed
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            onSubmit={handlePayment}
            className="mx-auto max-w-xl"
          >
            <div className="bg-white rounded-3xl shadow-xl p-5 sm:p-7">
              <h3 className="text-xl sm:text-2xl text-[#1E3A8A] mb-6">
                Order Summary
              </h3>

                {/* Show existing order details if coming from email payment link */}
                {existingOrder ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-[#2563EB]" />
                        <span className="font-medium text-gray-700">
                          Order Details
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Order #{existingOrder.orderNumber}
                      </p>
                      <p className="text-sm text-gray-600">
                        Service: {existingOrder.serviceType?.replace("_", " ")}
                      </p>
                      <p className="text-sm text-gray-600">
                        Status: {existingOrder.status}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-gray-700">
                        <span>Service Fee</span>
                        <span>
                          {formatCurrencyAmount(
                            existingOrder.totalAmount || 0,
                            pricingCountry,
                          )}
                        </span>
                      </div>
                      {gstRate > 0 && (
                        <div className="flex justify-between text-gray-700">
                          <span>GST ({gstRate}%)</span>
                          <span>
                            {formatCurrencyAmount(gst, pricingCountry)}
                          </span>
                        </div>
                      )}
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex justify-between text-[#1E3A8A]">
                          <span>Total Amount</span>
                          <span className="text-2xl">
                            {formatCurrencyAmount(total, pricingCountry)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : serviceData?.services?.prescriptionAnalysis &&
                  serviceData?.services?.secondOpinion ? (
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-[#16A34A] to-[#22C55E] rounded-xl text-white">
                    <CheckCircle className="w-5 h-5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Bundle Package</p>
                      <p className="text-xs text-green-100">
                        Prescription Analysis + Second Opinion
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {serviceData?.services?.prescriptionAnalysis && (
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                        <Pill className="w-5 h-5 text-[#2563EB]" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700">
                            Prescription Analysis
                          </p>
                          <p className="text-xs text-gray-500">
                            Document review & analysis
                          </p>
                        </div>
                        <span className="text-sm font-medium text-[#1E3A8A]">
                          {formatCurrencyAmount(
                            servicePricing["prescription-analysis"].price,
                            pricingCountry,
                          )}
                        </span>
                      </div>
                    )}

                    {serviceData?.services?.secondOpinion && (
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                        <Stethoscope className="w-5 h-5 text-[#16A34A]" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700">
                            Second Opinion
                          </p>
                          <p className="text-xs text-gray-500">
                            Expert medical opinion
                          </p>
                        </div>
                        <span className="text-sm font-medium text-[#1E3A8A]">
                          {formatCurrencyAmount(
                            servicePricing["second-opinion"].price,
                            pricingCountry,
                          )}
                        </span>
                      </div>
                    )}

                    {(serviceData?.services?.onlinePharmacy ||
                      serviceId === "online-pharmacy") &&
                      !serviceData?.services?.prescriptionAnalysis &&
                      !serviceData?.services?.secondOpinion && (
                        <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                          <Pill className="w-5 h-5 text-[#7C3AED]" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700">
                              Online Pharmacy
                            </p>
                            <p className="text-xs text-gray-500">
                              Prescription will be sent to your email
                            </p>
                          </div>
                          <span className="text-sm font-medium text-[#1E3A8A]">
                            Free
                          </span>
                        </div>
                      )}
                  </>
                )}

                {/* Uploaded Files */}
                {serviceData?.files && serviceData.files.length > 0 && (
                  <div className="mb-6">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Uploaded Documents
                    </p>
                    <div className="space-y-1">
                      {serviceData.files.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 text-xs text-gray-500"
                        >
                          <FileText className="w-3 h-3" />
                          <span className="truncate">{file}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Only show pricing breakdown for new orders (when existingOrder is null) */}
                {!existingOrder && (
                  <>
                    <div className="space-y-4 mb-6">
                      <div className="flex justify-between text-gray-700">
                        <span>Service Fee</span>
                        <span>
                          {formatCurrencyAmount(serviceFee, pricingCountry)}
                        </span>
                      </div>
                      {gstRate > 0 && (
                        <div className="flex justify-between text-gray-700">
                          <span>GST ({gstRate}%)</span>
                          <span>
                            {formatCurrencyAmount(gst, pricingCountry)}
                          </span>
                        </div>
                      )}
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex justify-between text-[#1E3A8A]">
                          <span>Total Amount</span>
                          <span className="text-2xl">
                            {formatCurrencyAmount(total, pricingCountry)}
                          </span>
                        </div>
                      </div>
                    </div>

                  </>
                )}

              <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Secure Payment</span>
                </div>
                <p className="text-sm text-green-700">
                  Your payment information is encrypted and secure
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={processing}
                className="mt-6 w-full min-h-14 px-5 py-4 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 text-base sm:text-lg font-medium"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Pay Now - {formatCurrencyAmount(total, pricingCountry)}
                  </>
                )}
              </motion.button>
            </div>
          </motion.form>
        </div>
      </main>

      <Footer />
    </>
  );
}
