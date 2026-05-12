import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router";
import { FileText, Clock, User, ArrowRight, Eye, Download, X, AlertCircle } from "lucide-react";
import { Navbar } from "../../components/Navbar";
import { Footer } from "../../components/Footer";
import Swal from "sweetalert2";
import { authAPI, getStoredUser, getToken, prescriptionAPI } from "@/services/api.js";
import { API_BASE_URL } from "@/config/api.js";
import { formatReportId } from "@/app/utils/reportId.js";

export default function DoctorReports() {
  const navigate = useNavigate();
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completedTodayCount, setCompletedTodayCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [highPriorityCount, setHighPriorityCount] = useState(0);
  const [profileIncomplete, setProfileIncomplete] = useState(false);

  const isDoctorProfileComplete = (user) =>
    Boolean(
      user?.fullName &&
        user?.phone &&
        user?.specialization &&
        user?.qualifications &&
        user?.licenseNumber,
    );

  const getLocalDateKey = (dateValue) => {
    if (!dateValue) return "";

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "";

    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  };

  const isToday = (dateValue) =>
    getLocalDateKey(dateValue) === getLocalDateKey(new Date());

  const getCompletionDate = (record) =>
    record?.completedAt ||
    record?.completedDate ||
    record?.medicalReportCompletedAt ||
    record?.medicalReportUpdatedAt ||
    record?.reportGeneratedAt ||
    record?.prescription?.updatedAt ||
    record?.updatedAt ||
    record?.createdAt;

  const hasCompletedReport = (record) => {
    const status = record?.status?.toUpperCase();
    const medicalReportStatus = record?.medicalReportStatus?.toUpperCase();
    const prescriptionStatus = record?.prescription?.status?.toUpperCase();

    return (
      status === "COMPLETED" ||
      medicalReportStatus === "COMPLETED" ||
      prescriptionStatus === "COMPLETED" ||
      Boolean(record?.medicalReportFilePath) ||
      Boolean(record?.prescriptionPath)
    );
  };

  useEffect(() => {
    fetchPendingReports();
  }, []);

  // Transform prescription data to report format - only for Second Opinion
  const transformPrescriptions = (prescriptions) => {
    return prescriptions
      .filter(p => p.serviceType === 'SECOND_OPINION' || p.serviceType === 'Second Opinion')
      .map((prescription) => ({
        id: `REP-${prescription.id}`,
        prescriptionId: prescription.id,
        patientName: prescription.user?.fullName || "Unknown Patient",
        serviceType: "Second Opinion",
        uploadedDate: prescription.createdAt,
        status: prescription.status?.toLowerCase() || "pending",
        documentName: prescription.filePath || "prescription.pdf",
        documentType: "PDF",
        documentUrl: prescription.filePath || "/documents/prescription.pdf",
      }));
  };

  const fetchPendingReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      
      // Helper function - removed static demo data
      const showEmptyState = () => {
        setReports([]);
        setCompletedTodayCount(0);
        setPendingCount(0);
        setHighPriorityCount(0);
        setLoading(false);
      };
      
      // Get doctor ID - try multiple methods
      let currentUser;
      let doctorId;
      
      // Method 1: Try API call - axios returns response object, need to get .data
      try {
        const response = await authAPI.getCurrentUser();
        console.log("Method 1 - API response:", response);
        console.log("Method 1 - Response data:", response?.data);
        // axios wraps response in .data
        currentUser = response?.data || response;
        console.log("Method 1 - Current user after unwrap:", currentUser);
        if (currentUser && !isDoctorProfileComplete(currentUser)) {
          setProfileIncomplete(true);
          Swal.fire({
            icon: "info",
            title: "Profile Required",
            text: "Please complete your doctor profile before accessing reports.",
            confirmButtonColor: "#2563EB",
            confirmButtonText: "Complete Profile",
          }).then(() => {
            navigate("/doctor/profile");
          });
          showEmptyState();
          return;
        }
        if (currentUser && currentUser.id) {
          doctorId = currentUser.id;
          console.log("Method 1 - Got doctorId from API:", doctorId);
        }
      } catch (err) {
        console.error("Method 1 - API getCurrentUser failed:", err.message);
        console.error("Method 1 - Error details:", err);
      }
      
      // Method 2: If no doctorId yet, try getting from localStorage
      if (!doctorId) {
        console.log("Method 2 - Trying localStorage fallback...");
        const storedUser = getStoredUser();
        if (storedUser) {
          try {
            currentUser = storedUser;
            console.log("Method 2 - Stored user parsed:", currentUser);
            if (currentUser && currentUser.id) {
              doctorId = currentUser.id;
              console.log("Method 2 - Got doctorId from localStorage:", doctorId);
            }
          } catch (parseErr) {
            console.error("Method 2 - Error parsing stored user:", parseErr);
          }
        }
      }
      
      // Method 3: If still no doctorId, try direct API call with token
      if (!doctorId && token) {
        console.log("Method 3 - Trying direct API call with token...");
        try {
          const response = await fetch(API_BASE_URL + '/auth/me', {
            headers: {
              'Authorization': 'Bearer ' + token,
              'Content-Type': 'application/json'
            }
          });
          if (response.ok) {
            currentUser = await response.json();
            console.log("Method 3 - Direct API call result:", currentUser);
            if (currentUser && currentUser.id) {
              doctorId = currentUser.id;
              console.log("Method 3 - Got doctorId from direct call:", doctorId);
            }
          } else {
            console.log("Method 3 - Direct call failed with status:", response.status);
          }
        } catch (directErr) {
          console.error("Method 3 - Direct call error:", directErr);
        }
      }
      
      // If still no doctorId after all methods, show error
      if (!doctorId) {
        console.log("ERROR: Could not get doctorId from any method!");
        console.log("Token present:", !!token);
        console.log("Stored user:", getStoredUser());
        setError("Unable to identify doctor. Please logout and login again.");
        showEmptyState();
        return;
      }
      
      console.log("Final doctorId being used:", doctorId);
      console.log("Doctor ID from backend:", doctorId);
      console.log("Full currentUser object:", currentUser);
      
      // If no token, show empty state
      if (!token) {
        console.log("No token found, showing empty state");
        showEmptyState();
        return;
      }
      
      // Get orders assigned to this doctor
      let allReports = [];
      const seenOrderIds = new Set(); // Track order IDs to avoid duplicates
      let completedToday = 0;
      const completedTodayKeys = new Set();
      const addCompletedToday = (key, dateValue) => {
        if (!key || completedTodayKeys.has(key) || !isToday(dateValue)) {
          return;
        }

        completedTodayKeys.add(key);
        completedToday += 1;
      };
      
      // Draft count is now fetched from backend only
      
      if (doctorId) {
        console.log("DEBUG: Doctor ID being used:", doctorId);
        console.log("DEBUG: Current user object:", currentUser);
        console.log("DEBUG: Making API request to fetch orders...");
        try {
          console.log("Fetching orders for doctor:", doctorId);
          console.log("DEBUG: API URL: " + API_BASE_URL + "/orders/doctor/" + doctorId);
          const ordersRes = await fetch(`${API_BASE_URL}/orders/doctor/${doctorId}`, {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          
          console.log("DEBUG: Response status:", ordersRes.status);
          console.log("DEBUG: Response statusText:", ordersRes.statusText);
          console.log("DEBUG: Response ok:", ordersRes.ok);
          
          // Get response body regardless of status
          const responseText = await ordersRes.text();
          console.log("DEBUG: Raw response text length:", responseText.length);
          console.log("DEBUG: Raw response text (first 500 chars):", responseText.substring(0, 500));
          
          // Try to parse as JSON
          let orders = [];
          try {
            orders = JSON.parse(responseText);
            console.log("DEBUG: Parsed orders array:", orders);
            console.log("DEBUG: Orders length:", Array.isArray(orders) ? orders.length : 'not an array');
          } catch (parseError) {
            console.error("DEBUG: JSON parse error:", parseError);
            console.log("DEBUG: Response is not valid JSON, using empty array");
            if (ordersRes.ok) {
              orders = [];
            } else {
              // Show error to user
              console.error("API returned error:", responseText);
              showEmptyState();
              return;
            }
          }
          
          // Check for auth errors
          if (ordersRes.status === 401 || ordersRes.status === 403) {
            // Token expired or invalid, show empty state
            console.log("Token expired or invalid, showing empty state");
            showEmptyState();
            return;
          }
          
          console.log("Orders response:", orders);
          console.log("Number of orders returned:", orders.length);
          
          // Debug: Log each order's key fields for troubleshooting
          orders.forEach((order, idx) => {
            console.log(`Order ${idx + 1}:`, {
              id: order.id,
              orderNumber: order.orderNumber,
              serviceType: order.serviceType,
              status: order.status,
              paymentStatus: order.paymentStatus,
              medicalReportStatus: order.medicalReportStatus,
              assignedDoctor: order.assignedDoctor ? {
                id: order.assignedDoctor.id,
                fullName: order.assignedDoctor.fullName
              } : null,
              prescription: order.prescription ? {
                id: order.prescription.id,
                status: order.prescription.status
              } : null
            });
          });
          
          // Debug: Show all order statuses
          orders.forEach(order => {
            console.log("Order:", order.orderNumber, "Status:", order.status, "PaymentStatus:", order.paymentStatus, "MedicalReportStatus:", order.medicalReportStatus);
          });
          
          orders.forEach((order) => {
            if (hasCompletedReport(order)) {
              addCompletedToday(
                `order-${order.id || order.orderNumber}`,
                getCompletionDate(order),
              );
            }
          });
          
          // Transform orders to report format
          // Only show orders that are NOT completed AND don't have a DRAFT prescription
          // Show orders with IN_REVIEW status (assigned to doctor but not yet processed)
          const orderReports = orders
            .filter(order => {
              console.log("Processing order:", order.orderNumber, "Status:", order.status, "PaymentStatus:", order.paymentStatus, "MedicalReportStatus:", order.medicalReportStatus);
              
              // Don't show if already has a COMPLETED prescription (medical report)
              if (order.prescription && order.prescription.status === 'COMPLETED') {
                console.log("Excluding order (COMPLETED prescription):", order.orderNumber);
                return false;
              }
              // Don't show if order status is COMPLETED
              if (order.status === 'COMPLETED') {
                console.log("Excluding order (COMPLETED status):", order.orderNumber);
                return false;
              }
              // Don't show if medical report is DRAFT (drafts should not appear in pending reports)
              if (order.medicalReportStatus === 'DRAFT') {
                console.log("Excluding order (DRAFT medical report):", order.orderNumber);
                return false;
              }
              
              // Only show Second Opinion orders
              // EXCLUDE all other service types - ONLY allow SECOND_OPINION
              const allowedServiceTypes = ['SECOND_OPINION'];
              if (!allowedServiceTypes.includes(order.serviceType)) {
                console.log("Excluding order (not allowed service type):", order.orderNumber, "-", order.serviceType);
                return false;
              }
              
              // Show orders in IN_REVIEW status (doctor assigned, pending action)
              // Also show orders in SUBMITTED, PENDING, APPROVED, PROCESSING status
              const validStatuses = ['SUBMITTED', 'PENDING', 'IN_REVIEW', 'APPROVED', 'PROCESSING'];
              if (!validStatuses.includes(order.status)) {
                console.log("Excluding order (invalid status):", order.orderNumber, order.status);
                return false;
              }
              
              console.log("Including order:", order.orderNumber);
              return true;
            })
            .filter(order => {
              // Skip if already added (avoid duplicates)
              if (seenOrderIds.has(order.id)) return false;
              seenOrderIds.add(order.id);
              return true;
            })
            .map(order => ({
              id: formatReportId(order.orderNumber || order.id),
              orderId: order.id,
              patientName: order.user?.fullName || "N/A",
              patientEmail: order.user?.email || "",
              patientPhone: order.user?.phone || "",
              serviceType: order.serviceType === 'PRESCRIPTION_ANALYSIS' ? 'Prescription Analysis' :
                           order.serviceType === 'ONLINE_PHARMACY' ? 'Online Pharmacy' :
                           order.serviceType === 'SECOND_OPINION' ? 'Second Opinion' : 'Order',
              uploadedDate: order.createdAt,
              status: order.status?.toLowerCase() || "pending",
              priority: order.priority?.toLowerCase() || "medium",
              documentName: order.orderNumber || "order.pdf",
              documentType: "PDF",
              documentUrl: "#",
              orderNumber: order.orderNumber,
            }));
          allReports = [...allReports, ...orderReports];
        } catch (orderError) {
          console.error("Error fetching orders:", orderError);
          // If network error, show empty state
          if (orderError.name === 'TypeError' || orderError.message?.includes('Failed to fetch')) {
            console.log("Network error fetching orders, showing empty state");
            showEmptyState();
            return;
          }
        }
        
        // Also try to get prescriptions
        try {
          const allPrescriptionsResponse = await prescriptionAPI.getByDoctorId(doctorId);
          const allPrescriptions = Array.isArray(allPrescriptionsResponse)
            ? allPrescriptionsResponse
            : allPrescriptionsResponse?.data || [];

          allPrescriptions.forEach((prescription) => {
            if (
              (prescription.serviceType === "SECOND_OPINION" ||
                prescription.serviceType === "Second Opinion") &&
              hasCompletedReport(prescription)
            ) {
              addCompletedToday(
                `prescription-${prescription.id}`,
                getCompletionDate(prescription),
              );
            }
          });

          const prescriptionResponse = await fetch(
            `${API_BASE_URL}/prescriptions/doctor/${doctorId}/pending`,
            {
              headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );
          
          if (prescriptionResponse.ok) {
            const prescriptions = await prescriptionResponse.json();
            // Only show pending Second Opinion prescriptions (not completed, not draft)
            // Also filter out prescriptions that are already in orders (by checking order ID)
            const pendingPrescriptions = prescriptions.filter(p => 
              p.status !== 'COMPLETED' && 
              p.status !== 'DRAFT' &&
              !seenOrderIds.has(p.id) &&
              (p.serviceType === 'SECOND_OPINION' || p.serviceType === 'Second Opinion')
            );
            const prescriptionReports = transformPrescriptions(pendingPrescriptions);
            allReports = [...allReports, ...prescriptionReports];
          }
        } catch (prescriptionError) {
          console.error("Error fetching prescriptions:", prescriptionError);
          // If network error, show empty state
          if (prescriptionError.name === 'TypeError' || prescriptionError.message?.includes('Failed to fetch')) {
            console.log("Network error fetching prescriptions, showing empty state");
            showEmptyState();
            return;
          }
        }
      }
      
      setReports(allReports);
      setCompletedTodayCount(completedToday);
      setPendingCount(allReports.length);
      
      // Calculate high priority count
      const highPriority = allReports.filter(r => r.priority === 'high').length;
      setHighPriorityCount(highPriority);
      
      // If no reports from backend, show empty state
      if (allReports.length === 0) {
        console.log("No reports from backend, showing empty state");
        showEmptyState();
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
      
      // If backend is not available (connection refused), show empty state
      if (err.name === 'TypeError' || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.message?.includes('connection')) {
        console.log("Backend unavailable, showing empty state");
        showEmptyState();
        return;
      }
      
      setError(err.message || "Failed to fetch reports. Please ensure the backend server is running.");
    } finally {
      setLoading(false);
    }
  };


  const handleDownload = (e, report) => {
    e.preventDefault();
    e.stopPropagation();
    // Create a temporary anchor element for download
    const link = document.createElement('a');
    link.href = report.documentUrl;
    link.download = report.documentName || `report_${report.id}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleView = (e, report) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedDocument(report);
  };

  const closeModal = () => {
    setSelectedDocument(null);
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "high":
        return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">High Priority</span>;
      case "medium":
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">Medium Priority</span>;
      case "low":
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">Low Priority</span>;
      default:
        return null;
    }
  };

  return (
    <>
      <Navbar role="doctor" />
      
      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Profile Incomplete Warning */}
          {profileIncomplete && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600" />
                <div>
                  <h3 className="text-amber-800 font-semibold">Profile Incomplete</h3>
                  <p className="text-amber-700 text-sm">Please complete your profile to access reports.</p>
                </div>
              </div>
              <button
                onClick={() => navigate("/doctor/profile")}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                Complete Profile
              </button>
            </motion.div>
          )}

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h1 className="text-3xl sm:text-4xl text-[#1E3A8A] mb-4">Pending Reports</h1>
            <p className="text-xl text-gray-600">Review and generate medical reports</p>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 mb-2">Total Pending</p>
                  <p className="text-3xl text-[#1E3A8A]">{pendingCount}</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] rounded-xl flex items-center justify-center">
                  <FileText className="w-7 h-7 text-white" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 mb-2">Completed Today</p>
                  <p className="text-3xl text-[#16A34A]">{completedTodayCount}</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-[#16A34A] to-[#22C55E] rounded-xl flex items-center justify-center">
                  <Clock className="w-7 h-7 text-white" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 mb-2">High Priority</p>
                  <p className="text-3xl text-[#DC2626]">{highPriorityCount}</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-[#DC2626] to-[#EF4444] rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-7 h-7 text-white" />
                </div>
              </div>
            </motion.div>

          </div>

          {/* Reports List */}
          <div className="space-y-4">
            {loading && (
              <div className="flex justify-center items-center py-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-gray-600">Loading reports...</span>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                Error: {error}
              </div>
            )}
            
            {!loading && !error && reports.length === 0 && (
              <div className="text-center py-12">
                <div className="mb-4">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto" />
                </div>
                <p className="text-gray-500 text-lg mb-2">No pending reports found.</p>
                <p className="text-gray-400 text-sm">
                  If you've been assigned a patient by the admin, please wait or contact the admin.
                </p>
                <button
                  onClick={() => fetchPendingReports()}
                  className="mt-4 px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                >
                  Refresh
                </button>
              </div>
            )}
            
            {!loading && !error && reports.map((report, index) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ x: 10 }}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Link to={report.orderId ? `/doctor/generate/${report.orderId}` : `/doctor/generate/${report.prescriptionId}`}>
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      {/* Report Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] rounded-xl flex items-center justify-center">
                            <FileText className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl text-[#1E3A8A]">{report.patientName}</h3>
                            <p className="text-sm text-gray-500">Report ID: {report.id}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          <span>{report.serviceType}</span>
                          <span>•</span>
                          <span>Uploaded: {new Date(report.uploadedDate).toLocaleDateString()}</span>
                          {report.patientEmail && (
                            <>
                              <span>•</span>
                              <span>{report.patientEmail}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Priority & Action */}
                      <div className="flex items-center gap-4 flex-wrap">
                        {getPriorityBadge(report.priority)}
                        <div className="flex items-center text-[#2563EB] group-hover:translate-x-2 transition-transform duration-300">
                          <span className="mr-2">Review</span>
                          <ArrowRight className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      {/* Document View Modal */}
      <AnimatePresence>
        {selectedDocument && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl text-[#1E3A8A] font-semibold">{selectedDocument.patientName}</h2>
                  <p className="text-sm text-gray-500">{selectedDocument.documentName}</p>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              
              {/* Document Preview */}
              <div className="p-6 bg-gray-50 min-h-[400px] flex items-center justify-center">
                {selectedDocument.documentType === 'PDF' ? (
                  <iframe
                    src={selectedDocument.documentUrl}
                    className="w-full h-[500px] rounded-lg border border-gray-200"
                    title="Document Preview"
                  />
                ) : (
                  <img
                    src={selectedDocument.documentUrl}
                    alt={selectedDocument.documentName}
                    className="max-w-full max-h-[500px] rounded-lg"
                  />
                )}
              </div>
              
              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-4 p-6 border-t border-gray-200 bg-white">
                <button
                  onClick={closeModal}
                  className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  Close
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(e, selectedDocument);
                  }}
                  className="flex items-center gap-2 px-6 py-2 bg-[#16A34A] text-white rounded-lg hover:bg-[#15803D] transition-colors duration-200"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer />
    </>
  );
}


