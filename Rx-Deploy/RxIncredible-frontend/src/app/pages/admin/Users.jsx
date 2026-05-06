import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  UserPlus,
  Edit,
  Trash2,
  Mail,
  Phone,
  X,
  User,
  Lock,
  MapPin,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import Swal from "sweetalert2";
import { Navbar } from "../../components/Navbar";
import { Footer } from "../../components/Footer";
import { CustomSelect } from "../../components/CustomSelect";
import { userService } from "@/services/api.js";
import {
  getPasswordRequirements,
  validateEmail,
  validatePassword,
} from "../../utils/authValidation.js";

// Create userAPI alias for compatibility
const userAPI = userService;

const INITIAL_ADD_USER_FORM = {
  role: "ANALYST",
  fullName: "",
  email: "",
  phone: "",
  password: "",
  address: "",
  gender: "",
  age: "",
};

const INITIAL_ADD_USER_ERRORS = {
  role: "",
  fullName: "",
  email: "",
  phone: "",
  password: "",
  address: "",
  gender: "",
  age: "",
};

const ALLOWED_GENDERS = ["Male", "Female", "Other", "NotSpecified"];

const sanitizeFullNameInput = (value = "") =>
  value.replace(/[^A-Za-z\s.'-]/g, "").replace(/\s{2,}/g, " ");

const validateFullName = (value) => {
  const trimmedValue = value?.trim() || "";

  if (!trimmedValue) {
    return "Full name is required";
  }

  if (trimmedValue.length < 2) {
    return "Full name must be at least 2 characters";
  }

  if (trimmedValue.length > 80) {
    return "Full name must be at most 80 characters";
  }

  if (!/[A-Za-z]{2,}/.test(trimmedValue)) {
    return "Enter a valid full name";
  }

  if (!/^[A-Za-z]+(?:[A-Za-z\s.'-]*[A-Za-z])?$/.test(trimmedValue)) {
    return "Use only letters, spaces, apostrophes, periods, and hyphens";
  }

  return "";
};

const validateOptionalPhone = (value) => {
  const trimmedValue = value?.trim() || "";

  if (!trimmedValue) {
    return "";
  }

  if (!/^\d+$/.test(trimmedValue)) {
    return "Phone number must contain only digits";
  }

  if (trimmedValue.length !== 10 || /^0+$/.test(trimmedValue)) {
    return "Enter a valid phone number";
  }

  return "";
};

const validateOptionalAddress = (value) => {
  const trimmedValue = value?.trim() || "";

  if (!trimmedValue) {
    return "";
  }

  if (trimmedValue.length < 5) {
    return "Address must be at least 5 characters";
  }

  if (trimmedValue.length > 250) {
    return "Address must be at most 250 characters";
  }

  if (!/[A-Za-z0-9]/.test(trimmedValue)) {
    return "Enter a valid address";
  }

  return "";
};

const validateOptionalAge = (value) => {
  const trimmedValue = String(value ?? "").trim();

  if (!trimmedValue) {
    return "";
  }

  if (!/^\d+$/.test(trimmedValue)) {
    return "Age must be a whole number";
  }

  const age = Number(trimmedValue);

  if (age < 1 || age > 120) {
    return "Age must be between 1 and 120";
  }

  return "";
};

const validateOptionalGender = (value) => {
  if (!value) {
    return "";
  }

  if (!ALLOWED_GENDERS.includes(value)) {
    return "Select a valid gender";
  }

  return "";
};

const buildAddUserErrors = (data) => ({
  role: data.role ? "" : "Role is required",
  fullName: validateFullName(data.fullName),
  email: validateEmail(data.email),
  phone: validateOptionalPhone(data.phone),
  password: validatePassword(data.password),
  address: validateOptionalAddress(data.address),
  gender: validateOptionalGender(data.gender),
  age: validateOptionalAge(data.age),
});

export default function AdminUsers() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    status: "Active",
    address: "",
    gender: "",
    age: "",
  });
  const [formData, setFormData] = useState(INITIAL_ADD_USER_FORM);
  const [formErrors, setFormErrors] = useState(INITIAL_ADD_USER_ERRORS);
  const [isSubmittingAddUser, setIsSubmittingAddUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordRequirements = getPasswordRequirements(formData.password);

  const buildUsersList = (registeredUsers, pendingUsers = []) => {
    const uniqueUsers = new Map();

    registeredUsers.forEach((user) => {
      const emailKey = user.email?.toLowerCase();
      if (!emailKey) return;

      uniqueUsers.set(emailKey, {
        ...user,
        status: user.status || (user.isActive ? "Active" : "Inactive"),
        isPending: false,
      });
    });

    pendingUsers.forEach((pending) => {
      const emailKey = pending.email?.toLowerCase();
      if (!emailKey || uniqueUsers.has(emailKey)) return;

      uniqueUsers.set(emailKey, {
        id: pending.id,
        fullName: pending.fullName,
        email: pending.email,
        phone: pending.phone || "",
        role: pending.role,
        createdAt: pending.createdAt || pending.tokenExpiry,
        isActive: false,
        status: "Pending",
        isPending: true,
      });
    });

    return Array.from(uniqueUsers.values());
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const shouldLockScroll = showAddUserModal || showEditModal;

    if (!shouldLockScroll) {
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
  }, [showAddUserModal, showEditModal]);

  const fetchUsers = async () => {
    try {
      const response = await userAPI.getAll();
      // Handle both axios response (response.data) and direct data
      const usersData = response.data || response;
      const baseUsers = Array.isArray(usersData) ? usersData : [];

      // Also fetch pending users
      try {
        const pendingResponse = await userAPI.getPending();
        const pendingUsersData = pendingResponse.data || pendingResponse;
        if (Array.isArray(pendingUsersData) && pendingUsersData.length > 0) {
          setUsers(buildUsersList(baseUsers, pendingUsersData));
        } else {
          setUsers(buildUsersList(baseUsers));
        }
      } catch (pendingError) {
        console.log(
          "No pending users or error fetching pending users:",
          pendingError,
        );
        setUsers(buildUsersList(baseUsers));
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load users",
        confirmButtonColor: "#2563EB",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    // Only allow alphabets in search - filter out numbers and special characters
    const searchTermAlphabetsOnly = searchTerm.replace(/[^a-zA-Z]/g, "");
    if (searchTerm && searchTermAlphabetsOnly.length !== searchTerm.length) {
      return false;
    }
    const nameMatch =
      user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || "";
    const emailMatch =
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) || "";
    const roleMatch = roleFilter === "ALL" || user.role === roleFilter;
    const searchMatch = !searchTerm || nameMatch || emailMatch;
    return roleMatch && searchMatch;
  });

  // Validate name: only letters, spaces, apostrophes, hyphens, and periods allowed
  const validateName = (name) => {
    return sanitizeFullNameInput(name);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    let validatedValue = value;

    if (name === "fullName") {
      validatedValue = sanitizeFullNameInput(value);
    }

    if (name === "age") {
      validatedValue = value.replace(/\D/g, "").slice(0, 3);
    }

    if (name === "phone") {
      validatedValue = value.replace(/\D/g, "").slice(0, 10);
    }

    setFormData((prev) => {
      const nextData = {
        ...prev,
        [name]: validatedValue,
      };

      setFormErrors((prevErrors) => ({
        ...prevErrors,
        [name]: buildAddUserErrors(nextData)[name],
      }));

      return nextData;
    });
  };

  const handleAddUserFieldBlur = (e) => {
    const { name } = e.target;

    setFormErrors((prev) => ({
      ...prev,
      [name]: buildAddUserErrors(formData)[name],
    }));
  };

  const resetAddUserForm = () => {
    setFormData(INITIAL_ADD_USER_FORM);
    setFormErrors(INITIAL_ADD_USER_ERRORS);
    setShowPassword(false);
    setIsSubmittingAddUser(false);
  };

  const handleToggleUserStatus = async (user) => {
    if (user.isPending) {
      Swal.fire({
        title: "Pending User",
        text: "Pending users must verify their email before they can be activated or deactivated.",
        icon: "info",
        confirmButtonColor: "#2563EB",
      });
      return;
    }

    const nextIsActive = !user.isActive;
    const nextStatus = nextIsActive ? "Active" : "Inactive";

    try {
      await userAPI.updateStatus(user.id, nextStatus);
      setUsers(
        users.map((currentUser) =>
          currentUser.id === user.id
            ? { ...currentUser, isActive: nextIsActive, status: nextStatus }
            : currentUser,
        ),
      );
      Swal.fire({
        title: nextIsActive ? "Activated!" : "Deactivated!",
        text: `User has been ${nextIsActive ? "activated" : "deactivated"} successfully.`,
        icon: "success",
        confirmButtonColor: "#2563EB",
      });
    } catch (error) {
      console.error("Error updating user status:", error);
      Swal.fire({
        title: "Error",
        text:
          error.response?.data?.message ||
          "Failed to update user status. Please try again.",
        icon: "error",
        confirmButtonColor: "#2563EB",
      });
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditFormData({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      status: user.status || (user.isActive ? "Active" : "Inactive"),
      address: user.address || "",
      gender: user.gender || "",
      age: user.age || "",
    });
    setShowEditModal(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Apply name validation for fullName field
    const validatedValue = name === "fullName" ? validateName(value) : value;

    setEditFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : validatedValue,
    }));
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await userAPI.update(selectedUser.id, editFormData);
      setUsers(
        users.map((user) =>
          user.id === selectedUser.id
            ? {
                ...user,
                ...editFormData,
                isActive: editFormData.status === "Active",
              }
            : user,
        ),
      );
      setShowEditModal(false);
      Swal.fire({
        icon: "success",
        title: "User Updated!",
        text: "User details have been updated successfully.",
        confirmButtonColor: "#2563EB",
      });
    } catch (error) {
      console.error("Error updating user:", error);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text:
          error.response?.data?.message ||
          "Failed to update user. Please try again.",
        confirmButtonColor: "#2563EB",
      });
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();

    const nextErrors = buildAddUserErrors(formData);
    setFormErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    setIsSubmittingAddUser(true);

    try {
      const normalizedRole = (formData.role || "DOCTOR").toUpperCase();
      const normalizedFormData = {
        ...formData,
        role: normalizedRole,
        fullName: formData.fullName.trim().replace(/\s{2,}/g, " "),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || null,
        password: formData.password,
        address: formData.address.trim() || null,
        gender: formData.gender || null,
        age: formData.age ? Number(formData.age) : null,
      };
      const response = await userAPI.registerDirect(normalizedFormData);
      const result = response.data || response;
      const roleLabels = {
        DOCTOR: "Doctor",
        ANALYST: "Analyst",
        ACCOUNTANT: "Accountant",
        USER: "Patient",
        ADMIN: "Admin",
      };
      const roleName = roleLabels[normalizedRole] || normalizedRole;

      // Check if user requires email verification
      if (result.requiresVerification) {
        const roleGuidance = {
          DOCTOR:
            "The user must verify their email after login, then complete the doctor profile.",
          ANALYST:
            "The user must verify their email after login, then complete the analyst profile.",
          ACCOUNTANT: "The user must verify their email after login.",
          USER: "The user must verify their email after login, then complete the profile.",
        };

        Swal.fire({
          icon: "success",
          title: `${roleName} Added!`,
          html: `
            <p>${roleName} has been added successfully!</p>
            <p class="mt-2 text-sm text-gray-600">${roleGuidance[normalizedRole] || "User can login and verify email on first login."}</p>
          `,
          confirmButtonColor: "#16A34A",
        });
      } else {
        Swal.fire({
          icon: "success",
          title: `${roleName} Added!`,
          text: `${normalizedFormData.fullName} has been added successfully as ${roleName}.`,
          confirmButtonColor: "#16A34A",
        });
      }

      await fetchUsers();

      setShowAddUserModal(false);
      resetAddUserForm();
    } catch (error) {
      console.error("Error adding user:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error.response?.data?.message ||
          "Failed to add user. Please try again.",
        confirmButtonColor: "#2563EB",
      });
    } finally {
      setIsSubmittingAddUser(false);
    }
  };

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
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-12"
          >
            <div>
              <h1 className="text-3xl sm:text-4xl text-[#1E3A8A] mb-2">Manage Users</h1>
              <p className="text-xl text-gray-600">View all registered users</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white rounded-xl hover:shadow-lg transition-all duration-200"
              onClick={() => setShowAddUserModal(true)}
            >
              <UserPlus className="w-5 h-5" />
              Add New User
            </motion.button>
          </motion.div>

          {/* Search And Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px] gap-4"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name or email (alphabets only)..."
                value={searchTerm}
                onChange={(e) => {
                  // Only allow alphabets and spaces
                  const value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                  setSearchTerm(value);
                }}
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent shadow-sm"
              />
            </div>
            <CustomSelect
              value={roleFilter}
              onChange={setRoleFilter}
              buttonClassName="py-4"
              options={[
                { value: "ALL", label: "All Roles" },
                { value: "ADMIN", label: "Admin" },
                { value: "DOCTOR", label: "Doctor" },
                { value: "ACCOUNTANT", label: "Accountant" },
                { value: "ANALYST", label: "Analyst" },
                { value: "USER", label: "User" },
              ]}
            />
          </motion.div>

          {/* Users Table */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white">
                  <tr>
                    <th className="px-6 py-4 text-left">Name</th>
                    <th className="px-6 py-4 text-left">Contact</th>
                    <th className="px-6 py-4 text-left">Role</th>
                    <th className="px-6 py-4 text-left">Joined</th>
                    <th className="px-6 py-4 text-left">Status</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => (
                    <motion.tr
                      key={
                        user.isPending
                          ? `pending-${user.id}`
                          : `user-${user.id}`
                      }
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
                      className="border-b border-gray-200 hover:bg-[#F1F5F9] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] rounded-full flex items-center justify-center text-white">
                            {user.fullName?.charAt(0)}
                          </div>
                          <span className="text-gray-700">{user.fullName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4" />
                            {user.email}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4" />
                            {user.phone}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{user.role}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const displayStatus = user.isPending
                            ? "Pending"
                            : user.status ||
                              (user.isActive ? "Active" : "Inactive");

                          const statusClassName =
                            displayStatus === "Pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : displayStatus === "Active"
                                ? "bg-green-100 text-green-700"
                                : displayStatus === "Disabled"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-700";

                          return (
                            <span
                              className={`px-3 py-1 rounded-full text-sm ${statusClassName}`}
                            >
                              {displayStatus}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleEditUser(user)}
                            className="p-2 text-[#2563EB] hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              Swal.fire({
                                title: "Are you sure?",
                                text: `You want to ${user.isActive ? "deactivate" : "activate"} user "${user.fullName}".`,
                                icon: "warning",
                                showCancelButton: true,
                                confirmButtonColor: "#EF4444",
                                cancelButtonColor: "#6B7280",
                                confirmButtonText: "Yes, do it!",
                                cancelButtonText: "Cancel",
                              }).then((result) => {
                                if (result.isConfirmed) {
                                  handleToggleUserStatus(user);
                                }
                              });
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#F1F5F9]">
              <p className="text-sm text-gray-600">
                Showing {filteredUsers.length} of {users.length} users
              </p>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddUserModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-hidden"
            onClick={() => {
              setShowAddUserModal(false);
              resetAddUserForm();
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl text-[#1E3A8A]">Add New User</h2>
                <button
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => {
                    setShowAddUserModal(false);
                    resetAddUserForm();
                  }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-sm mb-2 text-gray-700">
                    Role *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <CustomSelect
                      value={formData.role}
                      onChange={(value) =>
                        handleInputChange({
                          target: { name: "role", value },
                        })
                      }
                      buttonClassName={`pl-11 py-3 ${
                        formErrors.role ? "border-red-500" : "border-gray-300"
                      }`}
                      options={[
                        { value: "ANALYST", label: "Analyst" },
                        { value: "ACCOUNTANT", label: "Accountant" },
                        { value: "ADMIN", label: "Admin" },
                      ]}
                    />
                  </div>
                  {formErrors.role && (
                    <p className="mt-1 text-sm text-red-500">
                      {formErrors.role}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm mb-2 text-gray-700">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      onBlur={handleAddUserFieldBlur}
                      required
                      placeholder="Enter full name"
                      autoComplete="name"
                      className={`w-full pl-11 pr-4 py-3 bg-white border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent shadow-sm ${
                        formErrors.fullName
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                  </div>
                  {formErrors.fullName && (
                    <p className="mt-1 text-sm text-red-500">
                      {formErrors.fullName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm mb-2 text-gray-700">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      onBlur={handleAddUserFieldBlur}
                      required
                      placeholder="email@example.com"
                      autoComplete="email"
                      className={`w-full pl-11 pr-4 py-3 bg-white border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent shadow-sm ${
                        formErrors.email ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                  </div>
                  {formErrors.email && (
                    <p className="mt-1 text-sm text-red-500">
                      {formErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm mb-2 text-gray-700">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      onBlur={handleAddUserFieldBlur}
                      autoComplete="tel"
                      inputMode="numeric"
                      placeholder="Enter 10-digit phone number"
                      className={`w-full pl-11 pr-4 py-3 bg-white border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent shadow-sm ${
                        formErrors.phone ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                  </div>
                  {formErrors.phone && (
                    <p className="mt-1 text-sm text-red-500">
                      {formErrors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm mb-2 text-gray-700">
                    Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      onBlur={handleAddUserFieldBlur}
                      autoComplete="street-address"
                      placeholder="City, State"
                      className={`w-full pl-11 pr-4 py-3 bg-white border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent shadow-sm ${
                        formErrors.address
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                  </div>
                  {formErrors.address && (
                    <p className="mt-1 text-sm text-red-500">
                      {formErrors.address}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2 text-gray-700">
                      Gender
                    </label>
                    <CustomSelect
                      value={formData.gender}
                      onChange={(value) =>
                        handleInputChange({
                          target: { name: "gender", value },
                        })
                      }
                      buttonClassName={`py-3 ${
                        formErrors.gender ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="Select Gender"
                      options={[
                        { value: "", label: "Select Gender" },
                        { value: "Male", label: "Male" },
                        { value: "Female", label: "Female" },
                        { value: "Other", label: "Other" },
                        { value: "NotSpecified", label: "Prefer not to say" },
                      ]}
                    />
                    {formErrors.gender && (
                      <p className="mt-1 text-sm text-red-500">
                        {formErrors.gender}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-gray-700">
                      Age
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      onBlur={handleAddUserFieldBlur}
                      maxLength={3}
                      placeholder="Enter age"
                      className={`w-full px-4 py-3 bg-white border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent shadow-sm ${
                        formErrors.age ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {formErrors.age && (
                      <p className="mt-1 text-sm text-red-500">
                        {formErrors.age}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-2 text-gray-700">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      onBlur={handleAddUserFieldBlur}
                      required
                      placeholder="Enter password"
                      autoComplete="new-password"
                      className={`w-full pl-11 pr-12 py-3 bg-white border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent shadow-sm ${
                        formErrors.password
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <Eye className="w-5 h-5" />
                      ) : (
                        <EyeOff className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {formErrors.password && (
                    <p className="mt-1 text-sm text-red-500">
                      {formErrors.password}
                    </p>
                  )}
                  {formData.password && (
                    <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <p className="text-sm text-gray-700 mb-2">
                        Password must include:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
                        {passwordRequirements.map((requirement) => (
                          <p
                            key={requirement.key}
                            className={
                              requirement.met
                                ? "text-green-600"
                                : "text-gray-500"
                            }
                          >
                            {requirement.met ? "OK" : "•"} {requirement.label}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-6">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
                    onClick={() => {
                      setShowAddUserModal(false);
                      resetAddUserForm();
                    }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isSubmittingAddUser}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white rounded-xl hover:shadow-lg transition-all"
                  >
                    {isSubmittingAddUser ? "Adding..." : "Add User"}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-hidden"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl text-[#1E3A8A]">Edit User</h2>
                <button
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => setShowEditModal(false)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="block text-sm mb-2 text-gray-700">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="fullName"
                      value={editFormData.fullName}
                      onChange={handleEditInputChange}
                      required
                      pattern="^[a-zA-Z\s.-]+$"
                      title="Only letters, spaces, hyphens, and periods are allowed"
                      className="w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-2 text-gray-700">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={editFormData.email}
                      onChange={handleEditInputChange}
                      required
                      className="w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-2 text-gray-700">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      name="phone"
                      maxLength={10}
                      value={editFormData.phone}
                      onChange={handleEditInputChange}
                      required
                      className="w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-2 text-gray-700">
                    Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="address"
                      value={editFormData.address}
                      onChange={handleEditInputChange}
                      className="w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2 text-gray-700">
                      Gender
                    </label>
                    <CustomSelect
                      value={editFormData.gender}
                      onChange={(value) =>
                        handleEditInputChange({
                          target: { name: "gender", value },
                        })
                      }
                      buttonClassName="py-3"
                      placeholder="Select Gender"
                      options={[
                        { value: "", label: "Select Gender" },
                        { value: "Male", label: "Male" },
                        { value: "Female", label: "Female" },
                        { value: "Other", label: "Other" },
                        { value: "NotSpecified", label: "Prefer not to say" },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-gray-700">
                      Age
                    </label>
                    <input
                      type="number"
                      name="age"
                      value={editFormData.age}
                      onChange={handleEditInputChange}
                      min="0"
                      max="150"
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-2 text-gray-700">
                    Status *
                  </label>
                  <CustomSelect
                    value={editFormData.status}
                    onChange={(value) =>
                      handleEditInputChange({
                        target: { name: "status", value },
                      })
                    }
                    buttonClassName="py-3"
                    options={[
                      { value: "Active", label: "Active" },
                      { value: "Inactive", label: "Inactive" },
                      { value: "Disabled", label: "Disabled" },
                    ]}
                  />
                </div>

                <div className="flex gap-3 pt-6">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white rounded-xl hover:shadow-lg transition-all"
                  >
                    Update User
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
