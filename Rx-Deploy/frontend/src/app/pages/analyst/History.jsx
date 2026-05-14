import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FileText, Calendar, User, Eye, Edit, CheckCircle, Clock, X, Download, Loader2, Phone, Mail, MapPin, Hash } from "lucide-react";
import { Navbar } from "../../components/Navbar";
import { Footer } from "../../components/Footer";
import { TablePagination } from "../../components/TablePagination.jsx";
import { Link, useNavigate } from "react-router";
import { analystAPI, authAPI, getStoredUser, getToken } from "@/services/api.js";
import Swal from "sweetalert2";
import { API_BASE_URL } from "@/config/api.js";
import { formatReportId } from "@/app/utils/reportId.js";

const TABLE_PAGE_SIZE = 10;

const parsePrescriptionDetails = (value = "") =>
  String(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const withoutIndex = line.replace(/^\d+\.\s*/, "");
      const [name, form, strength, frequency, duration, ...descriptionParts] =
        withoutIndex.split(/\s*,\s*/);

      return {
        id: `${index}-${withoutIndex}`,
        name: name || "",
        form: form || "",
        strength: strength || "",
        frequency: frequency || "",
        duration: duration || "",
        description: descriptionParts.join(", ") || "",
      };
    })
    .filter(
      (item) =>
        item.name ||
        item.form ||
        item.strength ||
        item.frequency ||
        item.duration ||
        item.description,
    );

export default function AnalystHistory() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("generated");
  const [selectedReport, setSelectedReport] = useState(null);
  const [generatedReports, setGeneratedReports] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const [generatedPage, setGeneratedPage] = useState(1);
  const [draftsPage, setDraftsPage] = useState(1);

  useEffect(() => {
    const initPage = async () => {
      await fetchData();
      await loadDrafts();
    };
    
    initPage();
    
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

  useEffect(() => {
    setGeneratedPage(1);
  }, [generatedReports.length]);

  useEffect(() => {
    setDraftsPage(1);
  }, [drafts.length]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(generatedReports.length / TABLE_PAGE_SIZE));
    if (generatedPage > totalPages) {
      setGeneratedPage(totalPages);
    }
  }, [generatedPage, generatedReports.length]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(drafts.length / TABLE_PAGE_SIZE));
    if (draftsPage > totalPages) {
      setDraftsPage(totalPages);
    }
  }, [drafts.length, draftsPage]);

  const paginatedGeneratedReports = generatedReports.slice(
    (generatedPage - 1) * TABLE_PAGE_SIZE,
    generatedPage * TABLE_PAGE_SIZE,
  );

  const paginatedDrafts = drafts.slice(
    (draftsPage - 1) * TABLE_PAGE_SIZE,
    draftsPage * TABLE_PAGE_SIZE,
  );

  const mergeDraftRecord = (existingDrafts, nextDraft) => {
    const duplicateIndex = existingDrafts.findIndex((draft) =>
      (nextDraft.orderId && draft.orderId === nextDraft.orderId) ||
      (nextDraft.prescriptionId && draft.prescriptionId === nextDraft.prescriptionId) ||
      draft.id === nextDraft.id
    );

    if (duplicateIndex === -1) {
      existingDrafts.push(nextDraft);
      return;
    }

    const currentDraft = existingDrafts[duplicateIndex];
    existingDrafts[duplicateIndex] = {
      ...currentDraft,
      ...nextDraft,
      orderId: currentDraft.orderId || nextDraft.orderId,
      prescriptionId: currentDraft.prescriptionId || nextDraft.prescriptionId,
    };
  };

  const loadDrafts = async () => {
    let backendDrafts = [];
    try {
      let currentUser;
      try {
        currentUser = await authAPI.getCurrentUser();
        if (currentUser && currentUser.data && currentUser.data.id) {
          currentUser = currentUser.data;
        }
      } catch (authError) {
        console.error('Error getting current user in loadDrafts:', authError);
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
      
      if (!currentUser || !currentUser.id) {
        console.error('Invalid or missing analyst ID in loadDrafts');
        setDrafts([]);
        return;
      }
      
      const analystId = currentUser.id;
      
      if (analystId) {
        const token = getToken();
        
        // First, try fetching from prescriptions API (original method)
        try {
          const response = await fetch(`${API_BASE_URL}/prescriptions/analyst/${analystId}/drafts`, {
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          });
          
          if (response.ok) {
            const prescriptions = await response.json();
            console.log("Draft prescriptions for analyst from prescriptions API:", prescriptions);
            const prescriptionDrafts = prescriptions
              .filter(p => p.status === 'DRAFT')
              .map(p => ({
                id: p.id,
                prescriptionId: p.id,
                patientName: p.user?.fullName || "Unknown Patient",
                age: p.user?.age,
                gender: p.user?.gender,
                diagnosis: p.diagnosis || "",
                recommendations: p.recommendations || "",
                prescriptionDetails: p.prescriptionDetails || "",
                notes: p.notes || "",
                serviceType: p.serviceType || 'Prescription Analysis',
                updatedAt: p.updatedAt || p.createdAt,
                isBackendDraft: true,
                // Store the order ID for navigation to generate page
                orderId: p.order ? p.order.id : null
              }));
            prescriptionDrafts.forEach((draft) => mergeDraftRecord(backendDrafts, draft));
          }
        } catch (e) {
          console.log("Error fetching from prescriptions API:", e);
        }
        
        // Second, try fetching from orders API (orders assigned to this analyst with draft status)
        try {
          const ordersResponse = await fetch(`${API_BASE_URL}/orders/analyst/${analystId}`, {
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          });
          
          if (ordersResponse.ok) {
            const orders = await ordersResponse.json();
            console.log("Orders for analyst from orders API:", orders);
            
            // Filter orders with medicalReportStatus = DRAFT or IN_PROGRESS
            const orderDrafts = orders
              .filter(o => o.medicalReportStatus === 'DRAFT' || o.medicalReportStatus === 'IN_PROGRESS')
              .map(o => ({
                id: o.id,
                prescriptionId: o.prescription ? o.prescription.id : null,
                orderId: o.id,
                patientName: o.user?.fullName || "Unknown Patient",
                age: o.user?.age,
                gender: o.user?.gender,
                diagnosis: o.prescription?.diagnosis || "",
                recommendations: o.prescription?.recommendations || "",
                prescriptionDetails: o.prescription?.prescriptionDetails || "",
                notes: o.prescription?.notes || "",
                serviceType: o.serviceType || 'Prescription Analysis',
                updatedAt: o.updatedAt || o.createdAt,
                isBackendDraft: true
              }));
            
            orderDrafts.forEach(draft => {
              mergeDraftRecord(backendDrafts, draft);
            });
          }
        } catch (e) {
          console.log("Error fetching from orders API:", e);
        }
      }
    } catch (e) {
      console.log("Error fetching backend drafts:", e);
    }
    
    setDrafts(backendDrafts);
    console.log("Total drafts loaded:", backendDrafts.length);
  };

  const fetchData = async () => {
    try {
      let currentUser;
      try {
        currentUser = await authAPI.getCurrentUser();
        if (currentUser && currentUser.data && currentUser.data.id) {
          currentUser = currentUser.data;
        }
      } catch (authError) {
        console.error('Error getting current user:', authError);
        const storedUser = getStoredUser();
        if (storedUser) {
          try {
            currentUser = storedUser;
          } catch (e) {
            console.error('Failed to parse stored user:', e);
          }
        }
      }
      
      console.log('Current user:', currentUser);
      
      if (!currentUser) {
        setLoading(false);
        return;
      }
      
      if (!currentUser.id) {
        console.error('Invalid analyst ID:', currentUser.id);
        setLoading(false);
        return;
      }
      
      const analystId = currentUser.id;
      let allCompleted = [];
      let allDraftIds = new Set(); // Track draft IDs to exclude from analyzed
      
      console.log('Fetching data for analystId:', analystId);
      
      // First, load drafts to get their IDs (to exclude from analyzed)
      try {
        const ordersResponse = await fetch(`${API_BASE_URL}/orders/analyst/${analystId}`, {
          headers: {
            "Content-Type": "application/json",
            ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
          },
        });
        
        if (ordersResponse.ok) {
          const orders = await ordersResponse.json();
          console.log('Orders for analyst (for draft exclusion):', orders);
          
          // Collect all draft order IDs and prescription IDs to exclude from analyzed
          orders.forEach(o => {
            if (o.medicalReportStatus === 'DRAFT' || o.medicalReportStatus === 'IN_PROGRESS') {
              allDraftIds.add(o.id); // Order ID
              if (o.prescription && o.prescription.id) {
                allDraftIds.add(o.prescription.id); // Prescription ID
              }
            }
          });
          console.log('Draft IDs to exclude:', Array.from(allDraftIds));
        }
      } catch (e) {
        console.log("Error fetching orders for draft exclusion:", e);
      }
      
      // Also check prescriptions API for drafts
      try {
        const prescriptionsResponse = await fetch(`${API_BASE_URL}/prescriptions/analyst/${analystId}/drafts`, {
          headers: {
            "Content-Type": "application/json",
            ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
          },
        });
        
        if (prescriptionsResponse.ok) {
          const draftPrescriptions = await prescriptionsResponse.json();
          console.log('Draft prescriptions for exclusion:', draftPrescriptions);
          
          draftPrescriptions.forEach(p => {
            allDraftIds.add(p.id);
          });
          console.log('Draft IDs after adding prescription drafts:', Array.from(allDraftIds));
        }
      } catch (e) {
        console.log("Error fetching draft prescriptions for exclusion:", e);
      }
      
      // Now fetch prescriptions for analyzed tab, excluding drafts
      try {
        const response = await analystAPI.getAllPrescriptions();
        const prescriptions = Array.isArray(response) ? response : (response.data || []);
        console.log('Prescriptions response:', prescriptions);
        console.log('Prescriptions count:', prescriptions.length);
        console.log('Excluding draft IDs:', Array.from(allDraftIds));
        
        const completed = prescriptions.filter(p => {
          // Exclude drafts
          if (allDraftIds.has(p.id)) {
            console.log('Excluding draft prescription:', p.id);
            return false;
          }
          
          // Only show APPROVED or COMPLETED
          if (p.status !== "APPROVED" && p.status !== "COMPLETED") {
            return false;
          }
          
          // Exclude invalid users
          if (!p.user || !p.user.fullName || p.user.fullName === "N/A") {
            return false;
          }
          
          return true;
        });
        
        console.log('Filtered completed prescriptions:', completed.length);
        
        const prescriptionReports = completed.map(p => ({
          id: p.id,
          prescriptionId: p.id,
          patientName: p.user?.fullName || "N/A",
          patientAge: p.user?.age,
          patientEmail: p.user?.email || "",
          patientPhone: p.user?.phone || "",
          patientAddress: p.user?.address || "",
          gender: p.user?.gender,
          diagnosis: p.diagnosis || "N/A",
          chiefComplaints: p.chiefComplaints || "",
          historyPoints: p.historyPoints || "",
          examFindings: p.examFindings || "",
          investigations: p.investigations || "",
          specialInstructions: p.specialInstructions || "",
          recommendations: p.recommendations || "",
          prescriptionDetails: p.prescriptionDetails || "",
          notes: p.notes || "",
          analysisNotes: p.analysisNotes || "",
          serviceType: p.serviceType || "Prescription Analysis",
          createdAt: p.updatedAt || p.createdAt,
          filePath: p.filePath || "",
          isOrder: false
        }));
        
        allCompleted = [...allCompleted, ...prescriptionReports];
      } catch (e) {
        console.log("No prescriptions found", e);
      }
      
      // Also fetch from orders API for completed medical reports
      try {
        const ordersResponse = await fetch(`${API_BASE_URL}/orders/analyst/${analystId}`, {
          headers: {
            "Content-Type": "application/json",
            ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
          },
        });
        
        if (ordersResponse.ok) {
          const orders = await ordersResponse.json();
          console.log('All orders for analyst:', orders);
          
          // Filter orders with COMPLETED medical report status
          const completedOrders = orders.filter(o => {
            // Exclude drafts
            if (allDraftIds.has(o.id)) {
              return false;
            }
            
            // Only show COMPLETED medical reports
            if (o.medicalReportStatus !== 'COMPLETED') {
              return false;
            }
            
            return true;
          });
          
          console.log('Completed orders:', completedOrders.length);
          
          const orderReports = completedOrders.map(o => ({
            id: o.id,
            orderId: o.id,
            prescriptionId: o.prescription ? o.prescription.id : null,
            patientName: o.user?.fullName || "N/A",
            patientAge: o.user?.age,
            patientEmail: o.user?.email || "",
            patientPhone: o.user?.phone || "",
            patientAddress: o.user?.address || "",
            gender: o.user?.gender,
            diagnosis: o.prescription?.diagnosis || "N/A",
            chiefComplaints: o.prescription?.chiefComplaints || "",
            historyPoints: o.prescription?.historyPoints || "",
            examFindings: o.prescription?.examFindings || "",
            investigations: o.prescription?.investigations || "",
            specialInstructions: o.prescription?.specialInstructions || "",
            recommendations: o.prescription?.recommendations || "",
            prescriptionDetails: o.prescription?.prescriptionDetails || "",
            notes: o.prescription?.notes || "",
            analysisNotes: o.prescription?.analysisNotes || "",
            serviceType: o.serviceType || "Prescription Analysis",
            createdAt: o.updatedAt || o.createdAt,
            filePath: o.medicalReportFilePath || "",
            isOrder: true
          }));
          
          // Add order reports that don't already exist (check by prescription ID)
          const existingPrescriptionIds = new Set(allCompleted.map(r => r.prescriptionId).filter(Boolean));
          const existingOrderIds = new Set(allCompleted.map(r => r.orderId).filter(Boolean));
          
          orderReports.forEach(orderReport => {
            // Skip if this prescription ID already exists
            if (orderReport.prescriptionId && existingPrescriptionIds.has(orderReport.prescriptionId)) {
              return;
            }
            // Skip if this order ID already exists
            if (orderReport.orderId && existingOrderIds.has(orderReport.orderId)) {
              return;
            }
            allCompleted.push(orderReport);
          });
        }
      } catch (e) {
        console.log("Error fetching completed orders:", e);
      }
      
      setGeneratedReports(allCompleted);
      console.log('Total analyzed reports:', allCompleted.length);
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
          await analystAPI.generatePrescriptionPdf(report.id);
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
        <Navbar role="analyst" />
        <div className="flex-1 flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-[#2563EB] animate-spin" />
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar role="analyst" />
      
      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h1 className="text-3xl sm:text-4xl text-[#1E3A8A] mb-4">My Work History</h1>
            <p className="text-xl text-gray-600">View all your analyzed prescriptions</p>
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
                  <p className="text-gray-600 mb-2">Total Analyzed</p>
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
                Analyzed ({generatedReports.length})
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
                      <th className="px-6 py-4 text-left">Date Analyzed</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedReports.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                          No analyzed prescriptions found
                        </td>
                      </tr>
                    ) : (
                      paginatedGeneratedReports.map((report, index) => (
                        <motion.tr
                          key={`report-${report.id}`}
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
                            <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
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
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setSelectedReport(report)}
                                className="p-2 text-[#2563EB] hover:bg-blue-50 rounded-lg transition-colors"
                                title="View Report"
                              >
                                <Eye className="w-5 h-5" />
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <TablePagination
                currentPage={generatedPage}
                onPageChange={setGeneratedPage}
                totalItems={generatedReports.length}
                itemLabel="analyzed prescriptions"
                pageSize={TABLE_PAGE_SIZE}
              />
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
                      paginatedDrafts.map((draft, index) => (
                        <motion.tr
                          key={`draft-${draft.id}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="border-b border-gray-200 hover:bg-[#F1F5F9] transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <FileText className="w-5 h-5 text-[#F59E0B]" />
                              <span className="text-gray-700 font-medium">
                                {draft.isBackendDraft ? `DRF-${draft.id}` : `LOCAL-${draft.id}`}
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
                                  {draft.patientName || 'Unknown'}
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
                                to={draft.orderId ? `/analyst/generate/${draft.orderId}` : '#'}
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

              <TablePagination
                currentPage={draftsPage}
                onPageChange={setDraftsPage}
                totalItems={drafts.length}
                itemLabel="saved drafts"
                pageSize={TABLE_PAGE_SIZE}
              />
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
                        <p className="mt-1 text-sm font-semibold text-[#173B8C]">{selectedReport.serviceType || 'Prescription Analysis'}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Status</p>
                        <p className="mt-1 text-sm font-semibold text-[#173B8C]">Analyzed</p>
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
                          {selectedReport.patientAge || 'N/A'} {selectedReport.patientAge ? 'years' : ''} {selectedReport.gender ? ` | ${selectedReport.gender}` : ''}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Calendar className="h-4 w-4" />
                          <p className="text-xs font-medium uppercase tracking-[0.18em]">Analyzed Date</p>
                        </div>
                        <p className="mt-2 text-base font-semibold text-[#173B8C]">
                          {selectedReport.createdAt ? new Date(selectedReport.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Service Type</p>
                        <p className="mt-2 text-base font-semibold text-[#173B8C]">{selectedReport.serviceType || 'Prescription Analysis'}</p>
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
                        <span className="text-sm text-slate-500">Report ID</span>
                        <p className="mt-1 font-semibold text-[#173B8C]">
                          {formatReportId(selectedReport.orderNumber || selectedReport.id)}
                        </p>
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
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                        <span className="text-sm text-slate-500">File Status</span>
                        <p className="mt-1 font-semibold text-[#173B8C]">{selectedReport.filePath ? 'Available' : 'Not generated'}</p>
                      </div>
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
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Chief Complaints</p>
                          <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                            <p className="whitespace-pre-wrap break-words text-base leading-8 text-slate-700">
                              {selectedReport.chiefComplaints || 'No chief complaints recorded.'}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Relevant Points from History</p>
                          <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                            <p className="whitespace-pre-wrap break-words text-base leading-8 text-slate-700">
                              {selectedReport.historyPoints || 'No history points recorded.'}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Examination / Lab Findings</p>
                          <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                            <p className="whitespace-pre-wrap break-words text-base leading-8 text-slate-700">
                              {selectedReport.examFindings || 'No examination or lab findings recorded.'}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Suggested Investigations</p>
                          <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                            <p className="whitespace-pre-wrap break-words text-base leading-8 text-slate-700">
                              {selectedReport.investigations ||
                                selectedReport.recommendations ||
                                'No suggested investigations recorded.'}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Special Instructions</p>
                          <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                            <p className="whitespace-pre-wrap break-words text-base leading-8 text-slate-700">
                              {selectedReport.specialInstructions ||
                                selectedReport.notes ||
                                'No special instructions recorded.'}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Prescription Details</p>
                          <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                            {(() => {
                              const prescriptionItems = parsePrescriptionDetails(
                                selectedReport.prescriptionDetails,
                              );

                              if (prescriptionItems.length === 0) {
                                return (
                                  <p className="whitespace-pre-wrap break-words text-base leading-8 text-slate-700">
                                    {selectedReport.prescriptionDetails ||
                                      'No prescription details recorded.'}
                                  </p>
                                );
                              }

                              return (
                                <div className="space-y-4">
                                  {prescriptionItems.map((item, index) => (
                                    <div
                                      key={item.id}
                                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                                    >
                                      <p className="text-sm font-semibold text-[#173B8C]">
                                        Medicine {index + 1}
                                      </p>
                                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                                        <div>
                                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Name</p>
                                          <p className="mt-1 text-sm font-semibold text-slate-700">
                                            {item.name || 'N/A'}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Form</p>
                                          <p className="mt-1 text-sm font-semibold text-slate-700">
                                            {item.form || 'N/A'}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Strength</p>
                                          <p className="mt-1 text-sm font-semibold text-slate-700">
                                            {item.strength || 'N/A'}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Frequency</p>
                                          <p className="mt-1 text-sm font-semibold text-slate-700">
                                            {item.frequency || 'N/A'}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Duration</p>
                                          <p className="mt-1 text-sm font-semibold text-slate-700">
                                            {item.duration || 'N/A'}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Description</p>
                                          <p className="mt-1 text-sm font-semibold text-slate-700">
                                            {item.description || 'N/A'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {selectedReport.analysisNotes && (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Analysis Notes</p>
                            <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                              <p className="whitespace-pre-wrap break-words text-base leading-8 text-slate-700">
                                {selectedReport.analysisNotes}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
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

