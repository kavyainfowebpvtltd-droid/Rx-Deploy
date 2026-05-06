import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router";
import { FileText, Clock, User, ArrowRight, Eye, Download, X, AlertCircle, Loader2 } from "lucide-react";
import { Navbar } from "../../components/Navbar";
import { Footer } from "../../components/Footer";
import Swal from "sweetalert2";
import { authAPI, analystAPI, getStoredUser, getToken } from "@/services/api.js";
import { API_BASE_URL } from "@/config/api.js";
import { formatReportId } from "@/app/utils/reportId.js";

export default function AnalystReports() {
  const navigate = useNavigate();
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completedTodayCount, setCompletedTodayCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [profileIncomplete, setProfileIncomplete] = useState(false);

  const isAnalystProfileComplete = (user) =>
    Boolean(user?.fullName && user?.phone && user?.address);

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
    record?.updatedAt ||
    record?.createdAt;

  const hasCompletedReport = (record) => {
    const status = record?.status?.toUpperCase();
    const medicalReportStatus = record?.medicalReportStatus?.toUpperCase();

    return (
      status === "COMPLETED" ||
      status === "APPROVED" ||
      medicalReportStatus === "COMPLETED" ||
      Boolean(record?.medicalReportFilePath) ||
      Boolean(record?.prescriptionPath)
    );
  };

  useEffect(() => {
    fetchPendingReports();
  }, []);

  const fetchPendingReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      
      const showEmptyState = () => {
        setReports([]);
        setCompletedTodayCount(0);
        setPendingCount(0);
        setLoading(false);
      };
      
      // Get analyst ID
      let currentUser;
      let analystId;
      
      try {
        const response = await authAPI.getCurrentUser();
        currentUser = response?.data || response;
        if (currentUser && !isAnalystProfileComplete(currentUser)) {
          setProfileIncomplete(true);
          Swal.fire({
            icon: "info",
            title: "Profile Required",
            text: "Please complete your analyst profile before accessing reports.",
            confirmButtonColor: "#2563EB",
            confirmButtonText: "Complete Profile",
          }).then(() => {
            navigate("/analyst/profile");
          });
          showEmptyState();
          return;
        }
        if (currentUser && currentUser.id) {
          analystId = currentUser.id;
        }
      } catch (err) {
        console.error("Method 1 - API getCurrentUser failed:", err.message);
        const storedUser = getStoredUser();
        if (storedUser) {
          try {
            currentUser = storedUser;
            if (currentUser && currentUser.id) {
              analystId = currentUser.id;
            }
          } catch (parseErr) {
            console.error("Method 2 - Error parsing stored user:", parseErr);
          }
        }
      }
      
      if (!analystId) {
        setError("Unable to identify analyst. Please logout and login again.");
        showEmptyState();
        return;
      }
      
      if (!token) {
        showEmptyState();
        return;
      }

      // Get pending orders for this analyst (orders assigned to analyst that need analysis)
      let allReports = [];
      const seenOrderIds = new Set();
      let completedToday = 0;
      const completedTodayKeys = new Set();
      const addCompletedToday = (key, dateValue) => {
        if (!key || completedTodayKeys.has(key) || !isToday(dateValue)) {
          return;
        }

        completedTodayKeys.add(key);
        completedToday += 1;
      };
      
      if (analystId) {
        try {
          // First try to get orders assigned to analyst
          const ordersResponse = await analystAPI.getOrdersByAnalyst(analystId);
          const orders = ordersResponse.data || ordersResponse;
          
          console.log("Orders assigned to analyst:", orders);
          
          orders.forEach((order) => {
            if (hasCompletedReport(order)) {
              addCompletedToday(
                `order-${order.id || order.orderNumber}`,
                getCompletionDate(order),
              );
            }
          });
          
          // Transform orders to report format - only show orders that need analysis
          const orderReports = orders
            .filter(order => {
              // Skip if already completed, cancelled, rejected, or saved as draft
              if (order.status === 'COMPLETED' || order.status === 'CANCELLED' || order.status === 'REJECTED' || order.status === 'DRAFT') {
                return false;
              }
              // Only show orders with PRESCRIPTION_ANALYSIS service type
              if (order.serviceType !== 'PRESCRIPTION_ANALYSIS') {
                return false;
              }
              // Skip if already added (avoid duplicates)
              if (seenOrderIds.has(order.id)) return false;
              seenOrderIds.add(order.id);
              return true;
            })
            .map(order => ({
              id: formatReportId(order.orderNumber || order.id),
              orderId: order.id,
              prescriptionId: order.id, // Use same ID for Generate page
              patientName: order.user?.fullName || "Unknown Patient",
              patientEmail: order.user?.email || "",
              patientPhone: order.user?.phone || "",
              patientAge: order.user?.age || "",
              patientGender: order.user?.gender || "",
              serviceType: order.serviceType || "Prescription Analysis",
              uploadedDate: order.createdAt,
              status: order.status?.toLowerCase() || "pending",
              priority: order.priority?.toLowerCase() || "medium",
              documentName: order.orderNumber || "order.pdf",
              documentType: "PDF",
              documentUrl: "",
              prescriptionDetails: "",
              diagnosis: "",
              recommendations: "",
              notes: "",
              analysisNotes: "",
            }));
          allReports = [...allReports, ...orderReports];
        } catch (orderError) {
          console.error("Error fetching orders:", orderError);
          // Fall back to prescriptions
          try {
            const response = await analystAPI.getPendingPrescriptions();
            const prescriptions = response.data || response;
            
            console.log("Pending prescriptions:", prescriptions);
            
            prescriptions.forEach((prescription) => {
              if (hasCompletedReport(prescription)) {
                addCompletedToday(
                  `prescription-${prescription.id}`,
                  getCompletionDate(prescription),
                );
              }
            });
            
            // Transform prescriptions to report format
            const prescriptionReports = prescriptions
              .filter(prescription => {
                // Don't show if already completed
                if (prescription.status === 'APPROVED' || prescription.status === 'COMPLETED') {
                  return false;
                }
                // Skip if already added (avoid duplicates)
                if (seenOrderIds.has(prescription.id)) return false;
                seenOrderIds.add(prescription.id);
                return true;
              })
              .map(prescription => ({
                id: `REP-${prescription.id}`,
                prescriptionId: prescription.id,
                orderId: prescription.id,
                patientName: prescription.user?.fullName || "Unknown Patient",
                patientEmail: prescription.user?.email || "",
                patientPhone: prescription.user?.phone || "",
                patientAge: prescription.user?.age || "",
                patientGender: prescription.user?.gender || "",
                serviceType: prescription.serviceType || "Prescription Analysis",
                uploadedDate: prescription.createdAt,
                status: prescription.status?.toLowerCase() || "pending",
                priority: prescription.priority?.toLowerCase() || "medium",
                documentName: prescription.filePath || "prescription.pdf",
                documentType: "PDF",
                documentUrl: prescription.filePath || "/documents/prescription.pdf",
                prescriptionDetails: prescription.prescriptionDetails || "",
                diagnosis: prescription.diagnosis || "",
                recommendations: prescription.recommendations || "",
                notes: prescription.notes || "",
                analysisNotes: prescription.analysisNotes || "",
              }));
            allReports = [...allReports, ...prescriptionReports];
          } catch (prescriptionError) {
            console.error("Error fetching prescriptions:", prescriptionError);
          }
        }
      }
      
      setReports(allReports);
      setCompletedTodayCount(completedToday);
      setPendingCount(allReports.length);
      
      if (allReports.length === 0) {
        showEmptyState();
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError(err.message || "Failed to fetch reports. Please ensure the backend server is running.");
    } finally {
      setLoading(false);
    }
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

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case "PENDING":
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">Pending</span>;
      case "ANALYZED":
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">Analyzed</span>;
      case "APPROVED":
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">Approved</span>;
      case "REJECTED":
        return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">Rejected</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">{status}</span>;
    }
  };

  const handleDownload = (e, report) => {
    e.preventDefault();
    e.stopPropagation();
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

  return (
    <>
      <Navbar role="analyst" />
      
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
                onClick={() => navigate("/analyst/profile")}
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
            <h1 className="text-3xl sm:text-4xl text-[#1E3A8A] mb-4">Pending Analysis</h1>
            <p className="text-xl text-gray-600">Review and analyze prescriptions</p>
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
                  <p className="text-3xl text-[#EF4444]">{reports.filter(r => r.priority === 'high').length}</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-[#EF4444] to-[#F87171] rounded-xl flex items-center justify-center">
                  <User className="w-7 h-7 text-white" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Reports List */}
          <div className="space-y-4">
            {loading && (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
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
                <p className="text-gray-500 text-lg mb-2">No pending analysis found.</p>
                <p className="text-gray-400 text-sm">
                  If you've been assigned prescriptions by the admin, please wait or contact the admin.
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
                <Link to={`/analyst/generate/${report.prescriptionId}`}>
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
                        <div className="mt-2">
                          {getStatusBadge(report.status)}
                        </div>
                      </div>

                      {/* Priority & Action */}
                      <div className="flex items-center gap-4 flex-wrap">
                        {getPriorityBadge(report.priority)}
                        <div className="flex items-center text-[#2563EB] group-hover:translate-x-2 transition-transform duration-300">
                          <span className="mr-2">Analyze</span>
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

