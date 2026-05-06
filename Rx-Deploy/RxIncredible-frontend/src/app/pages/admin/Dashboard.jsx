import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { Users, UserCheck, FileText, Wallet, TrendingUp, Clock, Loader2 } from "lucide-react";
import { Navbar } from "../../components/Navbar.jsx";
import { Footer } from "../../components/Footer.jsx";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { userAPI, orderAPI, prescriptionAPI, quotationAPI } from "@/services/api.js";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeDoctors: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [activeTab, setActiveTab] = useState("prescriptionAnalysis");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [filteredPrescriptions, setFilteredPrescriptions] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [allPrescriptions, setAllPrescriptions] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    
    // Refresh data when window gains focus (e.g., when returning from Doctors page)
    const handleFocus = () => {
      fetchDashboardData();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Handle date filter changes
  useEffect(() => {
    // Debounce the date filter to avoid too many API calls
    const timer = setTimeout(() => {
      fetchDashboardData();
    }, 300);
    return () => clearTimeout(timer);
  }, [dateFrom, dateTo]);

  const fetchDashboardData = async () => {
    try {
      // Fetch all users
      const usersResponse = await userAPI.getAll();
      const users = usersResponse.data;
      
      // Fetch all orders
      const ordersResponse = await orderAPI.getAll();
      const orders = ordersResponse.data;
      setAllOrders(orders);
      
      // Fetch all prescriptions
      const prescriptionsResponse = await prescriptionAPI.getAll();
      const prescriptions = prescriptionsResponse.data;
      setAllPrescriptions(prescriptions);
      
      // Calculate stats
      const doctors = users.filter(u => u.role === "DOCTOR");
      const activeDoctors = doctors.filter(d => d.isActive).length;
      
      // Calculate revenue from paid orders
      const paidOrders = orders.filter(o => o.paymentStatus === "PAID");
      const totalRevenue = paidOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount || 0), 0);
      
      // Count orders by service type
      const getOrderServiceType = (o) => {
        if (o.serviceType) return o.serviceType;
        try {
          const details = JSON.parse(o.orderDetails || '{}');
          if (details.serviceType) {
            if (details.serviceType === 'prescription-analysis') return 'PRESCRIPTION_ANALYSIS';
            if (details.serviceType === 'second-opinion') return 'SECOND_OPINION';
            if (details.serviceType === 'online-pharmacy') return 'ONLINE_PHARMACY';
            return details.serviceType;
          }
          if (details.services) {
            if (details.services.prescriptionAnalysis) return 'PRESCRIPTION_ANALYSIS';
            if (details.services.secondOpinion) return 'SECOND_OPINION';
            if (details.services.onlinePharmacy) return 'ONLINE_PHARMACY';
          }
        } catch (e) {}
        return null;
      };
      
      // Total orders - all orders
      const totalOrders = orders.length;
      
      // Paid Prescription Analysis + Online Pharmacy orders
      const paidServiceOrders = paidOrders.filter(o => {
        const serviceType = getOrderServiceType(o);
        return serviceType === 'PRESCRIPTION_ANALYSIS' || serviceType === 'ONLINE_PHARMACY';
      }).length;
      
      // Second Opinion orders (all, regardless of payment)
      const secondOpinionOrders = orders.filter(o => getOrderServiceType(o) === 'SECOND_OPINION').length;
      
      setStats({
        totalUsers: users.length,
        activeDoctors,
        totalOrders: paidServiceOrders + secondOpinionOrders,
        totalRevenue: totalRevenue,
      });

      // Apply date filter if set
      let filteredOrdersData = orders;
      let filteredPrescriptionsData = prescriptions;
      
      if (dateFrom && dateTo) {
        const fromDate = new Date(dateFrom);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        
        filteredOrdersData = orders.filter(order => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= fromDate && orderDate <= toDate;
        });
        
        filteredPrescriptionsData = prescriptions.filter(prescription => {
          const prescriptionDate = new Date(prescription.createdAt);
          return prescriptionDate >= fromDate && prescriptionDate <= toDate;
        });
      }
      
      setFilteredOrders(filteredOrdersData);
      setFilteredPrescriptions(filteredPrescriptionsData);
      
      // Generate monthly data from filtered orders
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthlyMap = {};
      
      filteredOrdersData.forEach(order => {
        const month = monthNames[new Date(order.createdAt).getMonth()];
        if (!monthlyMap[month]) {
          monthlyMap[month] = { orders: 0, prescriptionAnalysis: 0, onlinePharmacy: 0, secondOpinion: 0 };
        }
        
        // Get service type from order or parse from orderDetails
        const getOrderServiceType = (o) => {
          if (o.serviceType) return o.serviceType;
          try {
            const details = JSON.parse(o.orderDetails || '{}');
            if (details.serviceType) {
              if (details.serviceType === 'prescription-analysis') return 'PRESCRIPTION_ANALYSIS';
              if (details.serviceType === 'second-opinion') return 'SECOND_OPINION';
              if (details.serviceType === 'online-pharmacy') return 'ONLINE_PHARMACY';
              return details.serviceType;
            }
            if (details.services) {
              if (details.services.prescriptionAnalysis) return 'PRESCRIPTION_ANALYSIS';
              if (details.services.secondOpinion) return 'SECOND_OPINION';
              if (details.services.onlinePharmacy) return 'ONLINE_PHARMACY';
            }
          } catch (e) {}
          return null;
        };
        
        const orderServiceType = getOrderServiceType(order);
        
        // All orders go to orders count
        monthlyMap[month].orders++;
        
        // For Prescription Analysis - only count if PAID
        if (orderServiceType === 'PRESCRIPTION_ANALYSIS' && order.paymentStatus === 'PAID') {
          monthlyMap[month].prescriptionAnalysis++;
        }
        
        // For Online Pharmacy - only count if PAID
        if (orderServiceType === 'ONLINE_PHARMACY' && order.paymentStatus === 'PAID') {
          monthlyMap[month].onlinePharmacy++;
        }
        
        // For Second Opinion - count all (regardless of payment)
        if (orderServiceType === 'SECOND_OPINION') {
          monthlyMap[month].secondOpinion++;
        }
      });
      
      // Add prescription data
      filteredPrescriptionsData.forEach(prescription => {
        const month = monthNames[new Date(prescription.createdAt).getMonth()];
        if (!monthlyMap[month]) {
          monthlyMap[month] = { orders: 0, prescriptionAnalysis: 0, onlinePharmacy: 0, secondOpinion: 0 };
        }
      });
      
      // Convert to array
      const monthlyArray = Object.entries(monthlyMap).map(([month, data]) => ({
        month,
        ...data,
      }));
      
      if (monthlyArray.length === 0) {
        // Default data if no orders
        setMonthlyData([
          { month: "Jan", orders: 0, prescriptionAnalysis: 0, onlinePharmacy: 0, secondOpinion: 0 },
          { month: "Feb", orders: 0, prescriptionAnalysis: 0, onlinePharmacy: 0, secondOpinion: 0 },
          { month: "Mar", orders: 0, prescriptionAnalysis: 0, onlinePharmacy: 0, secondOpinion: 0 },
          { month: "Apr", orders: 0, prescriptionAnalysis: 0, onlinePharmacy: 0, secondOpinion: 0 },
          { month: "May", orders: 0, prescriptionAnalysis: 0, onlinePharmacy: 0, secondOpinion: 0 },
          { month: "Jun", orders: 0, prescriptionAnalysis: 0, onlinePharmacy: 0, secondOpinion: 0 },
        ]);
      } else {
        setMonthlyData(monthlyArray);
      }
      
      // Generate recent activities from filtered data
      const recentActivitiesList = [];
      
      // Add recent doctors (approved/pending)
      doctors.slice(0, 2).forEach(doctor => {
        recentActivitiesList.push({
          id: `doctor-${doctor.id}`,
          action: doctor.isActive ? "Doctor approved" : "Doctor pending",
          user: doctor.fullName,
          time: new Date(doctor.createdAt).toLocaleDateString(),
        });
      });
      
      // Add recent users (non-doctors)
      const regularUsers = users.filter(u => u.role !== "DOCTOR");
      regularUsers.slice(0, 2).forEach(user => {
        recentActivitiesList.push({
          id: `user-${user.id}`,
          action: "New user registered",
          user: user.fullName,
          time: new Date(user.createdAt).toLocaleDateString(),
        });
      });
      
      // Add recent orders
      filteredOrdersData.slice(0, 3).forEach(order => {
        recentActivitiesList.push({
          id: `order-${order.id}`,
          action: `Order ${order.status?.toLowerCase().replace('_', ' ') || 'completed'}`,
          user: `Order #${order.orderNumber}`,
          time: new Date(order.createdAt).toLocaleDateString(),
        });
      });
      
      // Add recent prescriptions
      filteredPrescriptionsData.slice(0, 2).forEach(prescription => {
        recentActivitiesList.push({
          id: `prescription-${prescription.id}`,
          action: "Prescription processed",
          user: prescription.patientName || `Prescription #${prescription.id}`,
          time: new Date(prescription.createdAt).toLocaleDateString(),
        });
      });
      
      // Sort by most recent
      recentActivitiesList.sort((a, b) => new Date(b.time) - new Date(a.time));
      setRecentActivities(recentActivitiesList.slice(0, 8));
      
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // Use empty stats on error
      setStats({
        totalUsers: 0,
        activeDoctors: 0,
        totalOrders: 0,
        totalRevenue: 0,
      });
      setMonthlyData([
        { month: "Jan", orders: 0, prescriptionAnalysis: 0, onlinePharmacy: 0, secondOpinion: 0 },
        { month: "Feb", orders: 0, prescriptionAnalysis: 0, onlinePharmacy: 0, secondOpinion: 0 },
        { month: "Mar", orders: 0, prescriptionAnalysis: 0, onlinePharmacy: 0, secondOpinion: 0 },
        { month: "Apr", orders: 0, prescriptionAnalysis: 0, onlinePharmacy: 0, secondOpinion: 0 },
        { month: "May", orders: 0, prescriptionAnalysis: 0, onlinePharmacy: 0, secondOpinion: 0 },
        { month: "Jun", orders: 0, prescriptionAnalysis: 0, onlinePharmacy: 0, secondOpinion: 0 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { icon: Users, label: "Total Users", value: stats.totalUsers.toLocaleString(), color: "from-[#1E3A8A] to-[#2563EB]" },
    { icon: UserCheck, label: "Active Doctors", value: stats.activeDoctors, color: "from-[#16A34A] to-[#22C55E]" },
    { icon: FileText, label: "Paid Orders", value: stats.totalOrders, color: "from-[#F59E0B] to-[#FBBF24]" },
    { icon: Wallet, label: "Total Revenue", value: `₹${stats.totalRevenue.toFixed(2)}`, color: "from-[#8B5CF6] to-[#A78BFA]" },
  ];

  if (loading) {
    return (
      <>
        <Navbar role="admin" />
        <div className="flex-1 flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-[#2563EB] animate-spin" />
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar role="admin" />
      
      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h1 className="text-3xl sm:text-4xl text-[#1E3A8A] mb-4">Admin Dashboard</h1>
            <p className="text-xl text-gray-600">Overview of RxIncredible platform</p>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {statCards.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-14 h-14 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center`}>
                    <stat.icon className="w-7 h-7 text-white" />
                  </div>
                </div>
                <p className="text-gray-600 mb-1">{stat.label}</p>
                <p className="text-3xl text-[#1E3A8A]">{stat.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-8 mb-12">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <h3 className="text-xl text-[#1E3A8A] mb-6">Monthly Orders & Services</h3>

              {/* Date Filter */}
              <div className="flex flex-wrap gap-4 mb-6 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                    fetchDashboardData();
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                >
                  Clear Filter
                </button>
              </div>

              {/* Tabs */}
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setActiveTab("prescriptionAnalysis")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "prescriptionAnalysis" 
                      ? "bg-[#2563EB] text-white" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Prescription Analysis 
                </button>
                <button
                  onClick={() => setActiveTab("onlinePharmacy")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "onlinePharmacy" 
                      ? "bg-[#8B5CF6] text-white" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Online Pharmacy
                </button>
                <button
                  onClick={() => setActiveTab("secondOpinion")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "secondOpinion" 
                      ? "bg-[#16A34A] text-white" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Second Opinion
                </button>
              </div>

              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={monthlyData} barGap={0}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="month" stroke="#64748B" />
                  <YAxis stroke="#64748B" />
                  <Tooltip />
                  {activeTab === "prescriptionAnalysis" && (
                    <Bar dataKey="prescriptionAnalysis" fill="url(#purpleGradient)" radius={[4, 4, 0, 0]} name="Prescription Analysis (Paid)" />
                  )}
                  {activeTab === "onlinePharmacy" && (
                    <Bar dataKey="onlinePharmacy" fill="url(#pharmacyGradient)" radius={[4, 4, 0, 0]} name="Online Pharmacy (Paid)" />
                  )}
                  {activeTab === "secondOpinion" && (
                    <Bar dataKey="secondOpinion" fill="url(#greenGradient)" radius={[4, 4, 0, 0]} name="Second Opinion" />
                  )}
                  <defs>
                    <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#A78BFA" />
                    </linearGradient>
                    <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16A34A" />
                      <stop offset="100%" stopColor="#22C55E" />
                    </linearGradient>
                    <linearGradient id="pharmacyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EC4899" />
                      <stop offset="100%" stopColor="#F472B6" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h3 className="text-xl text-[#1E3A8A] mb-6">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-[#F1F5F9] rounded-xl hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] rounded-full flex items-center justify-center">
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-gray-700">{activity.action}</p>
                        <p className="text-sm text-gray-500">{activity.user}</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">{activity.time}</span>
                  </motion.div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </>
  );
}
