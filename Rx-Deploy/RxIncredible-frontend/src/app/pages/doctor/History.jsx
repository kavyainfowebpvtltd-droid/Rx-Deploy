import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FileText, Calendar, User, Eye, Edit, CheckCircle, Clock, X, Download, Loader2, AlertCircle, Phone, Mail, MapPin, Hash } from "lucide-react";
import { Navbar } from "../../components/Navbar";
import { Footer } from "../../components/Footer";
import { Link, useNavigate } from "react-router";
import { prescriptionAPI, orderAPI, authAPI, getStoredUser, getToken } from "@/services/api.js";
import Swal from "sweetalert2";
import { API_BASE_URL } from "@/config/api.js";
import { formatReportId } from "@/app/utils/reportId.js";

export default function DoctorHistory() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("generated");
  const [selectedReport, setSelectedReport] = useState(null);
  const [generatedReports, setGeneratedReports] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    // Profile check removed - doctors can access history after profile update
    const initPage = async () => {
      await fetchData();
      await loadDrafts();
    };
    
    initPage();
    
    // Refresh data when page becomes visible (e.g., user returns from Generate page)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchData();
        loadDrafts();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!selectedReport) {
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
  }, [selectedReport]);

  const normalizeApiData = (response) => {
    if (Array.isArray(response)) {
      return response;
    }
    if (Array.isArray(response?.data)) {
      return response.data;
    }
    return [];
  };

  const loadDrafts = async () => {
    // Load drafts ONLY from backend database (no localStorage)
    let backendDrafts = [];
    try {
      // Get current user from backend API
      let currentUser;
      try {
        currentUser = await authAPI.getCurrentUser();
        
        // Handle axios response format - extract data if needed
        if (currentUser && currentUser.data && currentUser.data.id) {
          currentUser = currentUser.data;
        }
      } catch (authError) {
        console.error('Error getting current user in loadDrafts:', authError);
        // Try to get from localStorage as fallback
        const storedUser = getStoredUser();
        if (storedUser) {
          try {
            currentUser = storedUser;
          } catch (e) {
            console.error('Failed to parse stored user:', e);
          }
        }
      }
      
      console.log('loadDrafts - Current user:', currentUser);
      console.log('loadDrafts - Current user role:', currentUser?.role);
      console.log('loadDrafts - Current user ID:', currentUser?.id);
      
      // Validate doctorId before making API calls
      if (!currentUser || !currentUser.id) {
        console.error('Invalid or missing doctor ID in loadDrafts');
        setDrafts([]);
        return;
      }
      
      const doctorId = currentUser.id;
      console.log('loadDrafts - Using doctorId:', doctorId);
      
      if (doctorId) {
        // Get token for authentication
        const token = getToken();
        
        // Fetch prescriptions with DRAFT status from backend
        const response = await fetch(`${API_BASE_URL}/prescriptions/doctor/${doctorId}/drafts`, {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
        
        if (response.ok) {
          const prescriptions = await response.json();
          console.log("Prescriptions for doctor:", prescriptions);
          
          // Also fetch orders to get the order ID for each prescription
          let ordersData = [];
          try {
            const ordersRes = await orderAPI.getByDoctor(doctorId);
            ordersData = normalizeApiData(ordersRes);
          } catch (e) {
            console.log("Orders fetch error in loadDrafts:", e);
          }
          
          // Show ALL drafts (not just Second Opinion)
          backendDrafts = prescriptions
            .filter(p => {
              if (p.status !== 'DRAFT') return false;
              return true;
            })
            .map(p => {
              // Find the order that has this prescription
              const matchingOrder = ordersData.find(o => o.prescription && o.prescription.id === p.id);
              const orderId = matchingOrder ? matchingOrder.id : null;
              
              return {
                id: p.id,
                prescriptionId: p.id,
                orderId: orderId, // Set the order ID from the matching order
                patientName: p.user?.fullName || "Unknown Patient",
                age: p.user?.age,
                gender: p.user?.gender,
                consultationDate: p.consultationDate || "",
                chiefComplaints: p.chiefComplaints || "",
                historyPoints: p.historyPoints || "",
                examFindings: p.examFindings || "",
                diagnosis: p.diagnosis || "",
                recommendations: p.recommendations || "",
                prescriptionDetails: p.prescriptionDetails || "",
                notes: p.notes || "",
                height: p.height || p.user?.height || "",
                weight: p.weight || p.user?.weight || "",
                lmp: p.lmp || "",
                patientEmail: p.user?.email || "",
                patientPhone: p.user?.phone || "",
                patientAddress: p.user?.address || "",
                serviceType: p.serviceType === 'PRESCRIPTION_ANALYSIS' ? 'Prescription Analysis' :
                             p.serviceType === 'SECOND_OPINION' ? 'Second Opinion' :
                             p.serviceType === 'ONLINE_PHARMACY' ? 'Online Pharmacy' : 'Prescription Analysis',
                updatedAt: p.updatedAt || p.createdAt,
                isBackendDraft: true
              };
            });
        }
      }
    } catch (e) {
      console.log("Error fetching backend drafts:", e);
    }
    
    setDrafts(backendDrafts);
  };

  const fetchData = async () => {
    try {
      // Get current user from backend API (no localStorage)
      let currentUser;
      try {
        currentUser = await authAPI.getCurrentUser();
        
        // Handle axios response format - extract data if needed
        if (currentUser && currentUser.data && currentUser.data.id) {
          currentUser = currentUser.data;
          console.log('Extracted user from axios response:', currentUser.id);
        }
      } catch (authError) {
        console.error('Error getting current user:', authError);
        // Try to get from localStorage as fallback
        const storedUser = getStoredUser();
        if (storedUser) {
          try {
            currentUser = storedUser;
            console.log('Using user from localStorage:', currentUser);
          } catch (e) {
            console.error('Failed to parse stored user:', e);
          }
        }
      }
      
      console.log('Current user:', currentUser);
      console.log('Current user ID:', currentUser?.id);
      console.log('Current user role:', currentUser?.role);
      
      if (!currentUser) {
        setLoading(false);
        return;
      }
      
      // Validate that doctorId exists before making API calls
      if (!currentUser.id) {
        console.error('Invalid doctor ID:', currentUser.id);
        console.error('Full currentUser object:', JSON.stringify(currentUser));
        setLoading(false);
        return;
      }
      
      const doctorId = currentUser.id;
      console.log('fetchData - Using doctorId:', doctorId);
      
      let allCompleted = [];
      
      console.log('Fetching data for doctorId:', doctorId);
      
      // Get prescriptions
      try {
        const response = await prescriptionAPI.getByDoctorId(doctorId);
        // API returns array directly, not wrapped in response.data
        const prescriptions = Array.isArray(response) ? response : (response.data || []);
        console.log('Prescriptions response:', response);
        console.log('Prescriptions count:', prescriptions.length);
        
        // ONLY show Second Opinion - filter out other service types
        const completed = prescriptions.filter(p => {
          // First check basic status and user
          if (p.status !== "COMPLETED" || !p.user || !p.user.fullName || p.user.fullName === "N/A") {
            return false;
          }
          
          // Get service type from prescription or order
          let serviceType = p.serviceType;
          if (!serviceType && ordersData.length > 0) {
            const matchingOrder = ordersData.find(o => o.prescription && o.prescription.id === p.id);
            if (matchingOrder && matchingOrder.serviceType) {
              serviceType = matchingOrder.serviceType;
            }
          }
          
          // Only allow SECOND_OPINION
          const allowedTypes = ['SECOND_OPINION', 'Second Opinion'];
          return allowedTypes.includes(serviceType);
        });
        
        // Fetch orders to get service types using orderAPI
        let ordersData = [];
        try {
          const ordersRes = await orderAPI.getByDoctor(doctorId);
          if (ordersRes && ordersRes.length > 0) {
            ordersData = ordersRes;
          } else {
            console.log("No orders found for doctor");
          }
        } catch (e) {
          console.log("Orders fetch error:", e);
        }
        
        const prescriptionReports = completed.map(p => {
          // Get serviceType from order by matching user ID
          let serviceType = "Prescription Analysis";
          
          // First check if prescription has serviceType saved (could be enum or display string)
          if (p.serviceType) {
            if (p.serviceType === "PRESCRIPTION_ANALYSIS" || p.serviceType === "Prescription Analysis") {
              serviceType = "Prescription Analysis";
            } else if (p.serviceType === "SECOND_OPINION" || p.serviceType === "Second Opinion") {
              serviceType = "Second Opinion";
            } else if (p.serviceType === "ONLINE_PHARMACY" || p.serviceType === "Online Pharmacy") {
              serviceType = "Online Pharmacy";
            } else {
              serviceType = p.serviceType;
            }
          } else if (ordersData.length > 0) {
            // Find order by prescription ID
            const matchingOrder = ordersData.find(o => o.prescription && o.prescription.id === p.id);
            if (matchingOrder && matchingOrder.serviceType) {
              if (matchingOrder.serviceType === "PRESCRIPTION_ANALYSIS") serviceType = "Prescription Analysis";
              else if (matchingOrder.serviceType === "SECOND_OPINION") serviceType = "Second Opinion";
              else if (matchingOrder.serviceType === "ONLINE_PHARMACY") serviceType = "Online Pharmacy";
            }
          }
          return {
            id: p.id,
            prescriptionId: p.id,
            patientName: p.user?.fullName || "N/A",
            patientAge: p.user?.age,
            patientEmail: p.user?.email || "",
            patientPhone: p.user?.phone || "",
            patientAddress: p.user?.address || "",
            gender: p.user?.gender,
            consultationDate: p.consultationDate || "",
            chiefComplaints: p.chiefComplaints || "",
            historyPoints: p.historyPoints || "",
            examFindings: p.examFindings || "",
            doctorName: p.doctor?.fullName || "N/A",
            doctorSpecialization: p.doctor?.specialization || "",
            diagnosis: p.diagnosis || "",
            recommendations: p.recommendations || "",
            prescriptionDetails: p.prescriptionDetails || "",
            notes: p.notes || "",
            height: p.height || p.user?.height || "",
            weight: p.weight || p.user?.weight || "",
            lmp: p.lmp || "",
            serviceType: serviceType,
            createdAt: p.updatedAt || p.createdAt,
            orderNumber: p.order?.orderNumber,
            filePath: p.filePath || "",
            isOrder: false
          };
        });
        
        allCompleted = [...allCompleted, ...prescriptionReports];
      } catch (e) {
        console.log("No prescriptions found", e);
      }
      
      // Also get orders with completed medical reports
      // These are orders where doctor has submitted the medical report
      try {
        const ordersRes = await orderAPI.getByDoctor(doctorId);
        if (ordersRes && ordersRes.length > 0) {
          // Filter orders that have medical report data AND are not just drafts
          // ONLY show Second Opinion - filter out other service types
          const ordersWithReports = ordersRes.filter(order => {
            // Check if order has medical report data (not just empty)
            const hasMedicalReport = order.diagnosis || order.recommendations || order.prescriptionDetails || order.medicalReportFilePath;
            // Only include orders that have medical report and are either COMPLETED or have report file
            if (!hasMedicalReport || (order.status !== 'COMPLETED' && !order.medicalReportFilePath)) {
              return false;
            }
            
            // Only allow SECOND_OPINION
            const allowedTypes = ['SECOND_OPINION'];
            return allowedTypes.includes(order.serviceType);
          });
          
          // Convert orders to report format
          const orderReports = ordersWithReports.map(order => {
            let serviceType = "Prescription Analysis";
            if (order.serviceType) {
              if (order.serviceType === "PRESCRIPTION_ANALYSIS") serviceType = "Prescription Analysis";
              else if (order.serviceType === "SECOND_OPINION") serviceType = "Second Opinion";
              else if (order.serviceType === "ONLINE_PHARMACY") serviceType = "Online Pharmacy";
            }
            
            return {
              id: order.id,
              orderId: order.id,
              patientName: order.user?.fullName || "N/A",
              patientAge: order.user?.age,
              patientEmail: order.user?.email || "",
              patientPhone: order.user?.phone || "",
              patientAddress: order.user?.address || "",
              gender: order.user?.gender,
              consultationDate: order.consultationDate || "",
              chiefComplaints: order.chiefComplaints || "",
              historyPoints: order.historyPoints || "",
              examFindings: order.examFindings || "",
              doctorName: order.assignedDoctor?.fullName || "N/A",
              doctorSpecialization: order.assignedDoctor?.specialization || "",
              diagnosis: order.diagnosis || "",
              recommendations: order.recommendations || "",
              prescriptionDetails: order.prescriptionDetails || "",
              notes: order.notes || "",
              height: order.height || order.user?.height || "",
              weight: order.weight || order.user?.weight || "",
              lmp: order.lmp || "",
              serviceType: serviceType,
              createdAt: order.updatedAt || order.createdAt,
              orderNumber: order.orderNumber,
              filePath: order.medicalReportFilePath || "",
              isOrder: true
            };
          });
          
          // Add orders that are not already in the list (check both orderId and prescriptionId)
          const existingOrderIds = new Set(allCompleted.map(r => r.orderId).filter(Boolean));
          const existingPrescriptionIds = new Set(allCompleted.map(r => r.prescriptionId).filter(Boolean));
          
          orderReports.forEach(orderReport => {
            // Skip if this order ID already exists
            if (orderReport.orderId && existingOrderIds.has(orderReport.orderId)) {
              return;
            }
            // Skip if this prescription ID already exists
            if (orderReport.prescriptionId && existingPrescriptionIds.has(orderReport.prescriptionId)) {
              return;
            }
            allCompleted.push(orderReport);
          });
        }
      } catch (e) {
        console.log("Error fetching orders with reports:", e);
      }
      
      setGeneratedReports(allCompleted);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (report) => {
    try {
      setDownloading(true);
      
      if (!report.filePath) {
        try {
          await prescriptionAPI.generatePrescriptionPdf(report.id);
          await fetchData();
          alert("PDF generated successfully! Click download again to save.");
        } catch (error) {
          console.error("Error generating PDF:", error);
          alert("Failed to generate PDF. Please try again.");
        }
        setDownloading(false);
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/prescriptions/${report.id}/pdf/download`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prescription_${report.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.message || "Failed to download prescription PDF");
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Failed to download PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar role="doctor" />
        <div className="flex-1 flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-[#2563EB] animate-spin" />
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar role="doctor" />
      
      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h1 className="text-3xl sm:text-4xl text-[#1E3A8A] mb-4">My Work History</h1>
            <p className="text-xl text-gray-600">View all your generated reports</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 mb-2">Total Reports Generated</p>
                  <p className="text-3xl text-[#16A34A]">{generatedReports.length}</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-[#16A34A] to-[#22C55E] rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-white" />
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
                  <p className="text-gray-600 mb-2">Saved Drafts</p>
                  <p className="text-3xl text-[#F59E0B]">{drafts.length}</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-[#F59E0B] to-[#FBBF24] rounded-xl flex items-center justify-center">
                  <Clock className="w-7 h-7 text-white" />
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-8"
          >
            <div className="bg-white rounded-2xl shadow-lg p-2 inline-flex gap-2">
              <button
                onClick={() => setActiveTab("generated")}
                className={`px-6 py-3 rounded-xl transition-all duration-200 flex items-center gap-2 ${
                  activeTab === "generated"
                    ? "bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <CheckCircle className="w-5 h-5" />
                Generated Reports ({generatedReports.length})
              </button>
              <button
                onClick={() => setActiveTab("drafts")}
                className={`px-6 py-3 rounded-xl transition-all duration-200 flex items-center gap-2 ${
                  activeTab === "drafts"
                    ? "bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Clock className="w-5 h-5" />
                Saved Drafts ({drafts.length})
              </button>
            </div>
          </motion.div>

          {activeTab === "generated" && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-white rounded-2xl shadow-lg overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white">
                    <tr>
                      <th className="px-6 py-4 text-left">Report ID</th>
                      <th className="px-6 py-4 text-left">Patient Details</th>
                      <th className="px-6 py-4 text-left">Service Type</th>
                      <th className="px-6 py-4 text-left">Date Generated</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedReports.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                          No generated reports found
                        </td>
                      </tr>
                    ) : (
                      generatedReports.map((report, index) => (
                        <motion.tr
                          key={`report-${report.id}-${report.isOrder ? 'order' : 'prescription'}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="border-b border-gray-200 hover:bg-[#F1F5F9] transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <FileText className="w-5 h-5 text-[#2563EB]" />
                              <span className="text-gray-700 font-medium">
                                {formatReportId(report.orderNumber || report.id)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] rounded-full flex items-center justify-center text-white">
                                {report.patientName?.charAt(0) || 'P'}
                              </div>
                              <div>
                                <p className="text-gray-700 font-medium">{report.patientName || 'N/A'}</p>
                                <p className="text-sm text-gray-500">
                                  {report.gender || 'N/A'}, {report.patientAge || 'N/A'} years
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-sm ${
                              report.serviceType === 'Second Opinion' 
                                ? 'bg-purple-100 text-purple-700' 
                                : report.serviceType === 'Online Pharmacy'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {report.serviceType || 'Prescription Analysis'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              {report.isOrder ? (
                                <Link to={`/doctor/generate/${report.id}`}>
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="p-2 text-[#2563EB] hover:bg-blue-50 rounded-lg transition-colors"
                                    title="View Report"
                                  >
                                    <Eye className="w-5 h-5" />
                                  </motion.button>
                                </Link>
                              ) : (
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => setSelectedReport(report)}
                                  className="p-2 text-[#2563EB] hover:bg-blue-50 rounded-lg transition-colors"
                                  title="View Report"
                                >
                                  <Eye className="w-5 h-5" />
                                </motion.button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between px-6 py-4 bg-[#F1F5F9]">
                <p className="text-sm text-gray-600">
                  Showing {generatedReports.length} generated reports
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === "drafts" && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-white rounded-2xl shadow-lg overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] text-white">
                    <tr>
                      <th className="px-6 py-4 text-left">Draft ID</th>
                      <th className="px-6 py-4 text-left">Patient Details</th>
                      <th className="px-6 py-4 text-left">Service Type</th>
                      <th className="px-6 py-4 text-left">Last Saved</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drafts.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                          No saved drafts
                        </td>
                      </tr>
                    ) : (
                      drafts.map((draft, index) => (
                        <motion.tr
                          key={`draft-${draft.id}-${draft.isLocalDraft ? 'local' : 'remote'}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="border-b border-gray-200 hover:bg-[#F1F5F9] transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <FileText className="w-5 h-5 text-[#F59E0B]" />
                              <span className="text-gray-700 font-medium">
                                {draft.isLocalDraft ? `LOCAL-${draft.id}` : `DRF-${draft.id}`}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-[#F59E0B] to-[#FBBF24] rounded-full flex items-center justify-center text-white">
                                {draft.patientName?.charAt(0) || 'P'}
                              </div>
                              <div>
                                <p className="text-gray-700 font-medium">
                                  {draft.patientName || (draft.isLocalDraft ? 'Order #' + draft.id : 'Unknown')}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {draft.gender || 'N/A'}, {draft.age || 'N/A'} years
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                              {draft.serviceType || 'Prescription Analysis'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {draft.updatedAt ? new Date(draft.updatedAt).toLocaleDateString() : 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <Link
                                to={draft.orderId ? `/doctor/generate/${draft.orderId}` : '#'}
                                onClick={(event) => {
                                  if (!draft.orderId) {
                                    event.preventDefault();
                                    Swal.fire({
                                      icon: 'error',
                                      title: 'Order link missing',
                                      text: 'Is draft ka order link nahi mila. Page refresh karke phir try kijiye.',
                                      confirmButtonColor: '#2563EB'
                                    });
                                  }
                                }}
                              >
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  className="p-2 text-[#2563EB] hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Continue Editing"
                                  disabled={!draft.orderId}
                                >
                                  <Edit className="w-5 h-5" />
                                </motion.button>
                              </Link>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between px-6 py-4 bg-[#F1F5F9]">
                <p className="text-sm text-gray-600">
                  Showing {drafts.length} saved drafts
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />

      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedReport(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl"
            >
              <div className="border-b border-slate-200 bg-white px-8 py-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-400">Medical Report</p>
                      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#16327A]">
                        {selectedReport.patientName || 'N/A'}
                      </h2>
                      <p className="mt-2 text-sm text-slate-500">
                        Report ID: {formatReportId(selectedReport.orderNumber || selectedReport.id)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Service</p>
                        <p className="mt-1 text-sm font-semibold text-[#173B8C]">{selectedReport.serviceType || 'Second Opinion'}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Doctor</p>
                        <p className="mt-1 text-sm font-semibold text-[#173B8C]">{selectedReport.doctorName || 'N/A'}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Generated</p>
                        <p className="mt-1 text-sm font-semibold text-[#173B8C]">
                          {selectedReport.createdAt ? new Date(selectedReport.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedReport(null)}
                    className="rounded-full border border-slate-200 bg-white p-2.5 text-slate-500 transition-colors duration-200 hover:bg-slate-100"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FBFF_100%)] p-5 sm:p-8">
                <div className="space-y-6">
                  <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8EEFF] text-[#1E3A8A]">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-[#16327A]">Patient Overview</h3>
                          <p className="text-sm text-slate-500">Core patient details recorded for this report.</p>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Patient Name</p>
                          <p className="mt-2 text-lg font-semibold text-[#173B8C]">{selectedReport.patientName || 'N/A'}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Age / Gender</p>
                          <p className="mt-2 text-lg font-semibold text-[#173B8C]">
                            {selectedReport.patientAge || 'N/A'} {selectedReport.patientAge ? 'years' : ''} {selectedReport.gender ? `• ${selectedReport.gender}` : ''}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                          <div className="flex items-center gap-2 text-slate-500">
                            <Calendar className="h-4 w-4" />
                            <p className="text-xs font-medium uppercase tracking-[0.18em]">Consultation Date</p>
                          </div>
                          <p className="mt-2 text-base font-semibold text-[#173B8C]">
                            {selectedReport.consultationDate
                              ? new Date(selectedReport.consultationDate).toLocaleDateString()
                              : 'N/A'}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Height / Weight</p>
                          <p className="mt-2 text-base font-semibold text-[#173B8C]">
                            {selectedReport.height || 'N/A'} {selectedReport.weight ? `• ${selectedReport.weight}` : ''}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                          <div className="flex items-center gap-2 text-slate-500">
                            <Phone className="h-4 w-4" />
                            <p className="text-xs font-medium uppercase tracking-[0.18em]">Phone</p>
                          </div>
                          <p className="mt-2 break-words text-base font-semibold text-[#173B8C]">{selectedReport.patientPhone || 'N/A'}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                          <div className="flex items-center gap-2 text-slate-500">
                            <Mail className="h-4 w-4" />
                            <p className="text-xs font-medium uppercase tracking-[0.18em]">Email</p>
                          </div>
                          <p className="mt-2 break-all text-base font-semibold text-[#173B8C]">{selectedReport.patientEmail || 'N/A'}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:col-span-2">
                          <div className="flex items-center gap-2 text-slate-500">
                            <MapPin className="h-4 w-4" />
                            <p className="text-xs font-medium uppercase tracking-[0.18em]">Address</p>
                          </div>
                          <p className="mt-2 text-base font-semibold leading-7 text-[#173B8C]">{selectedReport.patientAddress || 'N/A'}</p>
                        </div>
                        {selectedReport.lmp && (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:col-span-2 xl:col-span-1">
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">LMP</p>
                            <p className="mt-2 text-base font-semibold text-[#173B8C]">{selectedReport.lmp}</p>
                          </div>
                        )}
                      </div>
                  </section>

                  <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8EEFF] text-[#1E3A8A]">
                          <Hash className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-[#16327A]">Report Metadata</h3>
                          <p className="text-sm text-slate-500">Administrative details attached to this report.</p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                          <span className="text-sm text-slate-500">Doctor Name</span>
                          <p className="mt-1 font-semibold text-[#173B8C]">{selectedReport.doctorName || 'N/A'}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                          <span className="text-sm text-slate-500">Specialization</span>
                          <p className="mt-1 font-semibold text-[#173B8C]">{selectedReport.doctorSpecialization || 'N/A'}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                          <span className="text-sm text-slate-500">Service Type</span>
                          <p className="mt-1 font-semibold text-[#173B8C]">{selectedReport.serviceType || 'N/A'}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                          <span className="text-sm text-slate-500">Generated Date</span>
                          <p className="mt-1 font-semibold text-[#173B8C]">
                            {selectedReport.createdAt ? new Date(selectedReport.createdAt).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                        {selectedReport.orderNumber && (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 sm:col-span-2">
                            <span className="text-sm text-slate-500">Order Number</span>
                            <p className="mt-1 font-semibold text-[#173B8C]">{selectedReport.orderNumber}</p>
                          </div>
                        )}
                      </div>
                  </section>

                  <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8EEFF] text-[#1E3A8A]">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-[#16327A]">Clinical Summary</h3>
                          <p className="text-sm text-slate-500">Primary findings and recommended care plan.</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="grid gap-4 lg:grid-cols-3">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 lg:col-span-1">
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Chief Complaints</p>
                            <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                              <p className="whitespace-pre-wrap break-words text-base leading-8 text-slate-700">
                                {selectedReport.chiefComplaints || 'No chief complaints recorded.'}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 lg:col-span-1">
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Relevant History</p>
                            <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                              <p className="whitespace-pre-wrap break-words text-base leading-8 text-slate-700">
                                {selectedReport.historyPoints || 'No history points recorded.'}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 lg:col-span-1">
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Examination / Lab Findings</p>
                            <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                              <p className="whitespace-pre-wrap break-words text-base leading-8 text-slate-700">
                                {selectedReport.examFindings || 'No examination findings recorded.'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {selectedReport.diagnosis && (
                          <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-[#F7FAFF] to-[#EEF4FF] p-5">
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Diagnosis</p>
                            <p className="mt-3 text-lg font-semibold leading-8 text-[#173B8C]">
                              {selectedReport.diagnosis}
                            </p>
                          </div>
                        )}

                        <div className="space-y-4">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Recommendations</p>
                            <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                              <p className="whitespace-pre-wrap break-words text-base leading-8 text-slate-700">
                                {selectedReport.recommendations || 'No recommendations recorded.'}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Doctor Notes</p>
                            <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                              <p className="whitespace-pre-wrap break-words text-base leading-8 text-slate-700">
                                {selectedReport.notes || 'No additional notes recorded.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                  </section>

                  <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8EEFF] text-[#1E3A8A]">
                          <Clock className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-[#16327A]">Prescription</h3>
                          <p className="text-sm text-slate-500">Medicines and directions issued with this report.</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                        {selectedReport.prescriptionDetails ? (
                          <div className="space-y-3">
                            {selectedReport.prescriptionDetails
                              .split('\n')
                              .filter(Boolean)
                              .map((line, index) => (
                                <div
                                  key={`${selectedReport.id}-prescription-${index}`}
                                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base leading-8 text-slate-700 shadow-sm"
                                >
                                  {line}
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-6 text-center text-sm text-slate-500">
                            No prescription details were recorded for this report.
                          </div>
                        )}
                      </div>
                  </section>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-4 border-t border-slate-200 bg-white px-8 py-5">
                <button
                  onClick={() => setSelectedReport(null)}
                  className="rounded-2xl bg-[#1E3A8A] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/15 transition-colors duration-200 hover:bg-[#2563EB]"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

