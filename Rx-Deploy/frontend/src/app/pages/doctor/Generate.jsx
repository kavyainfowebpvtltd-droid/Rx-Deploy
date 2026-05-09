import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { motion } from "motion/react";
import { FileText, Download, Eye, Send, Save, Loader2 } from "lucide-react";
import { Navbar } from "../../components/Navbar";
import { Footer } from "../../components/Footer";
import pdfMake from "pdfmake/build/pdfmake";
import "pdfmake/build/vfs_fonts";
import logoImage from "@/assets/logo-b.png";
import Swal from "sweetalert2";
import { API_BASE_URL, buildBackendFileUrl } from "@/config/api.js";
import { getToken } from "@/services/api.js";
import { formatReportId } from "@/app/utils/reportId.js";

// Convert image to base64 for pdfmake - NO compression for crisp logo
const getLogoBase64 = (maxWidth = 360, maxHeight = 100, quality = 1.0) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        
        // Use original dimensions - no scaling for crisp quality
        let width = img.width;
        let height = img.height;
        
        // Only scale down if significantly larger than max dimensions
        if (width > maxWidth * 2 || height > maxHeight * 2) {
          const ratio = Math.min(maxWidth * 2 / width, maxHeight * 2 / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Set transparent background
        ctx.clearRect(0, 0, width, height);
        
        // Use high-quality image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Use PNG format to preserve transparency with NO compression
        const dataURL = canvas.toDataURL('image/png', quality);
        console.log('Logo converted to base64 successfully, size:', dataURL.length);
        resolve(dataURL);
      } catch (canvasError) {
        console.error('Canvas error:', canvasError);
        reject(canvasError);
      }
    };
    img.onerror = (err) => {
      console.error('Image load error:', err);
      reject(err);
    };
    img.src = logoImage;
  });
};

const DOCUMENT_CATEGORY_LABELS = {
  scan: "Scan / X-Ray / MRI / CT",
  bloodTest: "Blood Test Reports",
  urineTest: "Urine Test Reports",
  sonography: "Sonography / Ultrasound",
  doctorConclusion: "Doctor's Conclusion / Opinion",
  prescription: "Prescription",
  BILL: "Bill",
  OTHER: "Other Document",
};

const getDocumentCategoryLabel = (category) =>
  DOCUMENT_CATEGORY_LABELS[category] || category || "Document";

const NORMALIZED_GENDER_LABELS = {
  male: "Male",
  female: "Female",
  other: "Other",
};

const PDF_FILE_NAME = "second opinion report.pdf";
const PDF_TITLE = "Second Opinion Report";

const OPTIONAL_TEXT_PATTERN = /^[a-zA-Z0-9\s\n]*$/;
const MEDICAL_TEXTAREA_MAX_LENGTH = 20000;
const MEDICINE_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9\s]*$/;
const MEDICINE_FIELD_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9\s]*$/;

const normalizeGenderValue = (value) => {
  const normalizedKey = String(value || "").trim().toLowerCase();
  return NORMALIZED_GENDER_LABELS[normalizedKey] || (value ? String(value).trim() : "");
};

const sanitizeSingleLineAlphaNumeric = (value) =>
  String(value || "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s{2,}/g, " ")
    .trimStart();

const sanitizeMultiLineAlphaNumeric = (value) =>
  String(value || "")
    .replace(/[^a-zA-Z0-9\s\n]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n");

const validateOptionalTextField = (label, value, { minLength = 3, maxLength = MEDICAL_TEXTAREA_MAX_LENGTH } = {}) => {
  const trimmedValue = String(value || "").trim();

  if (!trimmedValue) {
    return "";
  }

  if (trimmedValue.length < minLength) {
    return `${label} must be at least ${minLength} characters when provided.`;
  }

  if (trimmedValue.length > maxLength) {
    return `${label} must be ${maxLength} characters or fewer.`;
  }

  if (!OPTIONAL_TEXT_PATTERN.test(trimmedValue)) {
    return `${label} contains invalid characters.`;
  }

  return "";
};

const isMedicineEntryBlank = (medicine = {}) =>
  !medicine.name?.trim() &&
  !medicine.form?.trim() &&
  !medicine.strength?.trim() &&
  !medicine.frequency?.trim() &&
  !medicine.duration?.trim();

const validateMedicineEntry = (medicine = {}) => {
  const errors = {};
  const name = medicine.name?.trim() || "";
  const form = medicine.form?.trim() || "";
  const strength = medicine.strength?.trim() || "";
  const frequency = medicine.frequency?.trim() || "";
  const duration = medicine.duration?.trim() || "";

  if (isMedicineEntryBlank(medicine)) {
    return errors;
  }

  if (!name) {
    errors.name = "Medicine name is required when adding a prescription entry.";
  } else if (name.length < 2 || name.length > 120 || !MEDICINE_NAME_PATTERN.test(name)) {
    errors.name = "Enter a valid medicine name using letters, numbers, and spaces only.";
  }

  if (form && (form.length > 50 || !MEDICINE_FIELD_PATTERN.test(form))) {
    errors.form = "Drug form can contain only letters, numbers, and spaces.";
  }

  if (strength && (strength.length > 50 || !MEDICINE_FIELD_PATTERN.test(strength))) {
    errors.strength = "Strength can contain only letters, numbers, and spaces.";
  }

  if (frequency && (frequency.length > 80 || !MEDICINE_FIELD_PATTERN.test(frequency))) {
    errors.frequency = "Frequency can contain only letters, numbers, and spaces.";
  }

  if (duration && (duration.length > 50 || !MEDICINE_FIELD_PATTERN.test(duration))) {
    errors.duration = "Duration can contain only letters, numbers, and spaces.";
  }

  return errors;
};

const buildAuthenticatedRequestOptions = (options = {}) => {
  const token = getToken();

  return {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
};

const openDocumentInNewTab = (documentUrl) => {
  const resolvedUrl = buildBackendFileUrl(documentUrl);

  if (!resolvedUrl) {
    throw new Error("Document URL is missing.");
  }

  const link = document.createElement("a");
  link.href = resolvedUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// const openAuthenticatedDocument = async (documentId, fallbackUrl = "") => {
//   if (fallbackUrl && fallbackUrl !== "#") {
//     openDocumentInNewTab(fallbackUrl);
//     return;
//   }

const openAuthenticatedDocument = async (documentId, fallbackUrl = "") => {
  if (!documentId && fallbackUrl && fallbackUrl !== "#") {
    openDocumentInNewTab(fallbackUrl);
    return;
  }

  if (!documentId) {
    throw new Error("Document ID is missing.");
  }

  const previewTab = window.open("about:blank", "_blank");

  if (!previewTab) {
    throw new Error("Please allow pop-ups to view this document.");
  }

  const response = await fetch(
    `${API_BASE_URL}/documents/${documentId}/view`,
    buildAuthenticatedRequestOptions(),
  );

  if (!response.ok) {
    previewTab.close();
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || "Failed to open document");
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  previewTab.location.href = objectUrl;

  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60000);
};

// Build medicines content for PDF (shared between generatePDF and generatePDFBase64)
const buildMedicinesContent = (medicines) => {
  const medicinesContent = medicines
    .filter(med => med.name)
    .map((med, i) => {
      const medBlock = {
        unbreakable: true,
        stack: []
      };
      
      // Medicine name
      medBlock.stack.push({
        text: `${i + 1}. ${med.name.toUpperCase()}`,
        bold: true,
        fontSize: 12,
        margin: [0, 8, 0, 3]
      });

      // Strength and Frequency line
      if (med.strength || med.frequency) {
        const strengthFreqText = [];
        if (med.strength) {
          strengthFreqText.push(
            { text: 'Strength: ', bold: true, fontSize: 10 },
            { text: (med.strength.includes('mg') ? med.strength : med.strength + ' mg') + '    ', fontSize: 10 }
          );
        }
        if (med.frequency) {
          strengthFreqText.push(
            { text: 'Frequency: ', bold: true, fontSize: 10 },
            { text: med.frequency, fontSize: 10 }
          );
        }
        medBlock.stack.push({ text: strengthFreqText, margin: [0, 0, 0, 0] });
      }

      // Duration and Form line
      if (med.duration || med.form) {
        const durFormText = [];
        if (med.duration) {
          durFormText.push(
            { text: 'Duration: ', bold: true, fontSize: 10 },
            { text: (med.duration.includes('days') ? med.duration : med.duration + ' days') + '    ', fontSize: 10 }
          );
        }
        if (med.form) {
          durFormText.push(
            { text: 'Form: ', bold: true, fontSize: 10 },
            { text: med.form, fontSize: 10 }
          );
        }
        medBlock.stack.push({ text: durFormText, margin: [0, 0, 0, 0] });
      }

      // Description line
      if (med.description) {
        medBlock.stack.push({
          text: [
            { text: 'Description: ', bold: true, fontSize: 9 },
            { text: med.description, fontSize: 9 }
          ],
          margin: [0, 0, 0, 5]
        });
      }

      // Divider line after medicine
      medBlock.stack.push({
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 230, y2: 0, lineWidth: 0.2, color: '#B4B4B4' }],
        margin: [0, 5, 0, 5]
      });

      return medBlock;
    });

  // If no medicines, show dash
  if (medicinesContent.length === 0) {
    medicinesContent.push({ text: '-', margin: [0, 5, 0, 5] });
  }

  return medicinesContent;
};

// Build docDefinition for PDF (shared between generatePDF and generatePDFBase64)
const buildDocDefinition = (logoBase64, doctorInfo, patientData, formData, primaryColor, blackColor) => {
  const medicinesContent = buildMedicinesContent(formData.medicines);

  return {
    info: {
      title: PDF_TITLE,
      subject: PDF_TITLE,
    },
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    content: [
      // ========== HEADER SECTION ==========
      {
        columns: [
          {
            width: '20%',
            canvas: [{ type: 'line', x1: 0, y1: 10, x2: 40, y2: 10, lineWidth: 0.5, color: primaryColor }]
          },
          {
            width: '60%',
            stack: [
              logoBase64 ? {
                image: logoBase64,
                width: 180,
                height: 50,
                alignment: 'center'
              } : {
                text: 'rxincredible',
                fontSize: 38,
                bold: true,
                color: primaryColor,
                alignment: 'center'
              }
            ]
          },
          {
            width: '20%',
            canvas: [{ type: 'line', x1: 0, y1: 10, x2: 40, y2: 10, lineWidth: 0.5, color: primaryColor }]
          }
        ],
        margin: [0, 0, 0, 10]
      },

      // Doctor Name
      {
        text: (doctorInfo.name || 'Doctor Name').toUpperCase(),
        fontSize: 16,
        bold: true,
        alignment: 'center',
        color: blackColor,
        margin: [0, 0, 0, 5]
      },

      // Qualification
      {
        text: doctorInfo.qualification || '',
        fontSize: 10,
        alignment: 'center',
        color: blackColor,
        margin: [0, 0, 0, 3]
      },

      // Registration Number
      {
        text: doctorInfo.registrationNumber ? `Reg. No.: ${doctorInfo.registrationNumber}` : '',
        fontSize: 9,
        alignment: 'center',
        color: blackColor,
        margin: [0, 0, 0, 3]
      },

      // Address
      {
        text: doctorInfo.address || '',
        fontSize: 9,
        alignment: 'center',
        color: blackColor,
        margin: [0, 0, 0, 3]
      },

      // Contact
      {
        text: doctorInfo.contact ? `Ph: ${doctorInfo.contact}` : '',
        fontSize: 9,
        alignment: 'center',
        color: blackColor,
        margin: [0, 0, 0, 3]
      },

      // Email
      {
        text: doctorInfo.email || '',
        fontSize: 9,
        alignment: 'center',
        color: blackColor,
        margin: [0, 0, 0, 5]
      },

      // Header divider line
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.3, color: primaryColor }],
        margin: [0, 0, 0, 10]
      },

      // ========== PATIENT DETAILS SECTION ==========
      {
        columns: [
          {
            width: '50%',
            stack: [
              {
                columns: [
                  { text: 'Name of Patient:', fontSize: 9, width: 'auto' },
                  { text: formData.patientName || 'N/A', bold: true, fontSize: 10, width: 'auto' }
                ],
                margin: [0, 0, 0, 8]
              },
              {
                columns: [
                  { text: 'Date of Analysis:', fontSize: 9, width: 'auto' },
                  { text: formData.consultationDate || 'N/A', bold: true, fontSize: 10, width: 'auto' }
                ],
                margin: [0, 0, 0, 8]
              },
              {
                columns: [
                  { text: 'Address:', fontSize: 9, width: 'auto' },
                  { text: formData.address || 'N/A', bold: true, fontSize: 10, width: 'auto' }
                ],
                margin: [0, 0, 0, 8]
              }
            ]
          },
          {
            width: '50%',
            stack: [
              {
                columns: [
                  { text: 'Age:', fontSize: 9, width: 'auto' },
                  { text: formData.age || 'N/A', bold: true, fontSize: 10, width: 'auto' },
                  { text: 'Gender:', fontSize: 9, width: 'auto', margin: [20, 0, 0, 0] },
                  { text: formData.gender || 'N/A', bold: true, fontSize: 10, width: 'auto' }
                ],
                margin: [0, 0, 0, 8]
              },
              {
                columns: [
                  { text: 'Height:', fontSize: 9, width: 'auto' },
                  { text: formData.height || 'N/A', bold: true, fontSize: 10, width: 'auto' },
                  { text: 'Weight:', fontSize: 9, width: 'auto', margin: [20, 0, 0, 0] },
                  { text: formData.weight || 'N/A', bold: true, fontSize: 10, width: 'auto' }
                ],
                margin: [0, 0, 0, 8]
              }
            ]
          }
        ]
      },

      // Patient details divider
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.3, color: primaryColor }],
        margin: [0, 10, 0, 10]
      },

      // ========== MAIN BODY SECTION (Two Columns) ==========
      {
        columns: [
          // LEFT COLUMN
          {
            width: '50%',
            stack: [
              { text: 'CHIEF COMPLAINTS', bold: true, fontSize: 11, color: blackColor, margin: [0, 0, 0, 5] },
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 230, y2: 0, lineWidth: 0.3, color: primaryColor }], margin: [0, 0, 0, 5] },
              { text: formData.chiefComplaints || '-', fontSize: 10, margin: [0, 0, 0, 10] },

              { text: 'RELEVANT POINTS FROM HISTORY', bold: true, fontSize: 11, color: blackColor, margin: [0, 0, 0, 5] },
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 230, y2: 0, lineWidth: 0.3, color: primaryColor }], margin: [0, 0, 0, 5] },
              { text: formData.historyPoints || '-', fontSize: 10, margin: [0, 0, 0, 10] },

              { text: 'EXAMINATION / LAB FINDINGS', bold: true, fontSize: 11, color: blackColor, margin: [0, 0, 0, 5] },
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 230, y2: 0, lineWidth: 0.3, color: primaryColor }], margin: [0, 0, 0, 5] },
              { text: formData.examFindings || '-', fontSize: 10, margin: [0, 0, 0, 10] },

              { text: 'SUGGESTED INVESTIGATIONS', bold: true, fontSize: 11, color: blackColor, margin: [0, 0, 0, 5] },
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 230, y2: 0, lineWidth: 0.3, color: primaryColor }], margin: [0, 0, 0, 5] },
              { text: formData.investigations || '-', fontSize: 10, margin: [0, 0, 0, 10] }
            ]
          },

          // RIGHT COLUMN
          {
            width: '50%',
            stack: [
              { text: 'Rx', fontSize: 28, bold: true, color: primaryColor, margin: [0, 0, 0, 5] },
              ...medicinesContent
            ]
          }
        ],
        columnGap: 20
      },

      // ========== BOTTOM SECTION ==========
      // Footer divider
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.3, color: primaryColor }],
        margin: [0, 15, 0, 10]
      },

      // Special Instructions heading
      { text: 'SPECIAL INSTRUCTIONS', bold: true, fontSize: 11, color: blackColor, margin: [0, 0, 0, 5] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.3, color: primaryColor }], margin: [0, 0, 0, 5] },
      { text: formData.specialInstructions || '-', fontSize: 10, margin: [0, 0, 0, 15] },

      // Doctor Signature
      {
        columns: [
          { width: '50%', text: '' },
          {
            width: '50%',
            stack: [
              { text: 'Doctor Name', italics: true, fontSize: 10, alignment: 'right', margin: [0, 0, 0, 0] },
              { text: (doctorInfo.name || 'Doctor Name').toUpperCase(), bold: true, fontSize: 9, alignment: 'right', margin: [0, 5, 0, 0] }
            ]
          }
        ]
      },

      // Thank You message
      { text: 'Thank You!', italics: true, fontSize: 13, alignment: 'center', margin: [0, 20, 0, 0] }
    ],
    defaultStyle: {
      fontSize: 10,
      color: blackColor
    },
    pageBreakBefore: function(currentNode, followingNodesOnPage, nodesOnNextPage) {
      return currentNode.headlineLevel === 1 && followingNodesOnPage.length === 0 && nodesOnNextPage.length > 0;
    }
  };
};

export default function DoctorGenerate() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    console.log("Generate page loaded");
  }, []);
  
  const [consultationDate, setConsultationDate] = useState(new Date().toISOString().split('T')[0]);
  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [lmp, setLmp] = useState("");
  
  const [chiefComplaints, setChiefComplaints] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [historyPoints, setHistoryPoints] = useState("");
  const [examFindings, setExamFindings] = useState("");
  const [medicines, setMedicines] = useState([
    { name: "", form: "", strength: "", frequency: "", duration: "" }
  ]);
  const [investigations, setInvestigations] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [medicineErrors, setMedicineErrors] = useState([]);
  
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [doctorInfo, setDoctorInfo] = useState({
    name: "",
    qualification: "",
    registrationNumber: "",
    address: "",
    contact: "",
    email: ""
  });

  const [patientData, setPatientData] = useState({
    id: reportId,
    name: "",
    age: "",
    gender: "",
    uploadedDate: "",
    serviceType: "",
    documents: [],
  });

  const [originalServiceType, setOriginalServiceType] = useState("");
  const [loadingPatient, setLoadingPatient] = useState(true);
  const [errorPatient, setErrorPatient] = useState(null);

  useEffect(() => {
    const loadDoctorInfo = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/auth/me`,
          buildAuthenticatedRequestOptions(),
        );
        
        if (response.ok) {
          const user = await response.json();
          setDoctorInfo({
            id: user.id || null,
            name: user.fullName || user.name || "",
            qualification: user.qualifications || user.qualification || "",
            registrationNumber: user.licenseNumber || user.registrationNumber || user.regNumber || "",
            address: user.address || "",
            contact: user.phone || user.mobile || user.contact || "",
            email: user.email || "",
          });
        }
      } catch (e) {
        console.error("Error fetching doctor info:", e);
      }
    };
    
    loadDoctorInfo();
  }, [reportId]);

  useEffect(() => {
    const fetchPatientData = async () => {
      if (!reportId) return;
      
      setLoadingPatient(true);
      setErrorPatient(null);
      
      try {
        try {
          const medicalReportRes = await fetch(
            `${API_BASE_URL}/orders/${reportId}/medical-report`,
            buildAuthenticatedRequestOptions(),
          );
          
          if (medicalReportRes.ok) {
            const reportData = await medicalReportRes.json();
            
            if (reportData.diagnosis) setDiagnosis(reportData.diagnosis);
            if (reportData.recommendations) setInvestigations(reportData.recommendations);
            if (reportData.notes) setSpecialInstructions(reportData.notes);
            if (reportData.chiefComplaints) setChiefComplaints(reportData.chiefComplaints);
            if (reportData.historyPoints) setHistoryPoints(reportData.historyPoints);
            if (reportData.examFindings) setExamFindings(reportData.examFindings);
            if (reportData.consultationDate) setConsultationDate(new Date(reportData.consultationDate).toISOString().split('T')[0]);
            if (reportData.height) setHeight(reportData.height);
            if (reportData.weight) setWeight(reportData.weight);
            if (reportData.lmp) setLmp(reportData.lmp);
            
            if (reportData.prescriptionDetails) {
              const medLines = reportData.prescriptionDetails.split('\n').filter(line => line.trim());
              if (medLines.length > 0) {
                const parsedMeds = medLines.map(line => {
                  const parts = line.substring(line.indexOf('.') + 1).trim().split(/, */);
                  return {
                    name: parts[0] || '',
                    form: parts[1] || '',
                    strength: parts[2] || '',
                    frequency: parts[3] || '',
                    duration: parts[4] || ''
                  };
                });
                if (parsedMeds.length > 0) {
                  setMedicines(parsedMeds);
                }
              }
            }
          }
        } catch (reportError) {
          console.log("No existing medical report found");
        }
        
        const orderRes = await fetch(
          `${API_BASE_URL}/orders/${reportId}/details`,
          buildAuthenticatedRequestOptions(),
        );
        
        if (orderRes.ok) {
          const orderData = await orderRes.json();
          
          if (orderData.user) {
            setPatientName(orderData.user.fullName || "");
            setAge(orderData.user.age ? String(orderData.user.age) : "");
            setGender(normalizeGenderValue(orderData.user.gender));
            setAddress(orderData.user.address || "");
            if (orderData.user.height) setHeight(orderData.user.height);
            if (orderData.user.weight) setWeight(orderData.user.weight);
          }
          
          setPatientData(prev => ({
            ...prev,
            id: reportId,
            name: orderData.user?.fullName || "",
            age: orderData.user?.age || "",
            gender: normalizeGenderValue(orderData.user?.gender),
            uploadedDate: orderData.createdAt || new Date().toISOString(),
            serviceType: orderData.serviceType === 'PRESCRIPTION_ANALYSIS' ? 'Prescription Analysis' :
                        orderData.serviceType === 'ONLINE_PHARMACY' ? 'Online Pharmacy' :
                        orderData.serviceType === 'SECOND_OPINION' ? 'Second Opinion' : 'Order',
            orderNumber: orderData.orderNumber || "",
            userId: orderData.user?.id || null
          }));
          
          setOriginalServiceType(orderData.serviceType || "");
          
          const allowedServiceTypes = ['SECOND_OPINION'];
          if (orderData.serviceType && !allowedServiceTypes.includes(orderData.serviceType)) {
            Swal.fire({
              icon: 'warning',
              title: 'Access Denied',
              text: 'You can only process Second Opinion orders.',
              confirmButtonColor: '#2563EB',
              confirmButtonText: 'Go to Pending Reports'
            }).then(() => {
              navigate('/doctor/reports');
            });
            return;
          }
          
          let allDocs = [];
          const docsRes = await fetch(
            `${API_BASE_URL}/documents/order/${reportId}`,
            buildAuthenticatedRequestOptions(),
          );
          
          if (docsRes.ok) {
            const docsData = await docsRes.json();
            if (Array.isArray(docsData)) {
              allDocs = docsData;
            }
          }
          
          setPatientData(prev => ({
            ...prev,
            documents: allDocs.map(doc => ({
              id: doc.id,
              name: doc.originalFileName || doc.fileName || "Document",
              size: doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : "",
              url: doc.filePath || doc.downloadUrl || `#`,
              category: doc.category || "DOCUMENT",
              fileType: doc.fileType || "",
              description: doc.description || ""
            }))
          }));
        }
      } catch (error) {
        console.error("Error fetching patient data:", error);
        setErrorPatient(error.message || "Failed to load patient information");
      } finally {
        setLoadingPatient(false);
      }
    };
    
    fetchPatientData();
  }, [reportId]);

  const addMedicine = () => {
    setMedicines([...medicines, { name: "", form: "", strength: "", frequency: "", duration: "" }]);
    setMedicineErrors((prev) => [...prev, {}]);
  };

  const removeMedicine = (index) => {
    if (medicines.length > 1) {
      setMedicines(medicines.filter((_, i) => i !== index));
      setMedicineErrors((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const updateMedicine = (index, field, value) => {
    const updated = [...medicines];
    updated[index] = {
      ...updated[index],
      [field]: sanitizeSingleLineAlphaNumeric(value),
    };
    setMedicines(updated);
    setMedicineErrors((prev) => {
      const nextErrors = [...prev];
      if (nextErrors[index]?.[field]) {
        nextErrors[index] = {
          ...nextErrors[index],
          [field]: "",
        };
      }
      return nextErrors;
    });
  };

  const updateOptionalField = (field, setter, value) => {
    setter(sanitizeMultiLineAlphaNumeric(value));
    setFormErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }

      return {
        ...prev,
        [field]: "",
      };
    });
  };

  const validateReportForm = () => {
    const nextFormErrors = {};

    if (!consultationDate) {
      nextFormErrors.consultationDate = "Date of consultation is required.";
    }

    const chiefComplaintsError = validateOptionalTextField("Chief Complaints", chiefComplaints);
    if (chiefComplaintsError) nextFormErrors.chiefComplaints = chiefComplaintsError;

    const historyPointsError = validateOptionalTextField("Relevant Points from History", historyPoints);
    if (historyPointsError) nextFormErrors.historyPoints = historyPointsError;

    const examFindingsError = validateOptionalTextField("Examination / Lab Findings", examFindings);
    if (examFindingsError) nextFormErrors.examFindings = examFindingsError;

    const investigationsError = validateOptionalTextField("Suggested Investigations", investigations);
    if (investigationsError) nextFormErrors.investigations = investigationsError;

    const specialInstructionsError = validateOptionalTextField("Special Instructions", specialInstructions);
    if (specialInstructionsError) nextFormErrors.specialInstructions = specialInstructionsError;

    const nextMedicineErrors = medicines.map((medicine) => validateMedicineEntry(medicine));
    const hasMedicineErrors = nextMedicineErrors.some((entry) =>
      Object.values(entry).some(Boolean),
    );

    setFormErrors(nextFormErrors);
    setMedicineErrors(nextMedicineErrors);

    return {
      isValid: Object.keys(nextFormErrors).length === 0 && !hasMedicineErrors,
      nextMedicineErrors,
    };
  };
// Generate PDF and return as base64 for email attachment
  const generatePDFBase64 = async function (formDataOverride = null) {
    console.log('generatePDFBase64 called');
    try {
      // Get logo as base64 with timeout - don't let logo loading block PDF generation
      let logoBase64 = '';
      try {
        // Add timeout to prevent hanging - use high quality logo
        const logoPromise = getLogoBase64(360, 100, 1.0);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Logo loading timeout')), 3000)
        );
        logoBase64 = await Promise.race([logoPromise, timeoutPromise]);
        console.log('Logo loaded successfully for PDF');
      } catch (e) {
        console.log('Logo not loaded, using text fallback:', e.message);
        // Continue without logo - text fallback will be used
      }

      // Theme colors - Brand colors from logo/theme
      const primaryColor = '#1E3A8A';
      const blackColor = '#000000';

      // Use override data if provided (for email), otherwise use current state (for download)
      const formData = formDataOverride || {
        patientName,
        age,
        gender,
        address,
        consultationDate,
        chiefComplaints,
        diagnosis,
        historyPoints,
        examFindings,
        investigations,
        specialInstructions,
        height,
        weight,
        medicines
      };

      // Build docDefinition using shared function
      const docDefinition = buildDocDefinition(logoBase64, doctorInfo, patientData, formData, primaryColor, blackColor);

      return new Promise((resolve, reject) => {
        console.log('Creating PDF document...');
        try {
          const pdfDoc = pdfMake.createPdf(docDefinition);
          console.log('Getting blob from PDF...');
          
          // Add timeout to prevent hanging - 30 seconds for PDF generation
          const timeoutId = setTimeout(() => {
            console.error('PDF generation timeout - took too long');
            reject(new Error('PDF generation timeout - took too long'));
          }, 30000);
          
          // Use getBlob which returns a Promise - more reliable than callback-based getBuffer
          pdfDoc.getBlob().then((blob) => {
            clearTimeout(timeoutId);
            try {
              if (!blob) {
                console.error('PDF blob is empty or null');
                reject(new Error('PDF generation failed - empty result'));
                return;
              }
              
              // Convert blob to base64
              const reader = new FileReader();
              reader.onloadend = () => {
                try {
                  const base64 = reader.result.split(',')[1];
                  console.log('PDF base64 generated successfully, length:', base64.length);
                  resolve(base64);
                } catch (conversionError) {
                  console.error('Error converting blob to base64:', conversionError);
                  reject(new Error('PDF conversion failed: ' + conversionError.message));
                }
              };
              reader.onerror = (readerError) => {
                console.error('FileReader error:', readerError);
                reject(new Error('PDF conversion failed: FileReader error'));
              };
              reader.readAsDataURL(blob);
            } catch (conversionError) {
              console.error('Error processing blob:', conversionError);
              reject(new Error('PDF conversion failed: ' + conversionError.message));
            }
          }).catch((blobError) => {
            clearTimeout(timeoutId);
            console.error('Error getting blob from PDF:', blobError);
            reject(new Error('PDF blob generation failed: ' + blobError.message));
          });
        } catch (pdfError) {
          console.error('Error during PDF creation:', pdfError);
          reject(new Error('PDF creation failed: ' + pdfError.message));
        }
      });
    } catch (e) {
      console.error('Error in generatePDFBase64:', e);
      throw e;
    }
  };

  // Generate PDF and download
  const generatePDF = async function() {
    console.log('Generate PDF button clicked');
    console.log('Current state:', { patientName, age, gender, address, consultationDate, chiefComplaints, diagnosis, historyPoints, examFindings, investigations, specialInstructions, medicines });
    
    try {
      // Get logo as base64 - don't let logo loading block PDF generation
      let logoBase64 = '';
      try {
        const logoPromise = getLogoBase64(360, 100, 1.0);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Logo loading timeout')), 3000)
        );
        logoBase64 = await Promise.race([logoPromise, timeoutPromise]);
        console.log('Logo loaded successfully for PDF download');
      } catch (e) {
        console.log('Logo not loaded, using text fallback:', e.message);
        // Continue without logo - text fallback will be used
      }

      // Theme colors - Brand colors from logo/theme
      const primaryColor = '#1E3A8A';
      const blackColor = '#000000';

      // Prepare form data for docDefinition
      const formData = {
        patientName,
        age,
        gender,
        address,
        consultationDate,
        chiefComplaints,
        diagnosis,
        historyPoints,
        examFindings,
        investigations,
        specialInstructions,
        height,
        weight,
        medicines
      };

      // Build docDefinition using shared function
      const docDefinition = buildDocDefinition(logoBase64, doctorInfo, patientData, formData, primaryColor, blackColor);

      console.log('Creating PDF document...');
      // Use pdfmake's built-in download method
      try {
        const startTime = Date.now();
        const pdfDoc = pdfMake.createPdf(docDefinition);
        const fileName = PDF_FILE_NAME;
        console.log('Downloading PDF as:', fileName);
        
        // Use download method for direct download - this is synchronous and doesn't need timeout
        pdfDoc.download(fileName);
        const endTime = Date.now();
        console.log(`PDF download initiated successfully in ${endTime - startTime}ms`);
      } catch (pdfError) {
        console.error('Error during PDF creation/download:', pdfError);
        console.error('PDF error stack:', pdfError.stack);
        throw new Error('PDF creation failed: ' + pdfError.message);
      }
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      console.error("Error stack:", error.stack);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error generating PDF: ' + error.message,
        confirmButtonColor: '#2563EB'
      });
    }
  };

  // Generate PDF and send email as part of submit flow
  const processBackgroundTasks = async (reportId, prescriptionEmailRequest, medicinesForEmail) => {
    console.log('Submit follow-up tasks started for report:', reportId);
    
    // Keep a very short delay so UI stays responsive, but don't postpone email by 30 seconds
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      console.log('Starting background PDF generation for report:', reportId);
      const startTime = Date.now();
      
      // Create form data from prescriptionEmailRequest to ensure email PDF matches downloaded PDF
      const formDataForEmail = {
        patientName: prescriptionEmailRequest.patientName,
        age: prescriptionEmailRequest.age,
        gender: prescriptionEmailRequest.gender,
        address: prescriptionEmailRequest.address,
        consultationDate: prescriptionEmailRequest.consultationDate,
        chiefComplaints: prescriptionEmailRequest.chiefComplaints,
        diagnosis: prescriptionEmailRequest.diagnosis,
        historyPoints: prescriptionEmailRequest.historyPoints,
        examFindings: prescriptionEmailRequest.examFindings,
        investigations: prescriptionEmailRequest.investigations,
        specialInstructions: prescriptionEmailRequest.specialInstructions,
        height: prescriptionEmailRequest.height || '',
        weight: prescriptionEmailRequest.weight || '',
        medicines: medicinesForEmail  // Use medicines array passed from handleSubmit
      };
      
      const pdfBase64 = await generatePDFBase64(formDataForEmail);
      const endTime = Date.now();
      console.log(`Background PDF generated successfully in ${endTime - startTime}ms for report:`, reportId);
      
      // Send email with PDF
      console.log('Sending email with PDF for report:', reportId);
      const emailResponse = await fetch(
        `${API_BASE_URL}/orders/${reportId}/send-prescription-email`,
        buildAuthenticatedRequestOptions({
          method: "POST",
          body: JSON.stringify({ ...prescriptionEmailRequest, pdfBase64 }),
        }),
      );
      
      if (!emailResponse.ok) {
        const errorData = await emailResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Email sending failed');
      }
      
      console.log('Submit email sent successfully for report:', reportId);
    } catch (error) {
      console.error('Submit follow-up tasks failed for report:', reportId, error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('handleSubmit called - starting submission');

    const validationResult = validateReportForm();
    if (!validationResult.isValid) {
      Swal.fire({
        icon: 'warning',
        title: 'Check Form Details',
        text: 'Please correct the highlighted fields. Patient information is read-only and comes from the patient profile.',
        confirmButtonColor: '#2563EB'
      });
      return;
    }

    setSubmitting(true);
    
    try {
      if (!reportId) {
        throw new Error("No order ID available");
      }
      
      const medicinesText = medicines
        .filter(m => m.name)
        .map((m, i) => `${i + 1}. ${m.name.toUpperCase()}${m.form ? ', ' + m.form : ''}${m.strength ? ', ' + m.strength : ''}${m.frequency ? ', ' + m.frequency : ''}${m.duration ? ', ' + m.duration : ''}`)
        .join('\n');
      
      const medicalReportRequest = {
        diagnosis: diagnosis,
        recommendations: investigations,
        prescriptionDetails: medicinesText,
        notes: specialInstructions,
        chiefComplaints: chiefComplaints,
        historyPoints: historyPoints,
        examFindings: examFindings,
        consultationDate: consultationDate,
        height: height,
        weight: weight,
        lmp: lmp
      };
      
      // Save medical report
      const saveResponse = await fetch(
        `${API_BASE_URL}/orders/${reportId}/medical-report?doctorId=${doctorInfo.id || 0}`,
        buildAuthenticatedRequestOptions({
          method: "POST",
          body: JSON.stringify(medicalReportRequest),
        }),
      );
      
      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        throw new Error(errorData.message || "Failed to save prescription data");
      }
      
      // Update order status immediately
      console.log('Updating order status...');
      const statusResponse = await fetch(
        `${API_BASE_URL}/orders/${reportId}`,
        buildAuthenticatedRequestOptions({
          method: "PUT",
          body: JSON.stringify({
            status: "COMPLETED",
            medicalReportStatus: "COMPLETED"
          }),
        }),
      );
      
      if (!statusResponse.ok) {
        const errorData = await statusResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Status update failed');
      }
      
      console.log('Order status updated successfully');
      
      // Prepare email request data for background processing
      const prescriptionEmailRequest = {
        patientName: patientName,
        age: age,
        gender: gender,
        address: address,
        consultationDate: consultationDate,
        height: height,
        weight: weight,
        chiefComplaints: chiefComplaints,
        diagnosis: diagnosis,
        historyPoints: historyPoints,
        examFindings: examFindings,
        medicines: medicinesText,
        investigations: investigations,
        specialInstructions: specialInstructions,
        doctorId: doctorInfo.id || 0,
        doctorName: doctorInfo.name,
        doctorQualification: doctorInfo.qualification,
        doctorRegistrationNumber: doctorInfo.registrationNumber,
        doctorAddress: doctorInfo.address,
        doctorContact: doctorInfo.contact,
        doctorEmail: doctorInfo.email
      };
      
      // Also trigger PDF download immediately
      try {
        console.log('Triggering PDF download on submit...');
        await generatePDF();
        console.log('PDF download initiated successfully');
      } catch (pdfError) {
        console.error('Error downloading PDF on submit:', pdfError);
        // Don't block submission if PDF download fails
      }
      
      // Email must succeed before showing success to the user
      await processBackgroundTasks(reportId, prescriptionEmailRequest, medicines);

      Swal.fire({
        icon: 'success',
        title: 'Submitted Successfully!',
        text: 'Prescription has been saved and the email with PDF attachment has been sent successfully.',
        confirmButtonColor: '#2563EB',
        timer: 2000,
        timerProgressBar: true,
        didClose: () => {
          navigate("/doctor/history");
        }
      });
      
    } catch (error) {
      console.error("Error submitting prescription:", error);
      console.error("Error stack:", error.stack);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to submit prescription: ' + error.message,
        confirmButtonColor: '#2563EB'
      });
    } finally {
      // Always reset submitting state
      console.log('Finally block - resetting submitting state');
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!reportId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No order ID available',
        confirmButtonColor: '#2563EB'
      });
      return;
    }
    
    const validationResult = validateReportForm();
    if (!validationResult.isValid) {
      Swal.fire({
        icon: 'warning',
        title: 'Check Form Details',
        text: 'Please correct the highlighted fields before saving the draft.',
        confirmButtonColor: '#2563EB'
      });
      return;
    }

    setSavingDraft(true);
    
    try {
      const medicinesText = medicines
        .filter(m => m.name)
        .map((m, i) => `${i + 1}. ${m.name.toUpperCase()}${m.form ? ', ' + m.form : ''}${m.strength ? ', ' + m.strength : ''}${m.frequency ? ', ' + m.frequency : ''}${m.duration ? ', ' + m.duration : ''}`)
        .join('\n');
      
      const medicalReportRequest = {
        diagnosis: diagnosis,
        recommendations: investigations,
        prescriptionDetails: medicinesText,
        notes: specialInstructions,
        chiefComplaints: chiefComplaints,
        historyPoints: historyPoints,
        examFindings: examFindings,
        consultationDate: consultationDate,
        height: height,
        weight: weight,
        lmp: lmp
      };
      
      const response = await fetch(
        `${API_BASE_URL}/orders/${reportId}/medical-report/draft?doctorId=${doctorInfo.id || 0}`,
        buildAuthenticatedRequestOptions({
          method: "POST",
          body: JSON.stringify(medicalReportRequest),
        }),
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save draft");
      }
      
      setSavingDraft(false);
      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Draft saved successfully!',
        confirmButtonColor: '#2563EB',
        timer: 2000,
        timerProgressBar: true
      });
    } catch (error) {
      console.error("Error saving draft:", error);
      setSavingDraft(false);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to save draft: ' + error.message,
        confirmButtonColor: '#2563EB'
      });
    }
  };

  const handleSendEmail = async () => {
    if (!reportId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No order ID available',
        confirmButtonColor: '#2563EB'
      });
      return;
    }
    
    setSendingEmail(true);
    
    try {
      const medicinesText = medicines
        .filter(m => m.name)
        .map((m, i) => `${i + 1}. ${m.name.toUpperCase()}${m.form ? ', ' + m.form : ''}${m.strength ? ', ' + m.strength : ''}${m.frequency ? ', ' + m.frequency : ''}${m.duration ? ', ' + m.duration : ''}`)
        .join('\n');
      
      // Generate PDF as base64
      const formDataForEmail = {
        patientName,
        age,
        gender,
        address,
        consultationDate,
        chiefComplaints,
        diagnosis,
        historyPoints,
        examFindings,
        investigations,
        specialInstructions,
        height,
        weight,
        medicines
      };
      
      console.log('Generating PDF for email...');
      const pdfBase64 = await generatePDFBase64(formDataForEmail);
      console.log('PDF generated successfully, sending email...');
      
      // Prepare email request
      const prescriptionEmailRequest = {
        patientName: patientName,
        age: age,
        gender: gender,
        address: address,
        consultationDate: consultationDate,
        height: height,
        weight: weight,
        chiefComplaints: chiefComplaints,
        diagnosis: diagnosis,
        historyPoints: historyPoints,
        examFindings: examFindings,
        medicines: medicinesText,
        investigations: investigations,
        specialInstructions: specialInstructions,
        doctorId: doctorInfo.id || 0,
        doctorName: doctorInfo.name,
        doctorQualification: doctorInfo.qualification,
        doctorRegistrationNumber: doctorInfo.registrationNumber,
        doctorAddress: doctorInfo.address,
        doctorContact: doctorInfo.contact,
        doctorEmail: doctorInfo.email,
        pdfBase64: pdfBase64
      };
      
      // Send email with PDF
      const emailResponse = await fetch(
        `${API_BASE_URL}/orders/${reportId}/send-prescription-email`,
        buildAuthenticatedRequestOptions({
          method: "POST",
          body: JSON.stringify(prescriptionEmailRequest),
        }),
      );
      
      if (!emailResponse.ok) {
        const errorData = await emailResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Email sending failed');
      }
      
      setSendingEmail(false);
      Swal.fire({
        icon: 'success',
        title: 'Email Sent!',
        text: 'Prescription PDF has been sent to the patient via email.',
        confirmButtonColor: '#2563EB',
        timer: 2000,
        timerProgressBar: true
      });
    } catch (error) {
      console.error("Error sending email:", error);
      setSendingEmail(false);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to send email: ' + error.message,
        confirmButtonColor: '#2563EB'
      });
    }
  };

  return (
    <>
      <Navbar role="doctor" />
      
      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <h1 className="text-3xl sm:text-4xl text-[#1E3A8A] mb-4">Generate Medical Report</h1>
            <p className="text-xl text-gray-600">
              Report ID: {formatReportId(reportId)}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 sm:gap-8">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-1 space-y-6"
            >
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl text-[#1E3A8A] mb-4">Current Patient</h3>
                {loadingPatient ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
                    <span className="ml-2 text-gray-500">Loading...</span>
                  </div>
                ) : errorPatient ? (
                  <div className="text-red-500 text-sm py-2">{errorPatient}</div>
                ) : (
                  <div className="space-y-3 text-gray-700">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span>{patientData.name || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Age:</span>
                      <span>{patientData.age || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gender:</span>
                      <span>{patientData.gender || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service:</span>
                      <span className="text-sm">{patientData.serviceType || "N/A"}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl text-[#1E3A8A] mb-4">Uploaded Documents</h3>
                {loadingPatient ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
                  </div>
                ) : patientData.documents && patientData.documents.length > 0 ? (
                  <div className="space-y-3">
                    {patientData.documents.map((doc, index) => (
                      <motion.div
                        key={doc.id || index}
                        whileHover={{ scale: 1.02 }}
                        className="flex items-center justify-between gap-3 p-3 bg-[#F1F5F9] rounded-xl cursor-pointer hover:bg-blue-50"
                        onClick={async () => {
                          try {
                            // if (doc.url && doc.url !== '#') {
                            //   openDocumentInNewTab(doc.url);
                            // } else if (doc.id) {
                            //   await openAuthenticatedDocument(doc.id, doc.url);
                            // }

                            if(doc.id){
                              await openAuthenticatedDocument(doc.id, doc.url);
                            } else if (doc.url && doc.url !== '#') {
                              openDocumentInNewTab(doc.url);
                            }

                          } catch (error) {
                            Swal.fire({
                              icon: "error",
                              title: "Access Denied",
                              text: error.message || "Unable to open this document.",
                              confirmButtonColor: "#2563EB",
                            });
                          }
                        }}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <FileText className="w-5 h-5 shrink-0 text-[#2563EB]" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-[#2563EB]">
                              {getDocumentCategoryLabel(doc.category)}
                            </p>
                            <p className="break-all text-gray-700 text-sm">{doc.name}</p>
                            <p className="break-words text-xs text-gray-500">
                              {doc.fileType && <span>{doc.fileType.toUpperCase()}</span>}
                              {doc.fileType && doc.size && <span> • </span>}
                              {doc.size && <span>{doc.size}</span>}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label={`View ${doc.name}`}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#2563EB] transition-colors hover:bg-white"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 text-sm">No documents uploaded</p>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="lg:col-span-3"
            >
              <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="border-b border-gray-200 pb-6">
                    <h3 className="text-xl text-[#1E3A8A] mb-4">Patient Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-700 mb-2">Date of Consultation</label>
                        <input
                          type="date"
                          value={consultationDate}
                          onChange={(e) => setConsultationDate(e.target.value)}
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] ${
                            formErrors.consultationDate ? "border-red-300 bg-red-50" : "border-gray-300"
                          }`}
                          required
                        />
                        {formErrors.consultationDate && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.consultationDate}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-gray-700 mb-2">Name of Patient</label>
                        <input
                          type="text"
                          value={patientName}
                          readOnly
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-gray-700 mb-2">Age</label>
                        <input
                          type="text"
                          value={age}
                          readOnly
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-gray-700 mb-2">Gender</label>
                        <input
                          type="text"
                          value={gender}
                          readOnly
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700"
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-gray-700 mb-2">Address</label>
                        <textarea
                          value={address}
                          rows={2}
                          readOnly
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700 resize-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-gray-700 mb-2">Height (optional)</label>
                        <input
                          type="text"
                          value={height}
                          readOnly
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-gray-700 mb-2">Weight (optional)</label>
                        <input
                          type="text"
                          value={weight}
                          readOnly
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700"
                        />
                      </div>
                      
                      {gender === 'Female' && (
                        <div>
                          <label className="block text-gray-700 mb-2">LMP (optional)</label>
                          <input
                            type="text"
                            value={lmp}
                            readOnly
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-b border-gray-200 pb-6">
                    <h3 className="text-xl text-[#1E3A8A] mb-4">Medical Information</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-700 mb-2">Chief Complaints</label>
                        <textarea
                          value={chiefComplaints}
                          onChange={(e) => updateOptionalField("chiefComplaints", setChiefComplaints, e.target.value)}
                          placeholder="Enter chief complaints..."
                          rows={3}
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] resize-none ${
                            formErrors.chiefComplaints ? "border-red-300 bg-red-50" : "border-gray-300"
                          }`}
                        />
                        {formErrors.chiefComplaints && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.chiefComplaints}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-gray-700 mb-2">Relevant Points from History</label>
                        <textarea
                          value={historyPoints}
                          onChange={(e) => updateOptionalField("historyPoints", setHistoryPoints, e.target.value)}
                          placeholder="Enter relevant history..."
                          rows={3}
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] resize-none ${
                            formErrors.historyPoints ? "border-red-300 bg-red-50" : "border-gray-300"
                          }`}
                        />
                        {formErrors.historyPoints && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.historyPoints}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-gray-700 mb-2">Examination / Lab Findings</label>
                        <textarea
                          value={examFindings}
                          onChange={(e) => updateOptionalField("examFindings", setExamFindings, e.target.value)}
                          placeholder="Enter examination and lab findings..."
                          rows={3}
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] resize-none ${
                            formErrors.examFindings ? "border-red-300 bg-red-50" : "border-gray-300"
                          }`}
                        />
                        {formErrors.examFindings && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.examFindings}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-b border-gray-200 pb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl text-[#1E3A8A]">Prescription (Medicines)</h3>
                      <button
                        type="button"
                        onClick={addMedicine}
                        className="px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1E3A8A]"
                      >
                        + Add Medicine
                      </button>
                    </div>
                    
                    {medicines.map((med, index) => (
                      <div key={index} className="mb-4 p-4 bg-gray-50 rounded-xl">
                        {(() => {
                          const currentMedicineErrors = medicineErrors[index] || {};
                          const medicineInputClass = (field) =>
                            `w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#2563EB] ${
                              currentMedicineErrors[field] ? "border-red-300 bg-red-50" : "border-gray-300"
                            }`;

                          return (
                            <>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[#1E3A8A]">Medicine {index + 1}</span>
                          {medicines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeMedicine(index)}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="md:col-span-2">
                            <input
                              type="text"
                              value={med.name}
                              onChange={(e) => updateMedicine(index, 'name', e.target.value)}
                              placeholder="Medicine Name"
                              className={medicineInputClass("name")}
                            />
                            {currentMedicineErrors.name && (
                              <p className="mt-1 text-sm text-red-600">{currentMedicineErrors.name}</p>
                            )}
                          </div>
                          
                          <div>
                            <input
                              type="text"
                              value={med.form}
                              onChange={(e) => updateMedicine(index, 'form', e.target.value)}
                              placeholder="Drug form e.g tablet"
                              className={medicineInputClass("form")}
                            />
                            {currentMedicineErrors.form && (
                              <p className="mt-1 text-sm text-red-600">{currentMedicineErrors.form}</p>
                            )}
                          </div>
                          
                          <div>
                            <input
                              type="text"
                              value={med.strength}
                              onChange={(e) => updateMedicine(index, 'strength', e.target.value)}
                              placeholder="Strength e.g 500 mg"
                              className={medicineInputClass("strength")}
                            />
                            {currentMedicineErrors.strength && (
                              <p className="mt-1 text-sm text-red-600">{currentMedicineErrors.strength}</p>
                            )}
                          </div>
                          
                          <div>
                            <input
                              type="text"
                              value={med.frequency}
                              onChange={(e) => updateMedicine(index, 'frequency', e.target.value)}
                              placeholder="Frequency e.g twice daily"
                              className={medicineInputClass("frequency")}
                            />
                            {currentMedicineErrors.frequency && (
                              <p className="mt-1 text-sm text-red-600">{currentMedicineErrors.frequency}</p>
                            )}
                          </div>
                          
                          <div>
                            <input
                              type="text"
                              value={med.duration}
                              onChange={(e) => updateMedicine(index, 'duration', e.target.value)}
                              placeholder="Duration e.g 7 days"
                              className={medicineInputClass("duration")}
                            />
                            {currentMedicineErrors.duration && (
                              <p className="mt-1 text-sm text-red-600">{currentMedicineErrors.duration}</p>
                            )}
                          </div>
                        </div>
                            </>
                          );
                        })()}
                      </div>
                    ))}
                  </div>

                  <div>
                    <h3 className="text-xl text-[#1E3A8A] mb-4">Additional Information</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-700 mb-2">Suggested Investigations</label>
                        <textarea
                          value={investigations}
                          onChange={(e) => updateOptionalField("investigations", setInvestigations, e.target.value)}
                          placeholder="Enter suggested investigations..."
                          rows={3}
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] resize-none ${
                            formErrors.investigations ? "border-red-300 bg-red-50" : "border-gray-300"
                          }`}
                        />
                        {formErrors.investigations && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.investigations}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-gray-700 mb-2">Special Instructions</label>
                        <textarea
                          value={specialInstructions}
                          onChange={(e) => updateOptionalField("specialInstructions", setSpecialInstructions, e.target.value)}
                          placeholder="Enter special instructions..."
                          rows={3}
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] resize-none ${
                            formErrors.specialInstructions ? "border-red-300 bg-red-50" : "border-gray-300"
                          }`}
                        />
                        {formErrors.specialInstructions && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.specialInstructions}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-4 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white rounded-xl hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Submit
                        </>
                      )}
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={savingDraft}
                      className="px-5 sm:px-5 sm:px-8 py-3 sm:py-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {savingDraft ? (
                        <>
                          <div className="w-5 h-5 border-2 border-gray-700 border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Save Draft
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}


