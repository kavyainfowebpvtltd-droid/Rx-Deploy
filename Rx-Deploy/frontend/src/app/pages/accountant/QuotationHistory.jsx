import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  FileText,
  Calendar,
  User,
  Eye,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  IndianRupee,
  RefreshCw,
  Search,
} from "lucide-react";
import { Navbar } from "../../components/Navbar";
import { Footer } from "../../components/Footer";
import { CustomSelect } from "../../components/CustomSelect";
import { TablePagination } from "../../components/TablePagination.jsx";
import { Link } from "react-router";
import { orderAPI, quotationAPI } from "@/services/api.js";
import Swal from "sweetalert2";
import { formatCurrency, resolveOrderCountry } from "./quotationHelpers.js";
import { formatReportId } from "@/app/utils/reportId.js";

const TABLE_PAGE_SIZE = 10;

export default function QuotationsHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchOrders();

    // Refresh data when page becomes visible again (e.g., after navigating back from bill generation)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchOrders();
      }
    };

    // Also refresh when window gains focus
    const handleFocus = () => {
      fetchOrders();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await quotationAPI.getAll();
      setOrders(response.data || []);
    } catch (error) {
      console.error("Error fetching quotations:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load quotations. Please try again.",
        confirmButtonColor: "#2563EB",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter orders based on status and search
  const filteredOrders = orders.filter((order) => {
    if (
      filterStatus === "pending" &&
      order.status !== "DRAFT" &&
      order.status !== "SENT"
    )
      return false;
    if (filterStatus === "approved" && order.status !== "ACCEPTED")
      return false;
    if (filterStatus === "rejected" && order.status !== "REJECTED")
      return false;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const user = order.user || {};
      return (
        (user.fullName && user.fullName.toLowerCase().includes(search)) ||
        (user.email && user.email.toLowerCase().includes(search)) ||
        (order.quotationNumber &&
          order.quotationNumber.toLowerCase().includes(search))
      );
    }
    return true;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(filteredOrders.length / TABLE_PAGE_SIZE),
    );
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, filteredOrders.length]);

  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * TABLE_PAGE_SIZE,
    currentPage * TABLE_PAGE_SIZE,
  );

  // Calculate stats
  const totalQuotations = orders.length;
  const approvedCount = orders.filter((o) => o.status === "ACCEPTED").length;
  const pendingCount = orders.filter(
    (o) => o.status === "DRAFT" || o.status === "SENT",
  ).length;
  const totalRevenue = orders
    .filter((o) => o.status === "ACCEPTED")
    .reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);

  const getStatusBadge = (status) => {
    switch (status) {
      case "ACCEPTED":
        return { class: "bg-green-100 text-green-700", text: "Approved" };
      case "DRAFT":
        return { class: "bg-gray-100 text-gray-700", text: "Draft" };
      case "SENT":
        return { class: "bg-yellow-100 text-yellow-700", text: "Sent" };
      case "REJECTED":
        return { class: "bg-red-100 text-red-700", text: "Rejected" };
      default:
        return { class: "bg-gray-100 text-gray-700", text: status };
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "ACCEPTED":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "REJECTED":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "DRAFT":
        return <FileText className="w-5 h-5 text-gray-600" />;
      case "SENT":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const parseOrderDetails = (orderDetailsStr) => {
    try {
      return JSON.parse(orderDetailsStr);
    } catch {
      return {};
    }
  };

  const getServiceTypeLabel = (order) => {
    const details = parseOrderDetails(order.orderDetails);
    if (details.serviceType === "prescription-analysis")
      return "Prescription Analysis";
    if (details.serviceType === "online-pharmacy") return "Online Pharmacy";
    if (details.serviceType === "second-opinion") return "Second Opinion";
    return "General";
  };

  const getQuotationCountry = (quotation) => {
    const orderData = quotation.order || quotation;
    const details = parseOrderDetails(
      orderData.orderDetails || quotation.orderDetails,
    );
    const user = quotation.user || orderData.user || {};

    return resolveOrderCountry(orderData, details, user);
  };

  const refreshOrders = () => {
    fetchOrders();
  };

  return (
    <>
      <Navbar role="accountant" />

      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl sm:text-4xl text-[#1E3A8A] mb-2">
                  Quotations History
                </h1>
                <p className="text-xl text-gray-600">
                  View all orders and their quotation status
                </p>
              </div>
              <button
                onClick={refreshOrders}
                className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1E40AF] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 mb-2">Total Orders</p>
                  <p className="text-3xl text-[#1E3A8A]">{totalQuotations}</p>
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
                  <p className="text-gray-600 mb-2">Approved</p>
                  <p className="text-3xl text-[#16A34A]">{approvedCount}</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-[#16A34A] to-[#22C55E] rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-white" />
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
                  <p className="text-gray-600 mb-2">Pending</p>
                  <p className="text-3xl text-[#F59E0B]">{pendingCount}</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-[#F59E0B] to-[#FBBF24] rounded-xl flex items-center justify-center">
                  <Clock className="w-7 h-7 text-white" />
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
                  <p className="text-gray-600 mb-2">Total Revenue</p>
                  <p className="text-3xl text-[#8B5CF6]">
                    ₹{totalRevenue.toLocaleString()}
                  </p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-[#8B5CF6] to-[#A78BFA] rounded-xl flex items-center justify-center">
                  <IndianRupee className="w-7 h-7 text-white" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by patient name, email, or order number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                />
              </div>
              <div className="md:w-[220px]">
                <CustomSelect
                  value={filterStatus}
                  onChange={setFilterStatus}
                  buttonClassName="py-2 rounded-lg"
                  menuClassName="rounded-xl"
                  optionClassName="rounded-lg py-2.5"
                  options={[
                    { value: "all", label: "All Status" },
                    { value: "approved", label: "Approved" },
                    { value: "pending", label: "Pending" },
                    { value: "rejected", label: "Rejected" },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Orders Table */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl text-gray-600 mb-2">
                No quotations found
              </h3>
              <p className="text-gray-500">
                {searchTerm || filterStatus !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "Orders will appear here"}
              </p>
            </div>
          ) : (
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
                      <th className="px-6 py-4 text-left">Patient</th>
                      <th className="px-6 py-4 text-left">Service</th>
                      <th className="px-6 py-4 text-left">Amount</th>
                      <th className="px-6 py-4 text-left">Date</th>
                      <th className="px-6 py-4 text-left">Status</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.map((order, index) => {
                      const user = order.user || {};
                      const statusInfo = getStatusBadge(order.status);
                      return (
                        <motion.tr
                          key={order.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="border-b border-gray-200 hover:bg-[#F1F5F9] transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <FileText className="w-5 h-5 text-[#2563EB]" />
                              <span className="text-gray-700 font-medium">
                                {formatReportId(
                                  order.order?.orderNumber ||
                                    order.orderNumber ||
                                    order.orderId ||
                                    order.id,
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] rounded-full flex items-center justify-center text-white">
                                {user.fullName ? user.fullName.charAt(0) : "?"}
                              </div>
                              <div>
                                <p className="text-gray-700 font-medium">
                                  {user.fullName || "Unknown"}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {user.email || "No email"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {getServiceTypeLabel(order)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-gray-700 font-semibold text-lg">
                              <span>
                                {formatCurrency(
                                  order.totalAmount,
                                  getQuotationCountry(order),
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {new Date(order.createdAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(order.status)}
                              <span
                                className={`px-3 py-1 rounded-full text-sm ${statusInfo.class}`}
                              >
                                {statusInfo.text}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <Link
                                to={`/accountant/quotation/${order.order?.id || order.orderId || order.id}`}
                              >
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  className="p-2 text-[#2563EB] hover:bg-blue-50 rounded-lg transition-colors"
                                  title="View Details"
                                >
                                  <Eye className="w-5 h-5" />
                                </motion.button>
                              </Link>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Info */}
              <TablePagination
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                totalItems={filteredOrders.length}
                itemLabel="orders"
                pageSize={TABLE_PAGE_SIZE}
              />
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
