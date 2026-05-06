import axios from 'axios';
import Swal from 'sweetalert2';
import { API_BASE_URL } from '../config/api.js';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Send cookies with requests
  withCredentials: true,
});

// Get token from persistent storage first, then current browser session.
export const getToken = () =>
  localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);

export const getStoredUser = () => {
  const storedUser =
    localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser);
  } catch (error) {
    return null;
  }
};

const extractBackendErrorMessages = (data) => {
  const messages = [];

  if (!data) return messages;

  if (typeof data === 'string') {
    messages.push(data);
    return messages;
  }

  if (Array.isArray(data)) {
    data.forEach((item) => {
      if (typeof item === 'string') messages.push(item);
      else if (item?.message) messages.push(item.message);
    });
    return messages;
  }

  if (typeof data === 'object') {
    if (typeof data.message === 'string') messages.push(data.message);
    if (typeof data.error === 'string') messages.push(data.error);
    if (typeof data.details === 'string') messages.push(data.details);

    if (Array.isArray(data.errors)) {
      data.errors.forEach((item) => {
        if (typeof item === 'string') messages.push(item);
        else if (item?.message) messages.push(item.message);
        else if (item?.defaultMessage) messages.push(item.defaultMessage);
      });
    }
  }

  return [...new Set(messages.filter(Boolean))];
};

const showBackendErrorAlert = (error) => {
  if (error?.config?.suppressErrorAlert) return;

  const status = error?.response?.status;
  const backendMessages = extractBackendErrorMessages(error?.response?.data);
  const fallbackMessage = error?.message || 'Something went wrong. Please try again.';
  const details = backendMessages.length > 0 ? backendMessages.join('<br/>') : fallbackMessage;

  Swal.fire({
    icon: 'error',
    title: status ? `Request Failed (${status})` : 'Request Failed',
    html: details,
    confirmButtonColor: '#2563EB',
  });
};

const buildAuthHeaders = (extraHeaders = {}) => {
  const token = getToken();
  return token
    ? { ...extraHeaders, Authorization: `Bearer ${token}` }
    : extraHeaders;
};

const authFetch = (url, options = {}) => {
  const headers = buildAuthHeaders(options.headers || {});
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
};

const getOrNullOn404 = async (url) => {
  try {
    return await api.get(url, { suppressErrorAlert: true });
  } catch (error) {
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

// Set token in localStorage for remembered logins, otherwise sessionStorage.
export const setToken = (token, remember = true) => {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);

  if (token) {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, token);
  }
};

export const setStoredUser = (user, remember = true) => {
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(USER_KEY);

  if (user) {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(USER_KEY, JSON.stringify(user));
  }
};

// Remove token from both persistent and session storage
export const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(USER_KEY);
};

// Request interceptor - add token to Authorization header
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Suppress 401 errors for auth checks (when no token exists)
    if (error.isAuthCheck && error.response?.status === 401) {
      // Silently reject without logging
      return Promise.reject(error);
    }
    
    if (error.response) {
      // Handle 401/403 - but check the actual error message first
      if (error.response.status === 401 || error.response.status === 403) {
        const errorMessage = error.response.data?.message || error.response.data?.error || '';
        const requestUrl = error.config?.url || '';
        
        // Never redirect to login for document upload endpoints
        // These endpoints are permitAll and should work without authentication
        if (requestUrl.includes('/documents/')) {
          // For document endpoints, just reject without clearing auth
          return Promise.reject(error);
        }
        
        // Only clear auth and redirect if it's truly an authentication error
        // Not if it's a business logic error like "User not found"
        const isAuthError = errorMessage.includes('not authenticated') || 
                           errorMessage.includes('Authentication required') ||
                           errorMessage.includes('session') ||
                           errorMessage.includes('expired');
        
        if (isAuthError) {
          // Only redirect if not already on login page
          if (!window.location.pathname.includes('/login')) {
            // All data is in backend database - nothing to clear in browser
            
            // Show notification if it's an API call
            if (error.config && !error.config.url.includes('/auth/login')) {
              console.warn('Authentication error - redirecting to login');
            }
          }
        }
        // For business logic errors (like user not found), just reject the promise
        // without clearing auth or redirecting
      }
    }
    showBackendErrorAlert(error);
    return Promise.reject(error);
  }
);

// User API
export const userAPI = {
  register: (userData, config = {}) => api.post('/users/register', userData, config),
  registerDirect: async (userData) => {
    const response = await api.post('/users/register-direct', userData);
    return response.data;
  },
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  getUserById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  getByEmail: (email) => api.get(`/users/email/${email}`),
  getByRole: (role) => api.get(`/users/role/${role}`),
  getActive: () => api.get('/users/active'),
  getPending: () => api.get('/users/pending'),
  update: (id, userData) => api.put(`/users/${id}`, userData),
  updateStatus: (id, status) => api.put(`/users/${id}/status?status=${status}`),
  deactivate: (id) => api.put(`/users/${id}/status?status=Inactive`),
  activate: (id) => api.put(`/users/${id}/status?status=Active`),
  deactivateUser: (id) => api.put(`/users/${id}/status?status=Inactive`),
  activateUser: (id) => api.put(`/users/${id}/status?status=Active`),
  verifyOtp: (email, otp) => api.post(`/users/verify-otp?email=${email}&otp=${otp}`),
  resendOtp: (email) => api.post(`/users/resend-otp?email=${email}`),
  resendVerification: (email) => api.post(`/users/resend-verification?email=${email}`),
  forgotPassword: (email) => api.post(`/users/forgot-password?email=${email}`),
  verifyForgotPassword: (email, currentOtp) => api.post('/users/verify/forgot-password', { email, currentOtp }),
  resetPassword: (email, currentOtp, newPassword) => api.post('/users/reset-password', { email, currentOtp, newPassword }),
  create: (userData) => api.post('/users/register', userData),
};

// Auth API
export const authAPI = {
  login: (email, password, config = {}) =>
    api.post('/auth/login', { email, password }, config),
  verifyAdminOtp: (email, otp, config = {}) =>
    api.post('/auth/admin/verify-otp', { email, otp }, config),
  resendAdminOtp: (email, config = {}) =>
    api.post('/auth/admin/resend-otp', { email }, config),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => {
    // Check if token exists before making the request
    const token = getToken();
    if (!token) {
      // Return a rejected promise with a custom error that won't be logged
      return Promise.reject({ 
        response: { status: 401 },
        message: 'No token available',
        isAuthCheck: true  // Flag to indicate this is an auth check
      });
    }
    return api.get('/auth/me');
  },
};

// Prescription API
export const prescriptionAPI = {
  create: (prescription) => api.post('/prescriptions', prescription),
  getAll: () => api.get('/prescriptions'),
  getById: (id) => api.get(`/prescriptions/${id}`),
  getByUser: (userId) => api.get(`/prescriptions/user/${userId}`),
  getByDoctor: (doctorId) => api.get(`/prescriptions/doctor/${doctorId}`),
  getByDoctorId: (doctorId) => api.get(`/prescriptions/doctor/${doctorId}`),
  getByStatus: (status) => api.get(`/prescriptions/status/${status}`),
  updateStatus: (id, status) => api.put(`/prescriptions/${id}/status?status=${status}`),
  update: (id, prescription) => api.put(`/prescriptions/${id}`, prescription),
  delete: (id) => api.delete(`/prescriptions/${id}`),
  
  // Prescription PDF
  generatePrescriptionPdf: (prescriptionId) => api.post(`/prescriptions/${prescriptionId}/generate-pdf`),
  getPrescriptionPdfPath: (prescriptionId) => api.get(`/prescriptions/${prescriptionId}/pdf/path`),
  downloadPrescriptionPdf: (prescriptionId) => {
    return authFetch(`${API_BASE_URL}/prescriptions/${prescriptionId}/pdf/download`);
  },
};

// Order API
export const orderAPI = {
  create: (order) => api.post('/orders', order),
  getAll: () => api.get('/orders'),
  getAllOrders: () => api.get('/orders'),
  getAllOrdersWithDetails: () => api.get('/orders/with-details'),
  getById: (id) => api.get(`/orders/${id}`),
  getOrderById: (id) => api.get(`/orders/${id}`),
  getByNumber: (orderNumber) => api.get(`/orders/number/${orderNumber}`),
  getByUser: (userId) => api.get(`/orders/user/${userId}`),
  getByUserId: (userId) => api.get(`/orders/user/${userId}`),
  getUserInquiries: (userId) => api.get(`/orders/user/${userId}/inquiries`),
  getUserOrders: (userId) => api.get(`/orders/user/${userId}/orders`),
  getByDoctor: (doctorId) => api.get(`/orders/doctor/${doctorId}`),
  getByDoctorId: (doctorId) => api.get(`/orders/doctor/${doctorId}`),
  getByStatus: (status) => api.get(`/orders/status/${status}`),
  updateStatus: (id, status) => api.put(`/orders/${id}/status?status=${status}`),
  updateOrderStatus: (id, status) => api.put(`/orders/${id}/status?status=${status}`),
  updateTotalAmount: (id, totalAmount) => api.put(`/orders/${id}/total-amount`, { totalAmount: totalAmount }),
  updateUserEmail: (id, userEmail) => api.put(`/orders/${id}/user-email`, { userEmail: userEmail }),
  assignDoctor: (orderId, doctorId) => api.put(`/orders/${orderId}/assign-doctor?doctorId=${doctorId}`),
  updatePayment: (id, paymentStatus, paymentReference) => 
    api.put(`/orders/${id}/payment?paymentStatus=${paymentStatus}&paymentReference=${paymentReference}`),
  delete: (id) => api.delete(`/orders/${id}`),
  countByStatus: (status) => api.get(`/orders/count/status/${status}`),
  
  // Medical Report
  submitMedicalReport: (orderId, doctorId, reportData) => 
    api.post(`/orders/${orderId}/medical-report?doctorId=${doctorId}`, reportData),
  getMedicalReportPath: (orderId) => api.get(`/orders/${orderId}/medical-report/path`),
  viewMedicalReport: (orderId) => {
    return authFetch(`${API_BASE_URL}/orders/${orderId}/medical-report/view`);
  },
  downloadMedicalReport: (orderId) => {
    return authFetch(`${API_BASE_URL}/orders/${orderId}/medical-report/download`);
  },
  
  // Bill
  generateBill: (orderId) => api.post(`/orders/${orderId}/generate-bill`),
  getBillPath: (orderId) => api.get(`/orders/${orderId}/bill/path`),
  downloadBill: (orderId) => {
    return authFetch(`${API_BASE_URL}/orders/${orderId}/bill/download`);
  },
  viewBill: (orderId) => {
    return authFetch(`${API_BASE_URL}/orders/${orderId}/bill/view`);
  },

  // Payment Receipt
  generateReceipt: (orderId) => api.post(`/orders/${orderId}/generate-receipt`),
  getReceiptPath: (orderId) => api.get(`/orders/${orderId}/receipt/path`),
  downloadReceipt: (orderId) => {
    return authFetch(`${API_BASE_URL}/orders/${orderId}/receipt/download`);
  },
  viewReceipt: (orderId) => {
    return authFetch(`${API_BASE_URL}/orders/${orderId}/receipt/view`);
  },
  
  // Prescription (from doctor generate page)
  getPrescriptionPath: (orderId) => api.get(`/orders/${orderId}/prescription/path`),
  viewPrescription: (orderId) => {
    return authFetch(`${API_BASE_URL}/orders/${orderId}/prescription/view`);
  },
  downloadPrescription: (orderId) => {
    return authFetch(`${API_BASE_URL}/orders/${orderId}/prescription/download`);
  },
  
  // Email
  sendEmail: (orderId, payload = {}) => api.post(`/orders/${orderId}/send-email`, payload),
};

// Quotation API
export const quotationAPI = {
  create: (quotation) => api.post('/quotations', quotation),
  createQuotation: (quotation, userId, createdById, orderId) =>
    api.post(`/quotations?userId=${userId}&createdById=${createdById}${orderId ? `&orderId=${orderId}` : ''}`, quotation),
  getAll: () => api.get('/quotations'),
  getById: (id) => getOrNullOn404(`/quotations/${id}`),
  getQuotationById: (id) => getOrNullOn404(`/quotations/${id}`),
  getByNumber: (quotationNumber) => api.get(`/quotations/number/${quotationNumber}`),
  getByUser: (userId) => api.get(`/quotations/user/${userId}`),
  getByOrderId: (orderId) => getOrNullOn404(`/quotations/order/${orderId}`),
  getQuotationByOrderId: (orderId) => getOrNullOn404(`/quotations/order/${orderId}`),
  getByStatus: (status) => api.get(`/quotations/status/${status}`),
  updateStatus: (id, status) => api.put(`/quotations/${id}/status?status=${status}`),
  update: (id, quotation) => api.put(`/quotations/${id}`, quotation),
  delete: (id) => api.delete(`/quotations/${id}`),
  sendEmail: (id) => api.post(`/quotations/${id}/send-email`),
  downloadPdf: (id) => authFetch(`${API_BASE_URL}/quotations/${id}/download`),
  downloadPdfByOrderId: (orderId) => authFetch(`${API_BASE_URL}/quotations/order/${orderId}/download`),
};

// Payment API
export const paymentAPI = {
  create: (payment) => api.post('/payments', payment),
  getAll: () => api.get('/payments'),
  getById: (id) => api.get(`/payments/${id}`),
  getByPaymentId: (paymentId) => api.get(`/payments/payment-id/${paymentId}`),
  getByUser: (userId) => api.get(`/payments/user/${userId}`),
  getByOrder: (orderId) => api.get(`/payments/order/${orderId}`),
  getByStatus: (status) => api.get(`/payments/status/${status}`),
  getRazorpayKey: () => api.get('/payments/razorpay/key'),
  createRazorpayOrder: (payload) => api.post('/payments/razorpay/create-order', payload),
  verifyRazorpayPayment: (payload) => api.post('/payments/razorpay/verify', payload),
  updateStatus: (id, status, transactionReference) => 
    api.put(`/payments/${id}/status?status=${status}&transactionReference=${transactionReference}`),
  delete: (id) => api.delete(`/payments/${id}`),
};

// Medical Service API
export const serviceAPI = {
  create: (service) => api.post('/services', service),
  getAll: () => api.get('/services'),
  getById: (id) => api.get(`/services/${id}`),
  getActive: () => api.get('/services/active'),
  getByCategory: (category) => api.get(`/services/category/${category}`),
  update: (id, service) => api.put(`/services/${id}`, service),
  deactivate: (id) => api.delete(`/services/${id}/deactivate`),
  activate: (id) => api.delete(`/services/${id}/activate`),
  delete: (id) => api.delete(`/services/${id}`),
};

// Document API
export const documentAPI = {
  getAll: () => api.get('/documents/all'),
  uploadDocumentsBase64: async (files, userId, orderId = null) => {
    const response = await api.post('/documents/upload-base64', {
      files: files,
      userId: userId,
      orderId: orderId
    });
    return response.data;
  },
  getDocumentsByUser: (userId) => api.get(`/documents/user/${userId}`),
  getDocumentsByOrder: (orderId) => api.get(`/documents/order/${orderId}`),
  getDocumentsByUserAndCategory: (userId, category) => api.get(`/documents/user/${userId}/category/${category}`),
  getDocumentById: (id) => api.get(`/documents/${id}`),
  getDocumentWithData: (id) => api.get(`/documents/${id}/data`),
  updateDocumentStatus: (id, status) => api.put(`/documents/${id}/status?status=${status}`),
  deleteDocument: (id) => api.delete(`/documents/${id}`),
  linkDocumentToOrder: (documentId, orderId) => api.put(`/documents/${documentId}/order/${orderId}`),
};

// Alias exports for backward compatibility
export const userService = userAPI;
export const authService = authAPI;
export const orderService = orderAPI;
export const paymentService = paymentAPI;
export const prescriptionService = prescriptionAPI;
export const quotationService = quotationAPI;
export const documentService = documentAPI;
export const medicalService = serviceAPI;

// Analyst API
export const analystAPI = {
  getAllPrescriptions: () => api.get('/analyst/prescriptions'),
  getPrescriptionsByStatus: (status) => api.get(`/analyst/prescriptions/status/${status}`),
  getPendingPrescriptions: () => api.get('/analyst/prescriptions/pending'),
  getCompletedPrescriptions: () => api.get('/analyst/prescriptions/completed'),
  getPrescriptionById: (id) => api.get(`/analyst/prescriptions/${id}`),
  analyzePrescription: (id, analysisData) => api.put(`/analyst/prescriptions/${id}/analyze`, analysisData),
  addRecommendation: (id, recommendation) => api.put(`/analyst/prescriptions/${id}/recommendation`, recommendation),
  getAllAnalysts: () => api.get('/analyst/analysts'),
  getAnalystById: (id) => api.get(`/analyst/analysts/${id}`),
  getAnalystProfile: (analystId) => api.get(`/analyst/profile?analystId=${analystId}`),
  getStatistics: (analystId) => api.get(`/analyst/statistics?analystId=${analystId}`),
  markAsAnalyzed: (id) => api.put(`/analyst/prescriptions/${id}/mark-analyzed`),
  approvePrescription: (id) => api.put(`/analyst/prescriptions/${id}/approve`),
  rejectPrescription: (id, reason) => api.put(`/analyst/prescriptions/${id}/reject`, reason),
  // Get orders assigned to analyst
  getOrdersByAnalyst: (analystId) => api.get(`/orders/analyst/${analystId}`),
};

export const analystService = analystAPI;

export default api;

