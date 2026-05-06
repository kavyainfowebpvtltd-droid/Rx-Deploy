import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Link, useNavigate } from "react-router";
import { FileText, User, Calendar, ArrowRight, IndianRupee, Search, Filter, AlertCircle } from "lucide-react";
import { Navbar } from "../../components/Navbar.jsx";
import { Footer } from "../../components/Footer.jsx";
import { CustomSelect } from "../../components/CustomSelect";
import { orderAPI } from "@/services/api.js";
import Swal from "sweetalert2";
import { formatCurrency } from "./quotationHelpers.js";

const SEARCH_ALLOWED_CHARACTERS = /^[a-zA-Z0-9\s@._-]*$/;

const sanitizeSearchValue = (value) => value.replace(/[^a-zA-Z0-9\s@._-]/g, "");

export default function AccountantPrescriptions() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, pending, completed
  const [searchTerm, setSearchTerm] = useState("");
  const [searchError, setSearchError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, [navigate]);

  // Refresh orders when navigating back to this page
  useEffect(() => {
    const handleFocus = () => {
      fetchOrders();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await orderAPI.getAllOrders();
      const allOrders = response.data || response || [];
      
      // Filter orders - Only show ONLINE_PHARMACY orders
      const prescriptionOrders = allOrders.filter(order => {
        // Only include ONLINE_PHARMACY service type
        if (order.serviceType === 'ONLINE_PHARMACY') {
          return true;
        }
        // Also check inside orderDetails JSON for online-pharmacy
        try {
          const orderDetails = JSON.parse(order.orderDetails || '{}');
          return orderDetails.serviceType === 'online-pharmacy';
        } catch {
          return false;
        }
      });
      
      setOrders(prescriptionOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
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

  // Filter orders based on status and search term
  // Exclude SENT and COMPLETED orders - they should only appear in Quotation History
  const filteredOrders = orders.filter(order => {
    // Always exclude SENT (bill generated, awaiting payment) and COMPLETED (paid) orders - they go to Quotation History
    // Also exclude ACCEPTED status - once a quotation is accepted, it should only show in Quotation History
    const orderStatus = (order.status || '').toString().toUpperCase().trim();
    const hasGeneratedBill =
      Number(order.totalAmount || 0) > 0 ||
      Boolean(order.billFilePath) ||
      Boolean(order.quotationNumber);

    if (
      orderStatus === 'COMPLETED' ||
      orderStatus === 'SENT' ||
      orderStatus === 'ACCEPTED' ||
      hasGeneratedBill
    ) {
      return false;
    }
    
    // Status filter
    if (filter === "pending" && order.status !== "PENDING") return false;
    if (filter === "processing" && order.status !== "PROCESSING") return false;
    
    // Search filter
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    if (normalizedSearchTerm) {
      const search = normalizedSearchTerm;
      const orderDetails = order.orderDetails ? JSON.parse(order.orderDetails) : {};
      const user = order.user || {};
      return (
        (user.fullName && user.fullName.toLowerCase().includes(search)) ||
        (user.email && user.email.toLowerCase().includes(search)) ||
        (order.orderNumber && order.orderNumber.toLowerCase().includes(search)) ||
        (orderDetails.notes && orderDetails.notes.toLowerCase().includes(search))
      );
    }
    return true;
  });

  // Calculate stats from filtered orders (excluding SENT, COMPLETED, ACCEPTED)
  const pendingCount = filteredOrders.filter(o => o.status === "PENDING").length;
  const processingCount = filteredOrders.filter(o => o.status === "PROCESSING").length;
  const totalRevenue = filteredOrders
    .filter(o => o.paymentStatus === "PAID")
    .reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);

  const getStatusBadge = (status) => {
    switch (status) {
      case "PENDING":
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">Pending</span>;
      case "PROCESSING":
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">Processing</span>;
      case "COMPLETED":
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">Completed</span>;
      case "CANCELLED":
        return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">Cancelled</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">{status}</span>;
    }
  };

  const getServiceTypeLabel = (serviceType) => {
    switch (serviceType) {
      case "ONLINE_PHARMACY":
        return "Online Pharmacy";
      case "PRESCRIPTION_ANALYSIS":
        return "Prescription Analysis";
      case "SECOND_OPINION":
        return "Second Opinion";
      default:
        return serviceType;
    }
  };

  const parseOrderDetails = (orderDetailsStr) => {
    try {
      return JSON.parse(orderDetailsStr);
    } catch {
      return {};
    }
  };

  const handleSearchChange = (event) => {
    const { value } = event.target;
    const sanitizedValue = sanitizeSearchValue(value);

    setSearchTerm(sanitizedValue);
    setSearchError(
      SEARCH_ALLOWED_CHARACTERS.test(value)
        ? ""
        : "Search supports only letters, numbers, spaces, @, dots, underscores, and hyphens.",
    );
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
                <h1 className="text-3xl sm:text-4xl text-[#1E3A8A] mb-2">Quotation</h1>
                <p className="text-xl text-gray-600">View and manage patient quotation orders</p>
              </div>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 mb-2">Pending Orders</p>
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
                  <p className="text-gray-600 mb-2">Processing Orders</p>
                  <p className="text-3xl text-[#16A34A]">{processingCount}</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-[#16A34A] to-[#22C55E] rounded-xl flex items-center justify-center">
                  <IndianRupee className="w-7 h-7 text-white" />
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
                  <p className="text-gray-600 mb-2">Total Revenue</p>
                  <p className="text-3xl text-[#F59E0B]">₹{totalRevenue.toLocaleString()}</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-[#F59E0B] to-[#FBBF24] rounded-xl flex items-center justify-center">
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
                  onChange={handleSearchChange}
                  aria-invalid={Boolean(searchError)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                    searchError
                      ? "border-red-300 focus:ring-red-500"
                      : "border-gray-300 focus:ring-[#2563EB]"
                  }`}
                />
                {searchError && (
                  <p className="mt-2 flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {searchError}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <CustomSelect
                  value={filter}
                  onChange={setFilter}
                  buttonClassName="min-w-[180px] py-2 rounded-lg"
                  menuClassName="rounded-xl"
                  optionClassName="rounded-lg py-2.5"
                  options={[
                    { value: "all", label: "All Pending" },
                    { value: "pending", label: "Pending" },
                    { value: "processing", label: "Processing" },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Orders List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl text-gray-600 mb-2">No quotations found</h3>
              <p className="text-gray-500">
                {searchTerm || filter !== "all" 
                  ? "Try adjusting your search or filter criteria" 
                  : "Patient quotations will appear here after submission"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order, index) => {
                const orderDetails = parseOrderDetails(order.orderDetails);
                const user = order.user || {};
                
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    whileHover={{ x: 10 }}
                    className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Link to={`/accountant/quotation/${order.id}`}>
                      <div className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          {/* Order Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] rounded-xl flex items-center justify-center">
                                <FileText className="w-6 h-6 text-white" />
                              </div>
                              <div>
                                <h3 className="text-xl text-[#1E3A8A]">
                                  {user.fullName || "Unknown Patient"}
                                </h3>
                                <p className="text-sm text-gray-500">
                                  Order: {order.orderNumber} • {getServiceTypeLabel(order.serviceType)}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                <span>{user.email || "No email"}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span>{formatCurrency(order.totalAmount, order.deliveryCountry || order.user?.country || "India")}</span>
                              </div>
                            </div>
                            {orderDetails.files && orderDetails.files.length > 0 && (
                              <div className="mt-2 text-sm text-gray-500">
                                <span className="font-medium">Files:</span> {orderDetails.files.length} document(s) uploaded
                              </div>
                            )}
                          </div>

                          {/* Action */}
                          <div className="flex items-center gap-4">
                            {getStatusBadge(order.status)}
                            <div className="flex items-center text-[#2563EB] group-hover:translate-x-2 transition-transform duration-300">
                              <span className="mr-2">
                                {order.status === "COMPLETED" ? "View Details" : "Preview Bill"}
                              </span>
                              <ArrowRight className="w-5 h-5" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
