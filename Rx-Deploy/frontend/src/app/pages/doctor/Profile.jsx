import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Award,
  FileText,
  Save,
  Loader2,
  ArrowLeft,
  Upload,
  X,
  File,
  Eye,
} from "lucide-react";
import Swal from "sweetalert2";
import { Navbar } from "../../components/Navbar.jsx";
import { Footer } from "../../components/Footer.jsx";
import { CustomSelect } from "../../components/CustomSelect.jsx";
import { authAPI, userAPI } from "@/services/api.js";
import { buildApiUrl, buildBackendFileUrl } from "@/config/api.js";
import {
  DOCTOR_SPECIALIZATION_OPTIONS,
  GENDER_OPTIONS,
} from "@/app/constants/selectOptions.js";
import {
  parseStoredPhoneNumber,
  sanitizePhoneInput,
  validatePhoneNumber,
} from "@/app/utils/phoneValidation.js";

const NAME_PATTERN = /^[a-zA-Z]+(?:[a-zA-Z\s.'-]*[a-zA-Z])?$/;
const ADDRESS_PATTERN = /^[a-zA-Z0-9\s,./#-]+$/;
const QUALIFICATION_PATTERN = /^[a-zA-Z0-9\s,./()&-]+$/;
const LICENSE_PATTERN = /^[a-zA-Z0-9/-]+$/;

const sanitizeByPattern = (value, pattern) =>
  [...(value || "")]
    .filter((char) => pattern.test(char))
    .join("");

const formatDateForInput = (value) => {
  if (!value) return "";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "";

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const calculateAgeFromDateOfBirth = (dateOfBirth) => {
  if (!dateOfBirth) return "";

  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return "";

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age >= 0 ? String(age) : "";
};

const getDateYearsAgo = (yearsAgo) => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - yearsAgo);
  return formatDateForInput(date);
};

const getProfilePictureUrl = (value, doctorId) => {
  if (!value) return "";
  if (value.includes(",")) return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/uploads/")) {
    return doctorId ? buildApiUrl(`/users/${doctorId}/profile-picture`) : buildBackendFileUrl(value);
  }
  return `data:image/jpeg;base64,${value}`;
};

const getFieldError = (fieldName, values) => {
  const value = `${values[fieldName] ?? ""}`.trim();

  switch (fieldName) {
    case "fullName":
      if (!value) return "Full name is required";
      if (value.length < 2 || value.length > 80) {
        return "Full name must be between 2 and 80 characters";
      }
      if (!NAME_PATTERN.test(value)) {
        return "Use letters, spaces, apostrophes, hyphens, and periods only";
      }
      return "";

    case "phone":
      return validatePhoneNumber(values.phone, "IN");

    case "address":
      if (!value) return "Address is required";
      if (value.length < 5 || value.length > 200) {
        return "Address must be between 5 and 200 characters";
      }
      if (!ADDRESS_PATTERN.test(value)) {
        return "Address can use letters, numbers, spaces, comma, period, slash, hyphen, and #";
      }
      return "";

    case "age": {
      if (!value) return "Age is required";
      const age = Number.parseInt(value, 10);
      if (!Number.isInteger(age)) return "Enter a valid age";
      if (age < 21 || age > 100) return "Age must be between 21 and 100";
      return "";
    }

    case "dateOfBirth": {
      if (!value) return "";
      const age = Number.parseInt(calculateAgeFromDateOfBirth(value), 10);
      if (!Number.isInteger(age)) return "Select a valid date of birth";
      if (age < 21 || age > 100) {
        return "Date of birth must result in an age between 21 and 100";
      }
      return "";
    }

    case "gender":
      if (!value) return "Gender is required";
      if (!["MALE", "FEMALE", "OTHER"].includes(value)) {
        return "Select a valid gender";
      }
      return "";

    case "specialization":
      if (!value) return "Specialization is required";
      return "";

    case "qualifications":
      if (!value) return "Qualifications are required";
      if (value.length < 2 || value.length > 100) {
        return "Qualifications must be between 2 and 100 characters";
      }
      if (!QUALIFICATION_PATTERN.test(value)) {
        return "Qualifications can use letters, numbers, spaces, comma, period, slash, parentheses, and hyphen";
      }
      return "";

    case "licenseNumber":
      if (!value) return "Registration or license number is required";
      if (value.length < 5 || value.length > 30) {
        return "Registration or license number must be between 5 and 30 characters";
      }
      if (!LICENSE_PATTERN.test(value)) {
        return "Use letters, numbers, slash, and hyphen only";
      }
      return "";

    case "experienceYears": {
      if (!value) return "Years of experience is required";
      const years = Number.parseInt(value, 10);
      const age = Number.parseInt(values.age, 10);
      if (!Number.isInteger(years)) return "Enter valid years of experience";
      if (years < 0 || years > 60) {
        return "Years of experience must be between 0 and 60";
      }
      if (Number.isInteger(age) && years > age - 21) {
        return "Years of experience must be realistic for the selected age";
      }
      return "";
    }

    default:
      return "";
  }
};

const validateProfileForm = (values) => {
  const fields = [
    "fullName",
    "phone",
    "address",
    "dateOfBirth",
    "age",
    "gender",
    "specialization",
    "qualifications",
    "licenseNumber",
    "experienceYears",
  ];

  return fields.reduce((acc, field) => {
    const error = getFieldError(field, values);
    if (error) acc[field] = error;
    return acc;
  }, {});
};

export default function DoctorProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    dateOfBirth: "",
    age: "",
    gender: "",
    specialization: "",
    qualifications: "",
    licenseNumber: "",
    experienceYears: "",
  });
  const [doctorId, setDoctorId] = useState(null);
  const [profilePicture, setProfilePicture] = useState({
    value: null,
    fileName: "",
    preview: "",
    original: null,
  });

  // Document state - tracks both new uploads and existing file paths
  const [documents, setDocuments] = useState({
    aadharCard: null,           // Only set when NEW file is uploaded (base64)
    aadharCardFileName: "",
    aadharCardPreview: "",
    aadharCardOriginal: null,   // Stores original file path from backend (DO NOT send to backend)
    panCard: null,
    panCardFileName: "",
    panCardPreview: "",
    panCardOriginal: null,
    medicalCouncilRegistration: null,
    medicalCouncilRegistrationFileName: "",
    medicalCouncilRegistrationPreview: "",
    medicalCouncilRegistrationOriginal: null,
    ugCertificate: null,
    ugCertificateFileName: "",
    ugCertificatePreview: "",
    ugCertificateOriginal: null,
    pgCertificate: null,
    pgCertificateFileName: "",
    pgCertificatePreview: "",
    pgCertificateOriginal: null,
  });

  // Get doctor info from backend API on mount (no localStorage/sessionStorage)
  useEffect(() => {
    const fetchDoctorInfo = async () => {
      try {
        // Fetch fresh user data from backend database
        const response = await authAPI.getCurrentUser();
        const doctorInfo = response.data || response;
        
        if (doctorInfo) {
          setDoctorId(doctorInfo.id || null);
          const parsedPhone = parseStoredPhoneNumber(doctorInfo.phone || "");

          setFormData({
            fullName: doctorInfo.fullName || doctorInfo.name || "",
            email: doctorInfo.email || "",
            phone: parsedPhone.localNumber || "",
            address: doctorInfo.address || "",
            dateOfBirth: formatDateForInput(doctorInfo.dateOfBirth),
            age: doctorInfo.age || "",
            gender: doctorInfo.gender || "",
            specialization: doctorInfo.specialization || "",
            qualifications:
              doctorInfo.qualifications || doctorInfo.qualification || "",
            licenseNumber:
              doctorInfo.licenseNumber ||
              doctorInfo.registrationNumber ||
              doctorInfo.regNumber ||
              "",
            experienceYears: doctorInfo.experienceYears || "",
          });

          // Set existing document info from backend
          // Helper function to get document preview URL
          // Handles both file paths (/uploads/...) and base64 content
          const getDocumentPreview = (docData, docFileName) => {
            if (!docData) return "";
            // If it's already a data URL (contains comma), use as-is
            if (docData.includes(",")) {
              return docData;
            }
            // If it's a file path, construct the API URL
            if (docData.startsWith("/uploads/") || docData.startsWith("http")) {
              return buildBackendFileUrl(docData);
            }
            // Otherwise treat as base64 content
            const ext = docFileName?.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg";
            return `data:${ext};base64,${docData}`;
          };

          setDocuments({
            aadharCard: null,  // Don't store existing file path - it's in Original
            aadharCardFileName: doctorInfo.aadharCardFileName || "",
            aadharCardPreview: getDocumentPreview(doctorInfo.aadharCard, doctorInfo.aadharCardFileName),
            aadharCardOriginal: doctorInfo.aadharCard || null,  // Store original path for display only
            panCard: null,
            panCardFileName: doctorInfo.panCardFileName || "",
            panCardPreview: getDocumentPreview(doctorInfo.panCard, doctorInfo.panCardFileName),
            panCardOriginal: doctorInfo.panCard || null,
            medicalCouncilRegistration: null,
            medicalCouncilRegistrationFileName:
              doctorInfo.medicalCouncilRegistrationFileName || "",
            medicalCouncilRegistrationPreview: getDocumentPreview(
              doctorInfo.medicalCouncilRegistration,
              doctorInfo.medicalCouncilRegistrationFileName,
            ),
            medicalCouncilRegistrationOriginal:
              doctorInfo.medicalCouncilRegistration || null,
            ugCertificate: null,
            ugCertificateFileName: doctorInfo.ugCertificateFileName || "",
            ugCertificatePreview: getDocumentPreview(
              doctorInfo.ugCertificate,
              doctorInfo.ugCertificateFileName,
            ),
            ugCertificateOriginal: doctorInfo.ugCertificate || null,
            pgCertificate: null,
            pgCertificateFileName: doctorInfo.pgCertificateFileName || "",
            pgCertificatePreview: getDocumentPreview(
              doctorInfo.pgCertificate,
              doctorInfo.pgCertificateFileName,
            ),
            pgCertificateOriginal: doctorInfo.pgCertificate || null,
          });

          const existingProfilePicture =
            doctorInfo.profilePicture || doctorInfo.avatar || "";
          setProfilePicture({
            value: null,
            fileName: doctorInfo.profilePictureFileName || "",
            preview: getProfilePictureUrl(existingProfilePicture, doctorInfo.id),
            original: existingProfilePicture || null,
          });
        }
      } catch (error) {
        console.error("Error fetching doctor info from backend:", error);
        // Redirect to login if not authenticated
        if (error.response?.status === 401) {
          window.location.href = "/login";
        }
      }
    };

    fetchDoctorInfo();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;

    if (name === "fullName") {
      nextValue = sanitizeByPattern(value, /[a-zA-Z\s.'-]/).replace(/\s{2,}/g, " ");
    } else if (name === "phone") {
      nextValue = sanitizePhoneInput(value, "IN");
    } else if (name === "address") {
      nextValue = sanitizeByPattern(value, /[a-zA-Z0-9\s,./#-]/).replace(/\s{2,}/g, " ");
    } else if (name === "dateOfBirth") {
      nextValue = value;
    } else if (name === "age") {
      nextValue = value.replace(/\D/g, "").slice(0, 3);
    } else if (name === "qualifications") {
      nextValue = sanitizeByPattern(value, /[a-zA-Z0-9\s,./()&-]/).replace(/\s{2,}/g, " ");
    } else if (name === "licenseNumber") {
      nextValue = sanitizeByPattern(value.toUpperCase(), /[a-zA-Z0-9/-]/);
    } else if (name === "experienceYears") {
      nextValue = value.replace(/\D/g, "").slice(0, 2);
    }

    const nextFormData = {
      ...formData,
      [name]: nextValue,
    };

    if (name === "dateOfBirth") {
      nextFormData.age = calculateAgeFromDateOfBirth(nextValue);
    }

    setFormData(nextFormData);
    setErrors((prev) => ({
      ...prev,
      [name]: getFieldError(name, nextFormData),
      ...(name === "dateOfBirth" ? { age: getFieldError("age", nextFormData) } : {}),
    }));
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setErrors((prev) => ({
      ...prev,
      [name]: getFieldError(name, formData),
    }));
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      Swal.fire({
        icon: "error",
        title: "Invalid File Type",
        text: "Only JPG and PNG images are allowed for profile picture.",
        confirmButtonColor: "#2563EB",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        icon: "error",
        title: "File Too Large",
        text: "Maximum file size is 5MB",
        confirmButtonColor: "#2563EB",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProfilePicture({
        value: reader.result,
        fileName: file.name,
        preview: reader.result,
        original: null,
      });
    };
    reader.readAsDataURL(file);
  };

  const removeProfilePicture = () => {
    setProfilePicture({
      value: null,
      fileName: "",
      preview: "",
      original: null,
    });
  };

  // Handle file input change
  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        icon: "error",
        title: "File Too Large",
        text: "Maximum file size is 5MB",
        confirmButtonColor: "#2563EB",
      });
      return;
    }

    // Check file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      Swal.fire({
        icon: "error",
        title: "Invalid File Type",
        text: "Only JPG, PNG and PDF files are allowed",
        confirmButtonColor: "#2563EB",
      });
      return;
    }

    // Read file as base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(",")[1]; // Remove data:image/xxx;base64, prefix
      setDocuments((prev) => ({
        ...prev,
        [fieldName]: base64,
        [`${fieldName}FileName`]: file.name,
        [`${fieldName}Preview`]: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  // Remove document - clears both new upload and original
  const removeDocument = (fieldName) => {
    setDocuments((prev) => ({
      ...prev,
      [fieldName]: null,  // Clear new upload
      [`${fieldName}FileName`]: "",
      [`${fieldName}Preview`]: "",
      [`${fieldName}Original`]: null,  // Clear original path
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateProfileForm(formData);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      Swal.fire({
        icon: "warning",
        title: "Please Check The Form",
        text: "Fix the highlighted fields before saving your profile.",
        confirmButtonColor: "#2563EB",
      });
      return;
    }

    setSaving(true);

    try {
      // Get current user from backend API (no storage)
      const currentUserResponse = await authAPI.getCurrentUser();
      const currentUser = currentUserResponse.data || currentUserResponse;
      const doctorId = currentUser.id;

      if (!doctorId) {
        throw new Error("Doctor ID not found. Please login again.");
      }

      // Helper to check if document is a new upload (base64) vs existing file path
      // Only send base64 content, not file paths
      const isNewUpload = (docData) => {
        if (!docData) return false;
        // If it starts with /uploads/, it's an existing file path - don't send
        if (docData.startsWith("/uploads/") || docData.startsWith("http")) {
          return false;
        }
        // Otherwise it's base64 content (new upload)
        return true;
      };

      // Prepare update data - only include fields that can be edited
      const updateData = {
        fullName: formData.fullName,
        phone: formData.phone,
        address: formData.address,
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender,
        specialization: formData.specialization,
        qualifications: formData.qualifications,
        licenseNumber: formData.licenseNumber,
        experienceYears: formData.experienceYears
          ? parseInt(formData.experienceYears)
          : null,
        // Include documents only if they are NEW UPLOADS (base64), not existing file paths
        ...(isNewUpload(documents.aadharCard) && { aadharCard: documents.aadharCard }),
        ...(documents.aadharCardFileName && isNewUpload(documents.aadharCard) && {
          aadharCardFileName: documents.aadharCardFileName,
        }),
        ...(isNewUpload(documents.panCard) && { panCard: documents.panCard }),
        ...(documents.panCardFileName && isNewUpload(documents.panCard) && {
          panCardFileName: documents.panCardFileName,
        }),
        ...(isNewUpload(documents.medicalCouncilRegistration) && {
          medicalCouncilRegistration: documents.medicalCouncilRegistration,
        }),
        ...(documents.medicalCouncilRegistrationFileName &&
          isNewUpload(documents.medicalCouncilRegistration) && {
            medicalCouncilRegistrationFileName:
              documents.medicalCouncilRegistrationFileName,
          }),
        ...(isNewUpload(documents.ugCertificate) && {
          ugCertificate: documents.ugCertificate,
        }),
        ...(documents.ugCertificateFileName &&
          isNewUpload(documents.ugCertificate) && {
            ugCertificateFileName: documents.ugCertificateFileName,
          }),
        ...(isNewUpload(documents.pgCertificate) && {
          pgCertificate: documents.pgCertificate,
        }),
        ...(documents.pgCertificateFileName &&
          isNewUpload(documents.pgCertificate) && {
            pgCertificateFileName: documents.pgCertificateFileName,
        }),
        ...(profilePicture.value && { profilePicture: profilePicture.value }),
        ...(profilePicture.fileName && profilePicture.value && {
          profilePictureFileName: profilePicture.fileName,
        }),
      };

      // Update user via API - data saved only to backend database
      await userAPI.update(doctorId, updateData);

      Swal.fire({
        icon: "success",
        title: "Profile Updated!",
        text: "Your profile has been updated successfully.",
        confirmButtonColor: "#2563EB",
        confirmButtonText: "OK",
      }).then((result) => {
        if (result.isConfirmed) {
          navigate("/doctor/reports");
        }
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text:
          error.message ||
          "An error occurred while updating your profile. Please try again.",
        confirmButtonColor: "#2563EB",
        confirmButtonText: "OK",
      });
    }

    setSaving(false);
  };

  return (
    <>
      <Navbar role="doctor" />

      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-[#F1F5F9]">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          <div className="bg-white rounded-3xl shadow-2xl p-5 sm:p-8 md:p-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate("/doctor/reports")}
                  className="p-2 rounded-lg bg-[#E0E7FF] text-[#1E3A8A] hover:bg-[#C7D2FE] transition-all duration-200"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-2xl text-[#1E3A8A] font-bold">
                    Edit Profile
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Update your personal information
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-[#1E3A8A] mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Picture
                </h3>

                <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-gray-300 p-6 md:flex-row">
                  {profilePicture.preview ? (
                    <img
                      src={profilePicture.preview}
                      alt={formData.fullName || "Doctor"}
                      className="h-28 w-28 rounded-full object-cover border-4 border-blue-50"
                    />
                  ) : (
                    <div className="h-28 w-28 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] flex items-center justify-center text-white text-3xl sm:text-4xl">
                      {(formData.fullName || "D").trim().charAt(0)}
                    </div>
                  )}

                  <div className="flex-1">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm font-medium text-[#1E3A8A] hover:bg-blue-100 transition-colors">
                      <Upload className="w-4 h-4" />
                      Upload Profile Picture
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg"
                        onChange={handleProfilePictureChange}
                        className="hidden"
                      />
                    </label>
                    <p className="mt-2 text-sm text-gray-500">
                      Use a clear JPG or PNG image up to 5MB.
                    </p>
                    {profilePicture.fileName && (
                      <p className="mt-2 text-sm text-gray-700">{profilePicture.fileName}</p>
                    )}
                  </div>

                  {profilePicture.preview && (
                    <button
                      type="button"
                      onClick={removeProfilePicture}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Personal Information Section */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-[#1E3A8A] mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div>
                    <label className="block text-gray-700 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter your full name"
                        maxLength={80}
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-200 ${
                          errors.fullName ? "border-red-500" : "border-gray-300"
                        }`}
                        required
                      />
                    </div>
                    {errors.fullName && (
                      <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
                    )}
                  </div>

                  {/* Email (read-only) */}
                  <div>
                    <label className="block text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Enter your email"
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed"
                        readOnly
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Email cannot be changed
                    </p>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter your phone number"
                        pattern="[0-9]{10}"
                        maxLength={10}
                        title="Please enter a 10-digit phone number"
                        inputMode="numeric"
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-200 ${
                          errors.phone ? "border-red-500" : "border-gray-300"
                        }`}
                        required
                      />
                    </div>
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                    )}
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-gray-700 mb-2">Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter your address"
                        maxLength={200}
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-200 ${
                          errors.address ? "border-red-500" : "border-gray-300"
                        }`}
                        required
                      />
                    </div>
                    {errors.address && (
                      <p className="mt-1 text-sm text-red-600">{errors.address}</p>
                    )}
                  </div>

                  {/* Age */}
                  <div>
                    <label className="block text-gray-700 mb-2">
                      Date of Birth
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        min={getDateYearsAgo(100)}
                        max={getDateYearsAgo(21)}
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-200 ${
                          errors.dateOfBirth
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />
                    </div>
                    {errors.dateOfBirth && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.dateOfBirth}
                      </p>
                    )}
                  </div>

                  {/* Age */}
                  <div>
                    <label className="block text-gray-700 mb-2">Age</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="age"
                        value={formData.age}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Age will be calculated from DOB"
                        inputMode="numeric"
                        maxLength={3}
                        readOnly
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-200 ${
                          errors.age ? "border-red-500" : "border-gray-300"
                        }`}
                      />
                    </div>
                    {errors.age && (
                      <p className="mt-1 text-sm text-red-600">{errors.age}</p>
                    )}
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-gray-700 mb-2">Gender</label>
                    <CustomSelect
                      value={formData.gender}
                      onChange={(value) =>
                        handleChange({ target: { name: "gender", value } })
                      }
                      onBlur={() => handleBlur({ target: { name: "gender" } })}
                      options={GENDER_OPTIONS}
                      placeholder="Select Gender"
                      buttonClassName={errors.gender ? "!border-red-500" : ""}
                    />
                    {errors.gender && (
                      <p className="mt-1 text-sm text-red-600">{errors.gender}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Professional Information Section */}
              <div className="pb-6">
                <h3 className="text-lg font-semibold text-[#1E3A8A] mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Professional Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Specialization */}
                  <div>
                    <label className="block text-gray-700 mb-2">
                      Specialization
                    </label>
                    <CustomSelect
                      value={formData.specialization}
                      onChange={(value) =>
                        handleChange({
                          target: { name: "specialization", value },
                        })
                      }
                      onBlur={() =>
                        handleBlur({ target: { name: "specialization" } })
                      }
                      options={DOCTOR_SPECIALIZATION_OPTIONS}
                      placeholder="Select Specialization"
                      buttonClassName={
                        errors.specialization ? "!border-red-500" : ""
                      }
                    />
                    {errors.specialization && (
                      <p className="mt-1 text-sm text-red-600">{errors.specialization}</p>
                    )}
                  </div>

                  {/* Qualifications */}
                  <div>
                    <label className="block text-gray-700 mb-2">
                      Qualifications
                    </label>
                    <div className="relative">
                      <Award className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="qualifications"
                        value={formData.qualifications}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="e.g., MBBS, MD, MS"
                        maxLength={100}
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-200 ${
                          errors.qualifications ? "border-red-500" : "border-gray-300"
                        }`}
                      />
                    </div>
                    {errors.qualifications && (
                      <p className="mt-1 text-sm text-red-600">{errors.qualifications}</p>
                    )}
                  </div>

                  {/* License Number */}
                  <div>
                    <label className="block text-gray-700 mb-2">
                      Registration/License Number
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="licenseNumber"
                        value={formData.licenseNumber}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter your license number"
                        maxLength={30}
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-200 ${
                          errors.licenseNumber ? "border-red-500" : "border-gray-300"
                        }`}
                      />
                    </div>
                    {errors.licenseNumber && (
                      <p className="mt-1 text-sm text-red-600">{errors.licenseNumber}</p>
                    )}
                  </div>

                  {/* Experience Years */}
                  <div>
                    <label className="block text-gray-700 mb-2">
                      Years of Experience
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="experienceYears"
                        value={formData.experienceYears}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Enter years of experience"
                        inputMode="numeric"
                        maxLength={2}
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-200 ${
                          errors.experienceYears ? "border-red-500" : "border-gray-300"
                        }`}
                      />
                    </div>
                    {errors.experienceYears && (
                      <p className="mt-1 text-sm text-red-600">{errors.experienceYears}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Documents Section */}
              <div className="pb-6">
                <h3 className="text-lg font-semibold text-[#1E3A8A] mb-4 flex items-center gap-2">
                  <File className="w-5 h-5" />
                  Documents
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 items-start">
                  {/* Aadhar Card */}
                  <div className="flex h-full flex-col">
                    <label className="mb-2 flex min-h-[3.5rem] items-end text-gray-700">
                      Aadhar Card
                    </label>
                    <div className="flex min-h-[15rem] flex-1 items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-[#2563EB] transition-colors">
                      {documents.aadharCardPreview ? (
                        <div className="relative w-full">
                          <img
                            src={documents.aadharCardPreview}
                            alt="Aadhar Card"
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeDocument("aadharCard")}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <p className="text-xs text-gray-500 mt-2 truncate">
                            {documents.aadharCardFileName}
                          </p>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">
                            Upload Aadhar Card
                          </p>
                          <p className="text-xs text-gray-400">
                            JPG, PNG, PDF (max 5MB)
                          </p>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/jpg,application/pdf"
                            onChange={(e) => handleFileChange(e, "aadharCard")}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* PAN Card */}
                  <div className="flex h-full flex-col">
                    <label className="mb-2 flex min-h-[3.5rem] items-end text-gray-700">PAN Card</label>
                    <div className="flex min-h-[15rem] flex-1 items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-[#2563EB] transition-colors">
                      {documents.panCardPreview ? (
                        <div className="relative w-full">
                          <img
                            src={documents.panCardPreview}
                            alt="PAN Card"
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeDocument("panCard")}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <p className="text-xs text-gray-500 mt-2 truncate">
                            {documents.panCardFileName}
                          </p>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">
                            Upload PAN Card
                          </p>
                          <p className="text-xs text-gray-400">
                            JPG, PNG, PDF (max 5MB)
                          </p>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/jpg,application/pdf"
                            onChange={(e) => handleFileChange(e, "panCard")}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Medical Council Registration */}
                  <div className="flex h-full flex-col">
                    <label className="mb-2 flex min-h-[3.5rem] items-end text-gray-700">
                      Medical Council Registration
                    </label>
                    <div className="flex min-h-[15rem] flex-1 items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-[#2563EB] transition-colors">
                      {documents.medicalCouncilRegistrationPreview ? (
                        <div className="relative w-full">
                          <img
                            src={documents.medicalCouncilRegistrationPreview}
                            alt="Medical Council Registration"
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              removeDocument("medicalCouncilRegistration")
                            }
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <p className="text-xs text-gray-500 mt-2 truncate">
                            {documents.medicalCouncilRegistrationFileName}
                          </p>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">
                            Upload Medical Council Registration
                          </p>
                          <p className="text-xs text-gray-400">
                            JPG, PNG, PDF (max 5MB)
                          </p>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/jpg,application/pdf"
                            onChange={(e) =>
                              handleFileChange(e, "medicalCouncilRegistration")
                            }
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* UG Certificate */}
                  <div className="flex h-full flex-col">
                    <label className="mb-2 flex min-h-[3.5rem] items-end text-gray-700">
                      UG Certificate
                    </label>
                    <div className="flex min-h-[15rem] flex-1 items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-[#2563EB] transition-colors">
                      {documents.ugCertificatePreview ? (
                        <div className="relative w-full">
                          <img
                            src={documents.ugCertificatePreview}
                            alt="UG Certificate"
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeDocument("ugCertificate")}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <p className="text-xs text-gray-500 mt-2 truncate">
                            {documents.ugCertificateFileName}
                          </p>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">
                            Upload UG Certificate
                          </p>
                          <p className="text-xs text-gray-400">
                            JPG, PNG, PDF (max 5MB)
                          </p>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/jpg,application/pdf"
                            onChange={(e) => handleFileChange(e, "ugCertificate")}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* PG Certificate */}
                  <div className="flex h-full flex-col">
                    <label className="mb-2 flex min-h-[3.5rem] items-end text-gray-700">
                      PG Certificate
                    </label>
                    <div className="flex min-h-[15rem] flex-1 items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-[#2563EB] transition-colors">
                      {documents.pgCertificatePreview ? (
                        <div className="relative w-full">
                          <img
                            src={documents.pgCertificatePreview}
                            alt="PG Certificate"
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeDocument("pgCertificate")}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <p className="text-xs text-gray-500 mt-2 truncate">
                            {documents.pgCertificateFileName}
                          </p>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">
                            Upload PG Certificate
                          </p>
                          <p className="text-xs text-gray-400">
                            JPG, PNG, PDF (max 5MB)
                          </p>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/jpg,application/pdf"
                            onChange={(e) => handleFileChange(e, "pgCertificate")}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Changes
                    </>
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => navigate("/doctor/reports")}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200"
                >
                  Cancel
                </motion.button>
              </div>
            </form>
          </div>
        </motion.div>
      </main>

      <Footer />
    </>
  );
}

