import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  UserPlus,
  CheckCircle,
  XCircle,
  Mail,
  Award,
  MapPin,
  Phone,
  Lock,
  GraduationCap,
  Building2,
  X,
  Loader2,
  Upload,
  FileText,
  Eye,
  EyeOff,
  Download,
} from "lucide-react";
import Swal from "sweetalert2";
import { Navbar } from "../../components/Navbar.jsx";
import { Footer } from "../../components/Footer.jsx";
import { CustomSelect } from "../../components/CustomSelect.jsx";
import { TablePagination } from "../../components/TablePagination.jsx";
import { userService } from "@/services/api.js";
import { buildApiUrl, buildBackendFileUrl } from "@/config/api.js";
import {
  DOCTOR_GENDER_OPTIONS,
  DOCTOR_SPECIALIZATION_OPTIONS,
} from "@/app/constants/selectOptions.js";
import {
  getPasswordRequirements,
  validateEmail,
  validatePassword,
} from "../../utils/authValidation.js";

const INITIAL_NEW_DOCTOR = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  address: "",
  specialization: "",
  licenseNumber: "",
  experience: "",
  qualification: "",
  hospital: "",
  gender: "",
  age: "",
  profilePicture: "",
  profilePictureFileName: "",
  profilePicturePreview: "",
};

const INITIAL_NEW_DOCTOR_ERRORS = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  address: "",
  specialization: "",
  licenseNumber: "",
  experience: "",
  qualification: "",
  hospital: "",
  gender: "",
  age: "",
};

const DOCTOR_GENDERS = DOCTOR_GENDER_OPTIONS.map((option) => option.value);
const DOCTOR_DOCUMENT_TYPES = {
  aadharCard: "aadhar",
  panCard: "pan",
  medicalCouncilRegistration: "medical-council",
  ugCertificate: "ug-certificate",
  pgCertificate: "pg-certificate",
};
const DOCTOR_DOCUMENT_FIELDS = [
  {
    key: "aadharCard",
    label: "Aadhar Card",
    fileNameKey: "aadharCardFileName",
  },
  {
    key: "panCard",
    label: "PAN Card",
    fileNameKey: "panCardFileName",
  },
  {
    key: "medicalCouncilRegistration",
    label: "Medical Council Registration",
    fileNameKey: "medicalCouncilRegistrationFileName",
  },
  {
    key: "ugCertificate",
    label: "UG Certificate",
    fileNameKey: "ugCertificateFileName",
  },
  {
    key: "pgCertificate",
    label: "PG Certificate",
    fileNameKey: "pgCertificateFileName",
  },
];
const TABLE_PAGE_SIZE = 10;

const EMPTY_DOCUMENTS = {
  aadharCard: null,
  panCard: null,
  medicalCouncilRegistration: null,
  ugCertificate: null,
  pgCertificate: null,
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const isNewUploadValue = (value) => {
  if (!value || typeof value !== "string") {
    return false;
  }

  if (value.startsWith("/uploads/") || /^https?:\/\//i.test(value)) {
    return false;
  }

  return true;
};

const getDoctorAvatarUrl = (doctor) => {
  const rawValue = doctor?.profilePicture || doctor?.avatar || "";

  if (rawValue.includes(",")) {
    return rawValue;
  }

  if (/^https?:\/\//i.test(rawValue)) {
    return rawValue;
  }

  if (rawValue.startsWith("/uploads/")) {
    return doctor?.id
      ? buildApiUrl(`/users/${doctor.id}/profile-picture`)
      : buildBackendFileUrl(rawValue);
  }

  if (rawValue) {
    return `data:image/jpeg;base64,${rawValue}`;
  }

  if (doctor?.profilePictureFileName && doctor?.id) {
    return buildApiUrl(`/users/${doctor.id}/profile-picture`);
  }

  return "";
};

const sanitizeDoctorName = (value = "") =>
  value.replace(/[^A-Za-z\s.'-]/g, "").replace(/\s{2,}/g, " ");

const sanitizeDoctorText = (value = "") => value.replace(/\s{2,}/g, " ");

const validateDoctorFullName = (value) => {
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

  if (!/^[A-Za-z]+(?:[A-Za-z\s.'-]*[A-Za-z])?$/.test(trimmedValue)) {
    return "Use only letters, spaces, apostrophes, periods, and hyphens";
  }

  return "";
};

const validateDoctorPhone = (value) => {
  const trimmedValue = value?.trim() || "";

  if (!trimmedValue) {
    return "";
  }

  if (!/^\d+$/.test(trimmedValue)) {
    return "Phone number must contain only digits";
  }

  if (trimmedValue.length !== 10 || /^0+$/.test(trimmedValue)) {
    return "Enter a valid 10-digit phone number";
  }

  return "";
};

const validateDoctorAddress = (value) => {
  const trimmedValue = value?.trim() || "";

  if (!trimmedValue) {
    return "";
  }

  if (trimmedValue.length < 3) {
    return "Address must be at least 3 characters";
  }

  if (trimmedValue.length > 250) {
    return "Address must be at most 250 characters";
  }

  if (!/[A-Za-z0-9]/.test(trimmedValue)) {
    return "Enter a valid address";
  }

  return "";
};

const validateDoctorExperience = (value) => {
  const trimmedValue = String(value ?? "").trim();

  if (!trimmedValue) {
    return "";
  }

  if (!/^\d+$/.test(trimmedValue)) {
    return "Experience must be a whole number";
  }

  const experience = Number(trimmedValue);

  if (experience < 0 || experience > 60) {
    return "Experience must be between 0 and 60 years";
  }

  return "";
};

const validateDoctorAge = (value) => {
  const trimmedValue = String(value ?? "").trim();

  if (!trimmedValue) {
    return "";
  }

  if (!/^\d+$/.test(trimmedValue)) {
    return "Age must be a whole number";
  }

  const age = Number(trimmedValue);

  if (age < 21 || age > 100) {
    return "Age must be between 21 and 100";
  }

  return "";
};

const validateDoctorGender = (value) => {
  if (!value) {
    return "";
  }

  if (!DOCTOR_GENDERS.includes(value)) {
    return "Select a valid gender";
  }

  return "";
};

const validateDoctorSimpleText = (
  value,
  { label, min = 2, max = 120, pattern = /[A-Za-z]/ } = {},
) => {
  const trimmedValue = value?.trim() || "";

  if (!trimmedValue) {
    return "";
  }

  if (trimmedValue.length < min) {
    return `${label} must be at least ${min} characters`;
  }

  if (trimmedValue.length > max) {
    return `${label} must be at most ${max} characters`;
  }

  if (!pattern.test(trimmedValue)) {
    return `Enter a valid ${label.toLowerCase()}`;
  }

  return "";
};

const validateDoctorLicense = (value) => {
  const trimmedValue = value?.trim() || "";

  if (!trimmedValue) {
    return "";
  }

  if (trimmedValue.length < 4 || trimmedValue.length > 30) {
    return "License number must be 4 to 30 characters";
  }

  if (!/^[A-Za-z0-9/-]+$/.test(trimmedValue)) {
    return "Use only letters, numbers, slashes, and hyphens in license number";
  }

  return "";
};

const buildDoctorErrors = (doctor) => ({
  fullName: validateDoctorFullName(doctor.fullName),
  email: validateEmail(doctor.email),
  phone: validateDoctorPhone(doctor.phone),
  password: validatePassword(doctor.password),
  address: validateDoctorAddress(doctor.address),
  specialization: validateDoctorSimpleText(doctor.specialization, {
    label: "specialization",
  }),
  licenseNumber: validateDoctorLicense(doctor.licenseNumber),
  experience: validateDoctorExperience(doctor.experience),
  qualification: validateDoctorSimpleText(doctor.qualification, {
    label: "qualification",
    max: 80,
    pattern: /[A-Za-z]/,
  }),
  hospital: validateDoctorSimpleText(doctor.hospital, {
    label: "hospital or clinic name",
    max: 120,
    pattern: /[A-Za-z]/,
  }),
  gender: validateDoctorGender(doctor.gender),
  age: validateDoctorAge(doctor.age),
});

export default function AdminDoctors() {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [showEditDoctorModal, setShowEditDoctorModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [newDoctor, setNewDoctor] = useState(INITIAL_NEW_DOCTOR);
  const [newDoctorErrors, setNewDoctorErrors] = useState(
    INITIAL_NEW_DOCTOR_ERRORS,
  );
  const [isSubmittingDoctor, setIsSubmittingDoctor] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const passwordRequirements = getPasswordRequirements(newDoctor.password);

  // Document upload state
  const [documents, setDocuments] = useState(EMPTY_DOCUMENTS);
  const [documentPreviews, setDocumentPreviews] = useState(EMPTY_DOCUMENTS);

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    const shouldLockScroll = showAddDoctorModal || showEditDoctorModal;

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
  }, [showAddDoctorModal, showEditDoctorModal]);

  const fetchDoctors = async () => {
    try {
      const response = await userService.getByRole("DOCTOR");
      // Handle both axios response (response.data) and direct data
      const doctorsData = response.data || response;
      setDoctors(
        Array.isArray(doctorsData)
          ? doctorsData.map((doctor) => ({
              ...doctor,
              gender:
                doctor.gender ??
                doctor.sex ??
                doctor.doctorGender ??
                doctor.userGender ??
                "",
              age: doctor.age ?? doctor.doctorAge ?? doctor.userAge ?? "",
              experienceYears:
                doctor.experienceYears ??
                doctor.experience ??
                doctor.yearsOfExperience ??
                "",
              qualifications:
                doctor.qualifications ??
                doctor.qualification ??
                doctor.degree ??
                "",
            }))
          : [],
      );
    } catch (error) {
      console.error("Error fetching doctors:", error);
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredDoctors = doctors.filter((doctor) => {
    // Only allow alphabets in search - filter out numbers and special characters
    const searchTermAlphabetsOnly = searchTerm.replace(/[^a-zA-Z]/g, "");
    if (searchTerm && searchTermAlphabetsOnly.length !== searchTerm.length) {
      return false;
    }
    return (
      doctor.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(filteredDoctors.length / TABLE_PAGE_SIZE),
    );
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, filteredDoctors.length]);

  const paginatedDoctors = filteredDoctors.slice(
    (currentPage - 1) * TABLE_PAGE_SIZE,
    currentPage * TABLE_PAGE_SIZE,
  );

  // Validate name: only letters, spaces, hyphens, and periods allowed
  const validateName = (name) => {
    return name.replace(/[^a-zA-Z\s.-]/g, "");
  };

  const resetNewDoctorForm = () => {
    setNewDoctor(INITIAL_NEW_DOCTOR);
    setNewDoctorErrors(INITIAL_NEW_DOCTOR_ERRORS);
    setDocuments(EMPTY_DOCUMENTS);
    setDocumentPreviews(EMPTY_DOCUMENTS);
    setShowPassword(false);
    setIsSubmittingDoctor(false);
  };

  const updateNewDoctorField = (field, value) => {
    setNewDoctor((prev) => {
      const nextDoctor = {
        ...prev,
        [field]: value,
      };

      setNewDoctorErrors((prevErrors) => ({
        ...prevErrors,
        [field]: buildDoctorErrors(nextDoctor)[field],
      }));

      return nextDoctor;
    });
  };

  const handleDoctorFieldBlur = (field) => {
    setNewDoctorErrors((prev) => ({
      ...prev,
      [field]: buildDoctorErrors(newDoctor)[field],
    }));
  };

  const handleDoctorProfilePictureChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      Swal.fire({
        title: "Invalid File Type",
        text: "Please upload JPG or PNG images only.",
        icon: "error",
        confirmButtonColor: "#2563EB",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        title: "File Too Large",
        text: "Please upload an image smaller than 5MB.",
        icon: "error",
        confirmButtonColor: "#2563EB",
      });
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    setNewDoctor((prev) => ({
      ...prev,
      profilePicture: dataUrl,
      profilePictureFileName: file.name,
      profilePicturePreview: dataUrl,
    }));
  };

  const handleEditDoctorProfilePictureChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !editingDoctor) {
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      Swal.fire({
        title: "Invalid File Type",
        text: "Please upload JPG or PNG images only.",
        icon: "error",
        confirmButtonColor: "#2563EB",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        title: "File Too Large",
        text: "Please upload an image smaller than 5MB.",
        icon: "error",
        confirmButtonColor: "#2563EB",
      });
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    setEditingDoctor((prev) => ({
      ...prev,
      profilePicture: dataUrl,
      profilePictureFileName: file.name,
      profilePicturePreview: dataUrl,
    }));
  };

  const openEditDoctorModal = (doctor) => {
    setEditingDoctor({
      ...doctor,
      experienceYears:
        doctor.experienceYears ?? doctor.experience ?? doctor.yearsOfExperience ?? "",
      qualifications:
        doctor.qualifications ?? doctor.qualification ?? doctor.degree ?? "",
      hospital: doctor.hospital ?? "",
      password: "",
      profilePicture: null,
      profilePicturePreview: getDoctorAvatarUrl(doctor),
    });
    setDocuments(EMPTY_DOCUMENTS);
    setDocumentPreviews(EMPTY_DOCUMENTS);
    setShowEditPassword(false);
    setShowEditDoctorModal(true);
  };

  const handleApprove = async (doctor) => {
    try {
      await userService.update(doctor.id, { isActive: true });
      setDoctors(
        doctors.map((d) => (d.id === doctor.id ? { ...d, isActive: true } : d)),
      );
      Swal.fire({
        title: "Approved!",
        text: `${doctor.fullName} has been approved successfully.`,
        icon: "success",
        confirmButtonColor: "#2563EB",
      });
    } catch (error) {
      console.error("Error approving doctor:", error);
      Swal.fire({
        title: "Error!",
        text: "Failed to approve doctor",
        icon: "error",
        confirmButtonColor: "#2563EB",
      });
    }
  };

  const handleReject = async (doctor) => {
    try {
      await userService.update(doctor.id, { isActive: false });
      setDoctors(
        doctors.map((d) =>
          d.id === doctor.id ? { ...d, isActive: false } : d,
        ),
      );
      Swal.fire({
        title: "Rejected!",
        text: `${doctor.fullName} has been rejected.`,
        icon: "error",
        confirmButtonColor: "#2563EB",
      });
    } catch (error) {
      console.error("Error rejecting doctor:", error);
    }
  };

  // Handle file selection for document upload
  const handleFileChange = (e, docType) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/jpg",
      ];
      if (!allowedTypes.includes(file.type)) {
        Swal.fire({
          title: "Invalid File Type",
          text: "Please upload PDF, JPEG, or PNG files only.",
          icon: "error",
          confirmButtonColor: "#2563EB",
        });
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        Swal.fire({
          title: "File Too Large",
          text: "Please upload files smaller than 10MB.",
          icon: "error",
          confirmButtonColor: "#2563EB",
        });
        return;
      }

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocumentPreviews((prev) => ({
          ...prev,
          [docType]: reader.result,
        }));
      };
      reader.readAsDataURL(file);

      setDocuments((prev) => ({
        ...prev,
        [docType]: file,
      }));
    }
  };

  const handleViewDetails = async (doctor) => {
    // Fetch fresh doctor data from server before showing details
    let displayDoctor = doctor;
    try {
      const response = await userService.getUserById(doctor.id);
      displayDoctor = response.data || response;
    } catch (error) {
      console.error("Error fetching doctor details:", error);
      // Fallback to cached data
    }

    // Helper function to view document
    const viewDocument = async (docType, docName) => {
      const hasDoc =
        (docType === "aadharCard" && displayDoctor.aadharCardFileName) ||
        (docType === "panCard" && displayDoctor.panCardFileName) ||
        (docType === "medicalCouncilRegistration" &&
          displayDoctor.medicalCouncilRegistrationFileName) ||
        (docType === "ugCertificate" && displayDoctor.ugCertificateFileName) ||
        (docType === "pgCertificate" && displayDoctor.pgCertificateFileName);

      if (!hasDoc) {
        Swal.fire({
          title: "No Document",
          text: `No ${docName} has been uploaded.`,
          icon: "warning",
          confirmButtonColor: "#2563EB",
        });
        return;
      }

      try {
        const documentData =
          docType === "aadharCard"
            ? displayDoctor.aadharCard
            : docType === "panCard"
              ? displayDoctor.panCard
              : docType === "medicalCouncilRegistration"
                ? displayDoctor.medicalCouncilRegistration
                : docType === "ugCertificate"
                  ? displayDoctor.ugCertificate
                  : displayDoctor.pgCertificate;

        const documentFileName =
          docType === "aadharCard"
            ? displayDoctor.aadharCardFileName
            : docType === "panCard"
              ? displayDoctor.panCardFileName
              : docType === "medicalCouncilRegistration"
                ? displayDoctor.medicalCouncilRegistrationFileName
                : docType === "ugCertificate"
                  ? displayDoctor.ugCertificateFileName
                  : displayDoctor.pgCertificateFileName;

        if (!documentData) {
          throw new Error("Document data missing");
        }

        let documentUrl = "";
        if (documentData.includes(",")) {
          documentUrl = documentData;
        } else if (documentData.startsWith("/uploads/")) {
          documentUrl = buildApiUrl(
            `/users/${displayDoctor.id}/document/${DOCTOR_DOCUMENT_TYPES[docType]}`,
          );
        } else if (documentData.startsWith("http")) {
          documentUrl = documentData;
        } else {
          const mimeType = documentFileName?.toLowerCase().endsWith(".pdf")
            ? "application/pdf"
            : "image/jpeg";
          documentUrl = `data:${mimeType};base64,${documentData}`;
        }

        if (!documentUrl) {
          throw new Error("Unable to build document URL");
        }

        const newTab = window.open("about:blank", "_blank");

        if (!newTab) {
          const link = document.createElement("a");
          link.href = documentUrl;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          newTab.opener = null;
          newTab.location.replace(documentUrl);
        }
      } catch (error) {
        console.error("Error viewing document:", error);
        Swal.fire({
          title: "Error",
          text: "Failed to open document. Please check access permission and try again.",
          icon: "error",
          confirmButtonColor: "#2563EB",
        });
      }
    };

    // Build documents HTML with better styling and view/download buttons
    let documentsHtml = "";
    if (
      displayDoctor.aadharCardFileName ||
      displayDoctor.panCardFileName ||
      displayDoctor.medicalCouncilRegistrationFileName ||
      displayDoctor.ugCertificateFileName ||
      displayDoctor.pgCertificateFileName
    ) {
      documentsHtml = `
        <div class="mt-4 pt-4 border-t border-gray-200">
          <h4 class="font-semibold text-[#1E3A8A] mb-3">Uploaded Documents</h4>
          <div class="grid grid-cols-1 gap-3">
            ${
              displayDoctor.aadharCardFileName
                ? `
              <div class="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div class="flex items-center gap-2">
                  <span class="text-green-600">OK</span>
                  <span class="text-gray-700 font-medium">Aadhar Card:</span>
                  <span class="text-green-700 text-sm">${displayDoctor.aadharCardFileName}</span>
                </div>
                <button onclick="window.viewDoc('aadharCard', 'Aadhar Card')" class="px-3 py-1 bg-[#2563EB] text-white rounded text-sm hover:bg-blue-600">View</button>
              </div>
            `
                : `
              <div class="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                <span class="text-red-500">X</span>
                <span class="text-gray-700 font-medium">Aadhar Card:</span>
                <span class="text-red-600 text-sm">Not uploaded</span>
              </div>
            `
            }
            ${
              displayDoctor.panCardFileName
                ? `
              <div class="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div class="flex items-center gap-2">
                  <span class="text-green-600">OK</span>
                  <span class="text-gray-700 font-medium">PAN Card:</span>
                  <span class="text-green-700 text-sm">${displayDoctor.panCardFileName}</span>
                </div>
                <button onclick="window.viewDoc('panCard', 'PAN Card')" class="px-3 py-1 bg-[#2563EB] text-white rounded text-sm hover:bg-blue-600">View</button>
              </div>
            `
                : `
              <div class="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                <span class="text-red-500">X</span>
                <span class="text-gray-700 font-medium">PAN Card:</span>
                <span class="text-red-600 text-sm">Not uploaded</span>
              </div>
            `
            }
            ${
              displayDoctor.medicalCouncilRegistrationFileName
                ? `
              <div class="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div class="flex items-center gap-2">
                  <span class="text-green-600">OK</span>
                  <span class="text-gray-700 font-medium">Medical Council Registration:</span>
                  <span class="text-green-700 text-sm">${displayDoctor.medicalCouncilRegistrationFileName}</span>
                </div>
                <button onclick="window.viewDoc('medicalCouncilRegistration', 'Medical Council Registration')" class="px-3 py-1 bg-[#2563EB] text-white rounded text-sm hover:bg-blue-600">View</button>
              </div>
            `
                : `
              <div class="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                <span class="text-red-500">X</span>
                <span class="text-gray-700 font-medium">Medical Council Registration:</span>
                <span class="text-red-600 text-sm">Not uploaded</span>
              </div>
            `
            }
            ${
              displayDoctor.ugCertificateFileName
                ? `
              <div class="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div class="flex items-center gap-2">
                  <span class="text-green-600">OK</span>
                  <span class="text-gray-700 font-medium">UG Certificate:</span>
                  <span class="text-green-700 text-sm">${displayDoctor.ugCertificateFileName}</span>
                </div>
                <button onclick="window.viewDoc('ugCertificate', 'UG Certificate')" class="px-3 py-1 bg-[#2563EB] text-white rounded text-sm hover:bg-blue-600">View</button>
              </div>
            `
                : `
              <div class="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                <span class="text-red-500">X</span>
                <span class="text-gray-700 font-medium">UG Certificate:</span>
                <span class="text-red-600 text-sm">Not uploaded</span>
              </div>
            `
            }
            ${
              displayDoctor.pgCertificateFileName
                ? `
              <div class="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div class="flex items-center gap-2">
                  <span class="text-green-600">OK</span>
                  <span class="text-gray-700 font-medium">PG Certificate:</span>
                  <span class="text-green-700 text-sm">${displayDoctor.pgCertificateFileName}</span>
                </div>
                <button onclick="window.viewDoc('pgCertificate', 'PG Certificate')" class="px-3 py-1 bg-[#2563EB] text-white rounded text-sm hover:bg-blue-600">View</button>
              </div>
            `
                : `
              <div class="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                <span class="text-red-500">X</span>
                <span class="text-gray-700 font-medium">PG Certificate:</span>
                <span class="text-red-600 text-sm">Not uploaded</span>
              </div>
            `
            }
          </div>
        </div>
      `;
    } else {
      documentsHtml = `
        <div class="mt-4 pt-4 border-t border-gray-200">
          <h4 class="font-semibold text-[#1E3A8A] mb-3">Uploaded Documents</h4>
          <div class="text-center py-4 text-gray-500">
            <p>No documents uploaded yet</p>
          </div>
        </div>
      `;
    }

    const doctorAge =
      displayDoctor.age ?? displayDoctor.doctorAge ?? displayDoctor.userAge;
    const doctorExperience =
      displayDoctor.experienceYears ??
      displayDoctor.experience ??
      displayDoctor.yearsOfExperience;
    const doctorQualification =
      displayDoctor.qualifications ??
      displayDoctor.qualification ??
      displayDoctor.degree;

    const ageText =
      doctorAge === null || doctorAge === undefined || doctorAge === ""
        ? "N/A"
        : String(doctorAge);
    const experienceText =
      doctorExperience === null ||
      doctorExperience === undefined ||
      doctorExperience === ""
        ? "N/A"
        : `${doctorExperience} years`;
    const qualificationText =
      doctorQualification === null ||
      doctorQualification === undefined ||
      doctorQualification === ""
        ? "N/A"
        : doctorQualification;

    // Expose view function globally for SweetAlert
    window.viewDoc = viewDocument;

    Swal.fire({
      title: `<span class="text-[#1E3A8A]">${displayDoctor.fullName}</span>`,
      html: `
        <div class="text-left space-y-3">
          <p><strong class="text-gray-700">Specialization:</strong> <span class="text-gray-600">${displayDoctor.specialization || "N/A"}</span></p>
          <p><strong class="text-gray-700">Email:</strong> <span class="text-gray-600">${displayDoctor.email}</span></p>
          <p><strong class="text-gray-700">License:</strong> <span class="text-gray-600">${displayDoctor.licenseNumber || "N/A"}</span></p>
          <p><strong class="text-gray-700">Address:</strong> <span class="text-gray-600">${displayDoctor.address || "N/A"}</span></p>
          <p><strong class="text-gray-700">Status:</strong> <span class="px-2 py-1 rounded-full text-sm ${displayDoctor.isActive ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}">${displayDoctor.isActive ? "Active" : "Inactive"}</span></p>
          <p><strong class="text-gray-700">Gender:</strong> <span class="text-gray-600">${displayDoctor.gender || "N/A"}</span></p>
          <p><strong class="text-gray-700">Age:</strong> <span class="text-gray-600">${ageText}</span></p>
          <p><strong class="text-gray-700">Experience:</strong> <span class="text-gray-600">${experienceText}</span></p>
          <p><strong class="text-gray-700">Qualification:</strong> <span class="text-gray-600">${qualificationText}</span></p>
          ${documentsHtml}
        </div>
      `,
      icon: "info",
      confirmButtonColor: "#2563EB",
      confirmButtonText: "Close",
      width: "500px",
    });
  };

  const handleAddDoctor = async () => {
    const nextErrors = buildDoctorErrors(newDoctor);
    setNewDoctorErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    const missingDocuments = DOCTOR_DOCUMENT_FIELDS.filter(
      ({ key }) => !documents[key],
    );
    if (missingDocuments.length > 0) {
      Swal.fire({
        title: "Documents Required",
        text: "Please upload all 5 doctor documents before registering.",
        icon: "warning",
        confirmButtonColor: "#2563EB",
      });
      return;
    }

    setIsSubmittingDoctor(true);

    try {
      const documentPayload = {};

      for (const { key, fileNameKey } of DOCTOR_DOCUMENT_FIELDS) {
        const file = documents[key];
        const base64Data = await fileToDataUrl(file);
        documentPayload[key] = base64Data;
        documentPayload[fileNameKey] = file.name;
      }

      const response = await userService.registerDirect({
        ...newDoctor,
        ...documentPayload,
        fullName: newDoctor.fullName.trim().replace(/\s{2,}/g, " "),
        email: newDoctor.email.trim().toLowerCase(),
        phone: newDoctor.phone.trim() || null,
        address: newDoctor.address.trim() || null,
        specialization: newDoctor.specialization.trim() || "",
        licenseNumber: newDoctor.licenseNumber.trim() || "",
        experienceYears: newDoctor.experience
          ? Number(newDoctor.experience)
          : 0,
        qualifications: newDoctor.qualification.trim() || "",
        hospital: newDoctor.hospital.trim() || "",
        gender: newDoctor.gender || null,
        age: newDoctor.age ? Number(newDoctor.age) : null,
        profilePicture: newDoctor.profilePicture || null,
        profilePictureFileName: newDoctor.profilePictureFileName || null,
        role: "DOCTOR",
      });
      const result = response.data || response;

      // Check if doctor requires email verification
      if (result.requiresVerification) {
        // Doctor saved to pending - needs email verification
        setShowAddDoctorModal(false);
        resetNewDoctorForm();
        // Show success message - OTP will be sent when user verifies after first login
        Swal.fire({
          title: "Doctor Added!",
          html: `
            <p>Doctor has been added successfully!</p>
            <p class="mt-2 text-sm text-gray-600">Doctor can login and verify email on first login.</p>
          `,
          icon: "success",
          confirmButtonColor: "#2563EB",
        });
      } else {
        // Doctor created directly (should not happen for DOCTOR role)
        await fetchDoctors();
        setShowAddDoctorModal(false);
        resetNewDoctorForm();
        Swal.fire({
          title: "Registered!",
          text: "Doctor has been registered successfully.",
          icon: "success",
          confirmButtonColor: "#2563EB",
        });
      }
    } catch (error) {
      console.error("Error adding doctor:", error);
      Swal.fire({
        title: "Error!",
        text:
          error.response?.data?.message ||
          error.message ||
          "Failed to register doctor. Please try again.",
        icon: "error",
        confirmButtonColor: "#2563EB",
      });
    } finally {
      setIsSubmittingDoctor(false);
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
              <h1 className="text-3xl sm:text-4xl text-[#1E3A8A] mb-2">
                Manage Doctors
              </h1>
              <p className="text-xl text-gray-600">
                Approve and manage healthcare professionals
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddDoctorModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white rounded-xl hover:shadow-lg transition-all duration-200"
            >
              <UserPlus className="w-5 h-5" />
              Add New Doctor
            </motion.button>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 mb-2">Total Doctors</p>
                  <p className="text-3xl text-[#1E3A8A]">{doctors.length}</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] rounded-xl flex items-center justify-center">
                  <Award className="w-7 h-7 text-white" />
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
                  <p className="text-3xl text-[#16A34A]">
                    {doctors.filter((d) => d.isActive).length}
                  </p>
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
                  <p className="text-3xl text-[#F59E0B]">
                    {doctors.filter((d) => !d.isActive).length}
                  </p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-[#F59E0B] to-[#FBBF24] rounded-xl flex items-center justify-center">
                  <XCircle className="w-7 h-7 text-white" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-8"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search doctors by name or specialization (alphabets only)..."
                value={searchTerm}
                onChange={(e) => {
                  // Only allow alphabets and spaces
                  const value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                  setSearchTerm(value);
                }}
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent shadow-sm"
              />
            </div>
          </motion.div>

          {/* Doctors Table */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white">
                  <tr>
                    <th className="px-6 py-4 text-left">Doctor</th>
                    <th className="px-6 py-4 text-left">Specialization</th>
                    <th className="px-6 py-4 text-left">Gender</th>
                    <th className="px-6 py-4 text-left">Age</th>
                    <th className="px-6 py-4 text-left">Place</th>
                    <th className="px-6 py-4 text-left">Status</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDoctors.map((doctor, index) => (
                    <motion.tr
                      key={doctor.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.6 + index * 0.05 }}
                      className="border-b border-gray-200 hover:bg-[#F1F5F9] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {getDoctorAvatarUrl(doctor) ? (
                            <img
                              src={getDoctorAvatarUrl(doctor)}
                              alt={doctor.fullName || "Doctor"}
                              className="w-10 h-10 rounded-full object-cover border border-blue-100"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] rounded-full flex items-center justify-center text-white">
                              {doctor.fullName?.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="text-gray-700">{doctor.fullName}</p>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Mail className="w-3 h-3" />
                              {doctor.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {doctor.specialization || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {doctor.gender || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {doctor.age === null ||
                        doctor.age === undefined ||
                        doctor.age === ""
                          ? "N/A"
                          : doctor.age}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {doctor.address || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm ${
                            doctor.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {doctor.isActive ? "Active" : "Pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {!doctor.isActive && (
                            <>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleApprove(doctor)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Approve"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleReject(doctor)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Reject"
                              >
                                <XCircle className="w-5 h-5" />
                              </motion.button>
                            </>
                          )}
                          {doctor.isActive && (
                            <>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => openEditDoctorModal(doctor)}
                                className="px-3 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                                title="Edit"
                              >
                                Edit
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleViewDetails(doctor)}
                                className="px-4 py-2 bg-[#F1F5F9] text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                              >
                                View Details
                              </motion.button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <TablePagination
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              totalItems={filteredDoctors.length}
              itemLabel="doctors"
              pageSize={TABLE_PAGE_SIZE}
            />
          </motion.div>
        </div>
      </main>

      <Footer />

      {/* Add Doctor Modal */}
      <AnimatePresence>
        {showAddDoctorModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-hidden"
            onClick={() => {
              setShowAddDoctorModal(false);
              resetNewDoctorForm();
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl text-[#1E3A8A]">Register New Doctor</h2>
                <button
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => {
                    setShowAddDoctorModal(false);
                    resetNewDoctorForm();
                  }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Picture
                  </label>
                  <div className="flex items-center gap-4 rounded-2xl border border-dashed border-gray-300 p-4">
                    {newDoctor.profilePicturePreview ? (
                      <img
                        src={newDoctor.profilePicturePreview}
                        alt="Doctor preview"
                        className="h-20 w-20 rounded-full object-cover border border-blue-100"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] flex items-center justify-center text-white text-2xl">
                        {newDoctor.fullName?.trim()?.charAt(0) || "D"}
                      </div>
                    )}
                    <div className="flex-1">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-medium text-[#1E3A8A] hover:bg-blue-100 transition-colors">
                        <Upload className="w-4 h-4" />
                        Upload Photo
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/jpg"
                          onChange={handleDoctorProfilePictureChange}
                          className="hidden"
                        />
                      </label>
                      <p className="mt-2 text-xs text-gray-500">
                        JPG or PNG, up to 5MB.
                      </p>
                      {newDoctor.profilePictureFileName && (
                        <p className="mt-1 text-sm text-gray-600">
                          {newDoctor.profilePictureFileName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={newDoctor.fullName}
                    onChange={(e) =>
                      updateNewDoctorField(
                        "fullName",
                        sanitizeDoctorName(e.target.value),
                      )
                    }
                    onBlur={() => handleDoctorFieldBlur("fullName")}
                    placeholder="Dr. John Doe"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent ${
                      newDoctorErrors.fullName
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                  />
                  {newDoctorErrors.fullName && (
                    <p className="mt-1 text-sm text-red-500">
                      {newDoctorErrors.fullName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newDoctor.email}
                    onChange={(e) =>
                      updateNewDoctorField("email", e.target.value)
                    }
                    onBlur={() => handleDoctorFieldBlur("email")}
                    placeholder="doctor@example.com"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent ${
                      newDoctorErrors.email
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                  />
                  {newDoctorErrors.email && (
                    <p className="mt-1 text-sm text-red-500">
                      {newDoctorErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newDoctor.phone}
                    maxLength={10}
                    inputMode="numeric"
                    onChange={(e) =>
                      updateNewDoctorField(
                        "phone",
                        e.target.value.replace(/\D/g, "").slice(0, 10),
                      )
                    }
                    onBlur={() => handleDoctorFieldBlur("phone")}
                    placeholder="Enter 10-digit phone number"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent ${
                      newDoctorErrors.phone
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                  />
                  {newDoctorErrors.phone && (
                    <p className="mt-1 text-sm text-red-500">
                      {newDoctorErrors.phone}
                    </p>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newDoctor.password}
                      onChange={(e) =>
                        updateNewDoctorField("password", e.target.value)
                      }
                      onBlur={() => handleDoctorFieldBlur("password")}
                      placeholder="Enter password"
                      className={`w-full px-4 py-3 pr-12 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent ${
                        newDoctorErrors.password
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
                  {newDoctorErrors.password && (
                    <p className="mt-1 text-sm text-red-500">
                      {newDoctorErrors.password}
                    </p>
                  )}
                  {newDoctor.password && (
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={newDoctor.address}
                    onChange={(e) =>
                      updateNewDoctorField(
                        "address",
                        sanitizeDoctorText(e.target.value),
                      )
                    }
                    onBlur={() => handleDoctorFieldBlur("address")}
                    placeholder="City, State (Optional)"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent ${
                      newDoctorErrors.address
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                  />
                  {newDoctorErrors.address && (
                    <p className="mt-1 text-sm text-red-500">
                      {newDoctorErrors.address}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specialization
                  </label>
                  <CustomSelect
                    value={newDoctor.specialization}
                    onChange={(value) =>
                      updateNewDoctorField("specialization", value)
                    }
                    onBlur={() => handleDoctorFieldBlur("specialization")}
                    options={DOCTOR_SPECIALIZATION_OPTIONS}
                    placeholder="Select specialization (Optional)"
                    buttonClassName={
                      newDoctorErrors.specialization ? "!border-red-500" : ""
                    }
                  />
                  {newDoctorErrors.specialization && (
                    <p className="mt-1 text-sm text-red-500">
                      {newDoctorErrors.specialization}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Number
                  </label>
                  <input
                    type="text"
                    value={newDoctor.licenseNumber}
                    onChange={(e) =>
                      updateNewDoctorField(
                        "licenseNumber",
                        e.target.value
                          .toUpperCase()
                          .replace(/[^A-Z0-9/-]/g, ""),
                      )
                    }
                    onBlur={() => handleDoctorFieldBlur("licenseNumber")}
                    placeholder="MD-12345"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent ${
                      newDoctorErrors.licenseNumber
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                  />
                  {newDoctorErrors.licenseNumber && (
                    <p className="mt-1 text-sm text-red-500">
                      {newDoctorErrors.licenseNumber}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Experience (Years)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newDoctor.experience}
                    onChange={(e) =>
                      updateNewDoctorField(
                        "experience",
                        e.target.value.replace(/\D/g, "").slice(0, 2),
                      )
                    }
                    onBlur={() => handleDoctorFieldBlur("experience")}
                    placeholder="Enter years of experience"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent ${
                      newDoctorErrors.experience
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                  />
                  {newDoctorErrors.experience && (
                    <p className="mt-1 text-sm text-red-500">
                      {newDoctorErrors.experience}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Qualification
                  </label>
                  <input
                    type="text"
                    value={newDoctor.qualification}
                    onChange={(e) =>
                      updateNewDoctorField(
                        "qualification",
                        sanitizeDoctorText(e.target.value),
                      )
                    }
                    onBlur={() => handleDoctorFieldBlur("qualification")}
                    placeholder="e.g., MBBS, MD, PhD"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent ${
                      newDoctorErrors.qualification
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                  />
                  {newDoctorErrors.qualification && (
                    <p className="mt-1 text-sm text-red-500">
                      {newDoctorErrors.qualification}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hospital/Clinic
                  </label>
                  <input
                    type="text"
                    value={newDoctor.hospital}
                    onChange={(e) =>
                      updateNewDoctorField(
                        "hospital",
                        sanitizeDoctorText(e.target.value),
                      )
                    }
                    onBlur={() => handleDoctorFieldBlur("hospital")}
                    placeholder="Enter hospital or clinic name"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent ${
                      newDoctorErrors.hospital
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                  />
                  {newDoctorErrors.hospital && (
                    <p className="mt-1 text-sm text-red-500">
                      {newDoctorErrors.hospital}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <CustomSelect
                    value={newDoctor.gender}
                    onChange={(value) => updateNewDoctorField("gender", value)}
                    onBlur={() => handleDoctorFieldBlur("gender")}
                    options={DOCTOR_GENDER_OPTIONS}
                    placeholder="Select gender"
                    buttonClassName={
                      newDoctorErrors.gender ? "!border-red-500" : ""
                    }
                  />
                  {newDoctorErrors.gender && (
                    <p className="mt-1 text-sm text-red-500">
                      {newDoctorErrors.gender}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {" "}
                    Age
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newDoctor.age}
                    onChange={(e) =>
                      updateNewDoctorField(
                        "age",
                        e.target.value.replace(/\D/g, "").slice(0, 3),
                      )
                    }
                    onBlur={() => handleDoctorFieldBlur("age")}
                    placeholder="Enter age"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent ${
                      newDoctorErrors.age ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {newDoctorErrors.age && (
                    <p className="mt-1 text-sm text-red-500">
                      {newDoctorErrors.age}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-gray-200 p-5">
                  <div className="mb-4">
                    <h3 className="text-lg text-[#1E3A8A]">
                      Upload 5 Documents
                    </h3>
                    <p className="text-sm text-gray-500">
                      Upload all required doctor documents in PDF, JPG, or PNG
                      format. Maximum file size: 10MB each.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {DOCTOR_DOCUMENT_FIELDS.map(({ key, label }) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {label} *
                        </label>
                        <div className="rounded-xl border-2 border-dashed border-gray-300 p-4 transition-colors hover:border-[#2563EB]">
                          <input
                            type="file"
                            accept="application/pdf,image/jpeg,image/png,image/jpg"
                            onChange={(e) => handleFileChange(e, key)}
                            className="w-full text-sm text-gray-600"
                          />
                          {documentPreviews[key] && (
                            <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-2">
                              <div className="flex items-center gap-2 text-green-700">
                                <FileText className="w-4 h-4" />
                                <span className="text-sm font-medium">
                                  Selected: {documents[key]?.name}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                    onClick={() => {
                      setShowAddDoctorModal(false);
                      resetNewDoctorForm();
                    }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isSubmittingDoctor}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={handleAddDoctor}
                  >
                    {isSubmittingDoctor ? "Registering..." : "Register"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Doctor Modal */}
      <AnimatePresence>
        {showEditDoctorModal && editingDoctor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-hidden"
            onClick={() => {
              setShowEditDoctorModal(false);
              setEditingDoctor(null);
              setDocuments(EMPTY_DOCUMENTS);
              setDocumentPreviews(EMPTY_DOCUMENTS);
              setShowEditPassword(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl text-[#1E3A8A]">Edit Doctor</h2>
                <button
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => {
                    setShowEditDoctorModal(false);
                    setEditingDoctor(null);
                    setDocuments(EMPTY_DOCUMENTS);
                    setDocumentPreviews(EMPTY_DOCUMENTS);
                    setShowEditPassword(false);
                  }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Picture
                  </label>
                  <div className="flex items-center gap-4 rounded-2xl border border-dashed border-gray-300 p-4">
                    {editingDoctor.profilePicturePreview ||
                    getDoctorAvatarUrl(editingDoctor) ? (
                      <img
                        src={
                          editingDoctor.profilePicturePreview ||
                          getDoctorAvatarUrl(editingDoctor)
                        }
                        alt="Doctor preview"
                        className="h-20 w-20 rounded-full object-cover border border-blue-100"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] flex items-center justify-center text-white text-2xl">
                        {editingDoctor.fullName?.trim()?.charAt(0) || "D"}
                      </div>
                    )}
                    <div className="flex-1">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-medium text-[#1E3A8A] hover:bg-blue-100 transition-colors">
                        <Upload className="w-4 h-4" />
                        Upload Photo
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/jpg"
                          onChange={handleEditDoctorProfilePictureChange}
                          className="hidden"
                        />
                      </label>
                      <p className="mt-2 text-xs text-gray-500">
                        JPG or PNG, up to 5MB.
                      </p>
                      {editingDoctor.profilePictureFileName && (
                        <p className="mt-1 text-sm text-gray-600">
                          {editingDoctor.profilePictureFileName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editingDoctor.fullName || ""}
                    onChange={(e) =>
                      setEditingDoctor({
                        ...editingDoctor,
                        fullName: validateName(e.target.value),
                      })
                    }
                    pattern="^[a-zA-Z\\s.-]+$"
                    title="Only letters, spaces, hyphens, and periods are allowed"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editingDoctor.email || ""}
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={editingDoctor.phone || ""}
                    onChange={(e) =>
                      setEditingDoctor({
                        ...editingDoctor,
                        phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  />
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showEditPassword ? "text" : "password"}
                      value={editingDoctor.password || ""}
                      onChange={(e) =>
                        setEditingDoctor({
                          ...editingDoctor,
                          password: e.target.value,
                        })
                      }
                      placeholder="Enter new password if you want to change it"
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      aria-label={
                        showEditPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showEditPassword ? (
                        <Eye className="w-5 h-5" />
                      ) : (
                        <EyeOff className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={editingDoctor.address || ""}
                    onChange={(e) =>
                      setEditingDoctor({
                        ...editingDoctor,
                        address: sanitizeDoctorText(e.target.value),
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specialization
                  </label>
                  <CustomSelect
                    value={editingDoctor.specialization || ""}
                    onChange={(value) =>
                      setEditingDoctor({
                        ...editingDoctor,
                        specialization: value,
                      })
                    }
                    options={DOCTOR_SPECIALIZATION_OPTIONS}
                    placeholder="Select specialization"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Number
                  </label>
                  <input
                    type="text"
                    value={editingDoctor.licenseNumber || ""}
                    onChange={(e) =>
                      setEditingDoctor({
                        ...editingDoctor,
                        licenseNumber: e.target.value
                          .toUpperCase()
                          .replace(/[^A-Z0-9/-]/g, ""),
                      })
                    }
                    placeholder="MD-12345"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Experience (Years)
                  </label>
                  <input
                    type="number"
                    value={editingDoctor.experienceYears || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (
                        value &&
                        (isNaN(parseInt(value)) || parseInt(value) > 60)
                      ) {
                        return;
                      }
                      setEditingDoctor({
                        ...editingDoctor,
                        experienceYears: value ? parseInt(value) : 0,
                      });
                    }}
                    placeholder="Enter years of experience"
                    min="0"
                    max="60"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Qualification
                  </label>
                  <input
                    type="text"
                    value={editingDoctor.qualifications || ""}
                    onChange={(e) =>
                      setEditingDoctor({
                        ...editingDoctor,
                        qualifications: sanitizeDoctorText(e.target.value),
                      })
                    }
                    placeholder="e.g., MBBS, MD, PhD"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hospital/Clinic
                  </label>
                  <input
                    type="text"
                    value={editingDoctor.hospital || ""}
                    onChange={(e) =>
                      setEditingDoctor({
                        ...editingDoctor,
                        hospital: sanitizeDoctorText(e.target.value),
                      })
                    }
                    placeholder="Enter hospital or clinic name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <CustomSelect
                    value={editingDoctor.gender || ""}
                    onChange={(value) =>
                      setEditingDoctor({
                        ...editingDoctor,
                        gender: value,
                      })
                    }
                    options={DOCTOR_GENDER_OPTIONS}
                    placeholder="Select gender"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    value={editingDoctor.age || ""}
                    onChange={(e) =>
                      setEditingDoctor({
                        ...editingDoctor,
                        age: e.target.value ? parseInt(e.target.value) : "",
                      })
                    }
                    placeholder="Enter age"
                    min="18"
                    max="100"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  />
                </div>

                <div className="rounded-2xl border border-gray-200 p-5">
                  <div className="mb-4">
                    <h3 className="text-lg text-[#1E3A8A]">
                      Upload 5 Documents
                    </h3>
                    <p className="text-sm text-gray-500">
                      Replace any of the existing doctor documents if needed.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {DOCTOR_DOCUMENT_FIELDS.map(({ key, label, fileNameKey }) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {label}
                          {editingDoctor[fileNameKey] && (
                            <span className="ml-2 text-xs text-green-600">
                              (Uploaded: {editingDoctor[fileNameKey]})
                            </span>
                          )}
                        </label>
                        <div className="rounded-xl border-2 border-dashed border-gray-300 p-4 transition-colors hover:border-[#2563EB]">
                          <input
                            type="file"
                            accept="application/pdf,image/jpeg,image/png,image/jpg"
                            onChange={(e) => handleFileChange(e, key)}
                            className="w-full text-sm text-gray-600"
                          />
                          {documentPreviews[key] && (
                            <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-2">
                              <div className="flex items-center gap-2 text-green-700">
                                <FileText className="w-4 h-4" />
                                <span className="text-sm font-medium">
                                  Selected: {documents[key]?.name}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                    onClick={() => {
                      setShowEditDoctorModal(false);
                      setEditingDoctor(null);
                      setDocuments(EMPTY_DOCUMENTS);
                      setDocumentPreviews(EMPTY_DOCUMENTS);
                      setShowEditPassword(false);
                    }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium"
                    onClick={async () => {
                      try {
                        const updatePayload = {
                          fullName: editingDoctor.fullName,
                          password: editingDoctor.password?.trim() || undefined,
                          phone: editingDoctor.phone,
                          address: editingDoctor.address,
                          specialization: editingDoctor.specialization,
                          licenseNumber: editingDoctor.licenseNumber,
                          experienceYears: editingDoctor.experienceYears,
                          qualifications: editingDoctor.qualifications,
                          hospital: editingDoctor.hospital,
                          gender: editingDoctor.gender,
                          age: editingDoctor.age,
                        };

                        if (isNewUploadValue(editingDoctor.profilePicture)) {
                          updatePayload.profilePicture =
                            editingDoctor.profilePicture;
                          if (editingDoctor.profilePictureFileName) {
                            updatePayload.profilePictureFileName =
                              editingDoctor.profilePictureFileName;
                          }
                        }

                        for (const { key, fileNameKey } of DOCTOR_DOCUMENT_FIELDS) {
                          if (documents[key]) {
                            updatePayload[key] = await fileToDataUrl(documents[key]);
                            updatePayload[fileNameKey] = documents[key].name;
                          }
                        }

                        await userService.update(editingDoctor.id, updatePayload);
                        await fetchDoctors();
                        setShowEditDoctorModal(false);
                        setEditingDoctor(null);
                        setDocuments(EMPTY_DOCUMENTS);
                        setDocumentPreviews(EMPTY_DOCUMENTS);
                        setShowEditPassword(false);
                        Swal.fire({
                          title: "Updated!",
                          text: "Doctor information has been updated successfully.",
                          icon: "success",
                          confirmButtonColor: "#2563EB",
                        });
                      } catch (error) {
                        console.error("Error updating doctor:", error);
                        Swal.fire({
                          title: "Error!",
                          text:
                            error.response?.data?.message ||
                            error.response?.data?.error ||
                            error.message ||
                            "Failed to update doctor information.",
                          icon: "error",
                          confirmButtonColor: "#2563EB",
                        });
                      }
                    }}
                  >
                    Save Changes
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
