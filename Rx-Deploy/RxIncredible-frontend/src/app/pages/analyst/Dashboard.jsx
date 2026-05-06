import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router";
import { FileText, Clock, User, Eye, Check, X, AlertCircle, Loader2 } from "lucide-react";
import { Navbar } from "../../components/Navbar";
import { Footer } from "../../components/Footer";
import Swal from "sweetalert2";
import { authAPI, analystAPI, getStoredUser, getToken } from "@/services/api.js";
import { API_BASE_URL } from "@/config/api.js";

export default function AnalystReports() {
  const navigate = useNavigate();
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, analyzed: 0, completed: 0 });
  const [activeTab, setActiveTab] = useState("pending");
  const [profileIncomplete, setProfileIncomplete] = useState(false);

  useEffect(() => {
    fetchPrescriptions();
  }, [activeTab]);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getToken();
      if (!token) {
        setError("Please login to access this page");
        setLoading(false);
        return;
      }

      // Get current user
      let currentUser;
      try {
        const response = await authAPI.getCurrentUser();
        currentUser = response?.data || response;
      } catch (err) {
        const storedUser = getStoredUser();
        if (storedUser) {
          currentUser = storedUser;
        }
      }

      if (!currentUser || currentUser.role !== 'ANALYST') {
        setError("Access denied. You must be an analyst to view this page.");
        setLoading(false);
        return;
      }

      // Fetch prescriptions based on active tab
      let data = [];
      try {
        if (activeTab === "pending") {
          const response = await analystAPI.getPendingPrescriptions();
          data = response.data || response;
        } else if (activeTab === "analyzed") {
          const response = await analystAPI.getPrescriptionsByStatus("ANALYZED");
          data = response.data || response;
        } else if (activeTab === "completed") {
          const response = await analystAPI.getCompletedPrescriptions();
          data = response.data || response;
        } else {
          const response = await analystAPI.getAllPrescriptions();
          data = response.data || response;
        }
      } catch (apiErr) {
        console.error("Error fetching prescriptions:", apiErr);
        // Fall back to direct API call
        const response = await fetch(`${API_BASE_URL}/analyst/prescriptions`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (response.ok) {
          data = await response.json();
        }
      }

      // Calculate stats
      const pending = data.filter(p => p.status === "PENDING").length;
      const analyzed = data.filter(p => p.status === "ANALYZED").length;
      const completed = data.filter(p => p.status === "APPROVED").length;

      setStats({
        total: data.length,
        pending,
        analyzed,
        completed
      });

      setPrescriptions(data);
    } catch (err) {
      console.error("Error fetching prescriptions:", err);
      setError(err.message || "Failed to fetch prescriptions");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (prescriptionId) => {
    try {
      const result = await Swal.fire({
        title: "Approve Prescription",
        text: "Are you sure you want to approve this prescription?",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#16A34A",
        cancelButtonColor: "#6B7280",
        confirmButtonText: "Yes, Approve",
        cancelButtonText: "Cancel"
      });

      if (result.isConfirmed) {
        await analystAPI.approvePrescription(prescriptionId);
        Swal.fire({
          icon: "success",
          title: "Approved",
          text: "Prescription has been approved successfully",
          confirmButtonColor: "#16A34A"
        });
        fetchPrescriptions();
      }
    } catch (err) {
      console.error("Error approving prescription:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to approve prescription",
        confirmButtonColor: "#EF4444"
      });
    }
  };

  const handleReject = async (prescriptionId) => {
    const { value: reason } = await Swal.fire({
      title: "Reject Prescription",
      input: "textarea",
      inputLabel: "Rejection Reason",
      inputPlaceholder: "Enter reason for rejection...",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Reject",
      cancelButtonText: "Cancel"
    });

    if (reason) {
      try {
        await analystAPI.rejectPrescription(prescriptionId, { analysisNotes: reason });
        Swal.fire({
          icon: "success",
          title: "Rejected",
          text: "Prescription has been rejected",
          confirmButtonColor: "#16A34A"
        });
        fetchPrescriptions();
      } catch (err) {
        console.error("Error rejecting prescription:", err);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to reject prescription",
          confirmButtonColor: "#EF4444"
        });
      }
    }
  };

  const handleMarkAnalyzed = async (prescriptionId) => {
    try {
      await analystAPI.markAsAnalyzed(prescriptionId);
      Swal.fire({
        icon: "success",
        title: "Marked as Analyzed",
        text: "Prescription has been marked as analyzed",
        confirmButtonColor: "#16A34A"
      });
      fetchPrescriptions();
    } catch (err) {
      console.error("Error marking prescription as analyzed:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to update prescription status",
        confirmButtonColor: "#EF4444"
      });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
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

  return (
    <>
      <Navbar role="analyst" />

      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h1 className="text-3xl sm:text-4xl text-[#1E3A8A] mb-4">Prescription Analysis</h1>
            <p className="text-xl text-gray-600">Review and analyze prescriptions</p>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 mb-2">Total Prescriptions</p>
                  <p className="text-3xl text-[#1E3A8A]">{stats.total}</p>
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
                  <p className="text-gray-600 mb-2">Pending</p>
                  <p className="text-3xl text-[#F59E0B]">{stats.pending}</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-[#F59E0B] to-[#FBBF24] rounded-xl flex items-center justify-center">
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
                  <p className="text-gray-600 mb-2">Analyzed</p>
                  <p className="text-3xl text-[#2563EB]">{stats.analyzed}</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-[#2563EB] to-[#3B82F6] rounded-xl flex items-center justify-center">
                  <Eye className="w-7 h-7 text-white" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 mb-2">Completed</p>
                  <p className="text-3xl text-[#16A34A]">{stats.completed}</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-[#16A34A] to-[#22C55E] rounded-xl flex items-center justify-center">
                  <Check className="w-7 h-7 text-white" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "pending" 
                  ? "bg-[#1E3A8A] text-white" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setActiveTab("analyzed")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "analyzed" 
                  ? "bg-[#2563EB] text-white" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Analyzed
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "completed" 
                  ? "bg-[#16A34A] text-white" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "all" 
                  ? "bg-[#8B5CF6] text-white" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All
            </button>
          </div>

          {/* Prescriptions List */}
          <div className="space-y-4">
            {loading && (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
                <span className="ml-3 text-gray-600">Loading prescriptions...</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                Error: {error}
              </div>
            )}

            {!loading && !error && prescriptions.length === 0 && (
              <div className="text-center py-12">
                <div className="mb-4">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto" />
                </div>
                <p className="text-gray-500 text-lg mb-2">No prescriptions found</p>
                <p className="text-gray-400 text-sm">
                  No prescriptions match the selected filter
                </p>
                <button
                  onClick={() => fetchPrescriptions()}
                  className="mt-4 px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                >
                  Refresh
                </button>
              </div>
            )}

            {!loading && !error && prescriptions.map((prescription, index) => (
              <motion.div
                key={prescription.id}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Prescription Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] rounded-xl flex items-center justify-center">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl text-[#1E3A8A]">
                          {prescription.user?.fullName || "Unknown Patient"}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Prescription ID: #{prescription.id}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span>{prescription.serviceType || "Prescription Analysis"}</span>
                      <span>•</span>
                      <span>Created: {new Date(prescription.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      {getStatusBadge(prescription.status)}
                    </div>
                    {prescription.prescriptionDetails && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {prescription.prescriptionDetails.substring(0, 200)}...
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedPrescription(prescription)}
                      className="px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-blue-600 transition-colors text-sm flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    
                    {prescription.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => handleMarkAnalyzed(prescription.id)}
                          className="px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                        >
                          Mark Analyzed
                        </button>
                        <button
                          onClick={() => handleApprove(prescription.id)}
                          className="px-4 py-2 bg-[#16A34A] text-white rounded-lg hover:bg-[#15803D] transition-colors text-sm flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(prescription.id)}
                          className="px-4 py-2 bg-[#EF4444] text-white rounded-lg hover:bg-red-600 transition-colors text-sm flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      {/* Prescription Detail Modal */}
      <AnimatePresence>
        {selectedPrescription && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedPrescription(null)}
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
                  <h2 className="text-2xl text-[#1E3A8A] font-semibold">
                    Prescription #{selectedPrescription.id}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Patient: {selectedPrescription.user?.fullName || "Unknown"}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPrescription(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[#1E3A8A] mb-2">Prescription Details</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700">
                        {selectedPrescription.prescriptionDetails || "No details provided"}
                      </pre>
                    </div>
                  </div>

                  {selectedPrescription.diagnosis && (
                    <div>
                      <h3 className="text-lg font-semibold text-[#1E3A8A] mb-2">Diagnosis</h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-700">{selectedPrescription.diagnosis}</p>
                      </div>
                    </div>
                  )}

                  {selectedPrescription.recommendations && (
                    <div>
                      <h3 className="text-lg font-semibold text-[#1E3A8A] mb-2">Recommendations</h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-700">{selectedPrescription.recommendations}</p>
                      </div>
                    </div>
                  )}

                  {selectedPrescription.notes && (
                    <div>
                      <h3 className="text-lg font-semibold text-[#1E3A8A] mb-2">Notes</h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-700">{selectedPrescription.notes}</p>
                      </div>
                    </div>
                  )}

                  {selectedPrescription.analysisNotes && (
                    <div>
                      <h3 className="text-lg font-semibold text-[#1E3A8A] mb-2">Analysis Notes</h3>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-700">{selectedPrescription.analysisNotes}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[#1E3A8A] mb-2">Status</h3>
                      {getStatusBadge(selectedPrescription.status)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#1E3A8A] mb-2">Created</h3>
                      <p className="text-gray-700">{new Date(selectedPrescription.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-4 p-6 border-t border-gray-200 bg-white">
                <button
                  onClick={() => setSelectedPrescription(null)}
                  className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  Close
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

