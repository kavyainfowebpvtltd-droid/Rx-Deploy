 import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  Upload,
  Download,
  FileText,
  X,
  CheckCircle,
  Stethoscope,
  Pill,
  Activity,
  ShoppingCart,
  Scan,
  Droplets,
  FlaskConical,
  User,
  FilePlus,
  Heart,
  Eye,
  FileImage,
  File,
  MapPin,
} from "lucide-react";
import { Navbar } from "../../components/Navbar.jsx";
import { Footer } from "../../components/Footer.jsx";
import { PhoneCountryPicker } from "../../components/PhoneCountryPicker.jsx";
import Swal from "sweetalert2";
import { documentAPI, authAPI, getStoredUser, getToken, removeToken } from "@/services/api.js";
import {
  formatPhoneForStorage,
  getPhoneCountry,
  sanitizePhoneInput,
  validatePhoneNumber,
} from "@/app/utils/phoneValidation.js";
import {
  getCountryLocationConfig,
} from "@/app/utils/locationValidation.js";
import {
  formatCurrencyAmount,
  getCombinedPricing,
  getServicePricing,
} from "@/app/utils/pricing.js";

// Document category types
const DOCUMENT_CATEGORIES = {
  scan: {
    id: "scan",
    name: "Scan / X-Ray / MRI / CT",
    icon: Scan,
    description: "Upload medical scans (X-Ray, MRI, CT, PET Scan, etc.)",
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  bloodTest: {
    id: "bloodTest",
    name: "Blood Test Reports",
    icon: Droplets,
    description: "Complete blood count, sugar profile, lipid profile, etc.",
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  urineTest: {
    id: "urineTest",
    name: "Urine Test Reports",
    icon: FlaskConical,
    description: "Urine analysis, culture reports, etc.",
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  sonography: {
    id: "sonography",
    name: "Sonography / Ultrasound",
    icon: Heart,
    description: "Ultrasound reports and images",
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  doctorConclusion: {
    id: "doctorConclusion",
    name: "Doctor's Conclusion / Opinion",
    icon: User,
    description: "Previous doctor diagnoses, opinions, or medical summaries",
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  prescription: {
    id: "prescription",
    name: "Prescription",
    icon: FilePlus,
    description: "Current prescriptions from your doctor",
    accept: ".pdf,.jpg,.jpeg,.png",
  },
};
const DELIVERY_ADDRESS_INITIAL_STATE = {
  address: "",
  city: "",
  state: "",
  pincode: "",
  countryCode: "IN",
  phone: "",
};

const DELIVERY_ADDRESS_ERROR_STATE = {
  address: "",
  city: "",
  state: "",
  pincode: "",
  phone: "",
};

export default function UserUpload() {
  const { serviceType } = useParams();
  const navigate = useNavigate();

  // Categorized file uploads
  const [categorizedFiles, setCategorizedFiles] = useState({
    scan: [],
    bloodTest: [],
    urineTest: [],
    sonography: [],
    doctorConclusion: [],
    prescription: [],
  });
  const [uploading, setUploading] = useState(false);
  const [briefHealthIssue, setBriefHealthIssue] = useState("");
  const [briefHealthIssueError, setBriefHealthIssueError] = useState("");
  const [step, setStep] = useState(1); // 1: Upload, 2: Select Services
  const [previewFile, setPreviewFile] = useState(null); // For document preview modal
  const [previewUrl, setPreviewUrl] = useState(null); // URL for preview content
  const [userCountry, setUserCountry] = useState("India");

  // Service selections
  const [selectedServices, setSelectedServices] = useState({
    prescriptionAnalysis: false,
    secondOpinion: false,
    onlinePharmacy: false,
  });

  // Delivery address state for online pharmacy
  const [deliveryAddress, setDeliveryAddress] = useState(
    DELIVERY_ADDRESS_INITIAL_STATE,
  );
  const [deliveryErrors, setDeliveryErrors] = useState(
    DELIVERY_ADDRESS_ERROR_STATE,
  );

  // Consent checkbox state
  const [consentChecked, setConsentChecked] = useState(false);
  const [allConsentRead, setAllConsentRead] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const consentModalRef = useRef(null);
  const deliveryPhoneCountry = getPhoneCountry(deliveryAddress.countryCode);
  const deliveryLocationConfig = getCountryLocationConfig(
    deliveryAddress.countryCode,
  );
  const servicePricing = {
    ...getServicePricing(userCountry),
    "prescription-analysis": {
      ...getServicePricing(userCountry)["prescription-analysis"],
      icon: Pill,
    },
    "second-opinion": {
      ...getServicePricing(userCountry)["second-opinion"],
      icon: Stethoscope,
    },
    "online-pharmacy": {
      ...getServicePricing(userCountry)["online-pharmacy"],
      icon: ShoppingCart,
    },
  };
  const combinedPricing = {
    "prescription-analysis": {
      ...getCombinedPricing(userCountry)["prescription-analysis"],
      icon: Activity,
    },
  };

  useEffect(() => {
    let isMounted = true;

    authAPI
      .getCurrentUser()
      .then((response) => {
        const user = response.data || response;
        if (isMounted && user?.country) {
          setUserCountry(user.country);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!showConsentModal) {
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
  }, [showConsentModal]);

  // Consent messages/terms array
  const consentMessages = [
    {
      title: "Consent for Second Opinion and Medical Reports Analysis",
      content: [
        "PLEASE READ THESE TERMS CAREFULLY. BY ACCESSING OR OTHERWISE USING THE PLATFORM, THE USER/PATIENT AGREES THAT THEY HAVE READ AND AGREED TO BE BOUND BY THESE TERMS. IF THE USER/PATIENT DOES NOT AGREE TO THESE TERMS, OR DOES NOT MEET THE QUALIFICATIONS INCLUDED IN THESE TERMS, THE USER/PATIENT MUST NOT ACCESS OR USE THE PLATFORM.",
        "Unless the user/patient has entered into a separate written agreement with Company regarding the Platform, these Terms are the complete and exclusive agreement between you the user/patient and the Company regarding your access to and use of the Platform and supersede any oral or written proposal, quote, or other communication between you the user/patient and the Company regarding your access to and use of the Platform.",
      ],
    },
    {
      title: "1. Definitions",
      content: [
        "a. 'Applicable Laws' shall mean all laws, statutes, enactments, regulations, guidelines, and judicial precedents in force in India and, where applicable, the United States of America, including but not limited to data protection and healthcare-related laws;",
        "b. 'Company' shall mean Bhagyawathi Drugs and Chemical Pvt Ltd, including its affiliates, subsidiaries, group entities, successors, administrators, and permitted assigns, engaged in providing the Platform and Services as defined herein.",
        "c. 'Health Data' shall mean any personal, sensitive, or health related information provided by the user, including but not limited to medical history, prescriptions, diagnostic reports, medication details, and any other health related inputs;",
        "d. 'Platform' shall mean RXINCREDIBLE, a digital interface, application, or system owned, operated, or managed by the company for facilitating second opinion and medical report analysis;",
        "e. 'Prescription(s)' shall mean any written, electronic, or digital instruction or record issued by a duly qualified and licensed Registered Medical Practitioner, containing details of medicines, dosage, treatment plans, or medical advice provided to the user/patient.",
        "f. 'Processing' shall include collection, recording, organization, structuring, storage, adaptation, retrieval, use, disclosure, dissemination, alignment, restriction, or erasure of data;",
        "g. 'Registered Medical Practitioner (RMP)' shall mean a medical professional duly licensed and authorized under applicable law;",
        "h. 'Services' shall mean second opinion and medical report analysis by Registered Medical Practitioner (RMP) provided by the Company through its platform to the user/patient;",
        "i. 'User/Patient' shall mean any natural person who accesses, registers on, or uses the Platform and voluntarily provides Health Data, and shall include, where the context permits, their legal heirs, authorized representatives, guardians, and permitted assigns.",
      ],
    },
    {
      title: "2. Nature of Services",
      content: [
        "RXINCREDIBLE is a platform provided and managed by Bhagyawathi Drugs and Chemicals Pvt Ltd and not a healthcare provider. The platform is intended to facilitate medical services including second opinion and Prescription analysis services to User/patient.",
        "RXINCREDIBLE is a digital platform provided by the Company to facilitate the health data analysis, collection, and processing of patient-provided information prescribed by Registered Medical Practitioners (RMPs).",
        "This platform enables patients to upload prescriptions, review prescribed medicines, and medical reports to use the service of health data analysis by a Registered Medical Practitioner (RMPs). Neither the company nor the platform provides medical care to the Users/Patients directly nor do either of them practice in medicine.",
      ],
    },
    {
      title: "3. Consent for Health Data Analysis Services",
      content: [
        "The User/Patient expressly acknowledges and agrees to voluntarily provide their health-related information to the platform for the purpose of availing second opinion and medical report analysis services.",
        "The User/Patient understands that the platform utilizes internal systems to analyze the information provided by the user/patient, including prescriptions, medication details, and other health-related inputs, in order to generate informational insights.",
        "By accepting and consenting to these terms, the user/patient also agrees and consents to the Company and its affiliates, or Providers sending the user/patient disclosures, notices, messages, reports, and other communications.",
        "The User/Patient acknowledges and agrees that he/she will not hold the Company/Platform liable for any loss, injury, or claim of any kind resulting from the failure of the user/patient to read these communications or for the failure to comply with any treatment recommendations contained in these communications.",
      ],
    },
    {
      title: "4. Nature of Information Provided",
      content: [
        "The User/Patient understands that the information shared by them may include details such as:",
        "a. Medical history;",
        "b. Prescriptions issued by Registered Medical Practitioners (RMPs);",
        "c. Medication history and dosage details;",
        "d. Health conditions disclosed by the User/Patient;",
        "e. Any other health-related data voluntarily submitted.",
        "The User/Patient confirms that such information is provided by the User/Patient voluntarily and to the best of their knowledge.",
      ],
    },
    {
      title: "5. Purpose of Data Processing",
      content: [
        "The User/Patient understands that the data shall be processed solely for:",
        "a. Generating health-related insights;",
        "b. Identifying general medication patterns;",
        "c. Improving platform services;",
        "d. Compliance with applicable requisites.",
      ],
    },
    {
      title: "6. Nature of Service",
      content: [
        "The User/Patient expressly acknowledges that:",
        "a. The Company facilitates and provides a platform namely RXINCREDIBLE to the user for the purpose of availing the second opinion and Prescription analysis services by the Registered Medical Practitioners (RMPs);",
        "b. The User/Patient expressly acknowledges and agrees that unless and until the prescribed payment is duly completed through the payment portal provided by the Company on the platform, the information, records, or data submitted by the User/Patient shall neither be made accessible to the Company for the purposes of review, processing, or analysis, nor shall such data be uploaded, hosted, or reflected on the Company's platform, and the Company shall bear no responsibility or obligation in respect thereof.",
      ],
    },
    {
      title: "7. Age Eligibility",
      content: [
        "The Platform is intended for the use by users of 18 years of age or older. If the user/patient is below the age of 18, then in that case such user/patient is prohibited from using the platform and its services.",
        "In case the services are procured for a patient who is below the age of 18 years then in that case a parent or a legal guardian of such patient shall apply on behalf of such patient.",
      ],
    },
    {
      title: "8. Consent",
      content: [
        "The user/patient consents to receive second opinion and Prescription analysis report from the Registered Medical Practitioner (RMPs) and clinical Pharmacist through the Platform.",
        "Online second opinion and medical report analysis services are different from services provided in person. The healthcare provider reviewing the user/patient's case will not have the benefit of information obtained from an in-person physical examination, which could affect their opinion or diagnosis.",
        "By proceeding with this service, the user/patient acknowledges that the user/patient is aware of this restriction and exclusively assume the risk of this restriction.",
      ],
    },
    {
      title: "9. Right to Reject and Terminate",
      content: [
        "a. The Company may reject or terminate the user/patient's access to the Platform or their Account at any time if he/she violates these terms or for any reason, at our sole discretion.",
        "b. The user/patient may reject or terminate these terms at any time by ceasing to access the Platform.",
        "c. The company may also suspend the user/patient's access to their Account and the Platform, with or without notice to them, upon any actual, threatened, or suspected breach of these terms or applicable law.",
        "d. In the event that such content is not in the prescribed format, is incomplete, deficient, or non-compliant with the standards and guidelines stipulated herein, or if it is found to be in violation of any applicable laws, regulations, or any jurisdiction.",
        "e. The Company shall not be liable for any consequences arising from such rejection or termination.",
      ],
    },
    {
      title: "10. Interruption of Service",
      content: [
        "The Company may on occasion need to interrupt or suspend the platform services, with or without prior notice, to protect the integrity or functionality of the platform or for maintenance purposes.",
        "The user/patient agrees that the Company is not liable for any interruption or suspension of the platform services (whether intentional or not), and the user/patient understands that the user/patient will not be entitled to any refunds of fees or other compensation for interruption or suspension of platform services.",
        "Likewise, the user/patient agrees that in the event of loss of any User Data, the Company will not be liable for any purported damage or harm arising therefrom.",
      ],
    },
    {
      title: "11. Accuracy and Limitations of Data",
      content: [
        "The User/Patient acknowledges that:",
        "a. The analysis is dependent on the accuracy and completeness of the information provided by the user/patient;",
        "b. The analysis may not include the use of over-the-counter medicines, supplements, or undisclosed treatments done by the user/patient;",
      ],
    },
    {
      title: "12. User Responsibility",
      content: [
        "The user/patient agrees that:",
        "a. Any medical decision shall be taken only after consultation with a qualified Registered Medical Practitioner;",
        "b. The user/patient shall not rely solely on the analysis for treatment or diagnosis.",
      ],
    },
    {
      title: "13. Consent for Data Collection and Processing",
      content: [
        "The user/patient provides free, informed, specific, and explicit consent for:",
        "a. Collection, storage, and processing of the personal and health-related data;",
        "b. Use of such data for the purposes stated above.",
      ],
    },
    {
      title: "14. Data Sharing and Confidentiality",
      content: [
        "The user/patient understands that the data may be shared, where necessary, with:",
        "a. Authorized service providers;",
        "b. Regulatory authorities, if required by law such as Digital Personal Data Protection Act 2023, the Information Technology Act 2000 and rules made thereunder including the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011, the Indian Medical Council (Professional Conduct, Etiquette and Ethics) Regulations, 2002 including the Telemedicine Practice Guidelines dated 25/03/2020, the Consumer Protection Act, 2019, and all other applicable ground laws.",
        "c. The Company shall implement reasonable measures to protect the confidentiality of the data provided by the user/patient.",
      ],
    },
    {
      title: "15. Limitation of Liability",
      content: [
        "The user/patient agrees that the Company shall not be liable for:",
        "a. Any decisions taken by the user/patient based on the analysis;",
        "b. Any health-related consequences arising from reliance on such insights.",
      ],
    },
    {
      title: "16. Right to Withdraw Consent",
      content: [
        "The user/patient understand that the user/patient may withdraw their consent at any time by notifying the Company in prior; however, such withdrawal shall not affect processing and payment already undertaken.",
      ],
    },
    {
      title: "17. Contact Information",
      content: [
        "For queries or further information, please contact us at mobile no. 9822848689 or email us at bhagyawathidrugs@gmail.com.",
      ],
    },
    {
      title: "18. Dispute Resolution",
      content: [
        "Any dispute arising out of or in connection with this Agreement shall be referred to arbitration in accordance with the Arbitration and Conciliation Act, 2015.",
        "The seat and venue of arbitration shall be Nagpur and the arbitration shall be conducted by a sole arbitrator appointed by both the parties mutually in English language. The courts at Nagpur shall have exclusive jurisdiction.",
      ],
    },
  ];

  // Calculate total files uploaded
  const totalFilesUploaded = Object.values(categorizedFiles).reduce(
    (total, files) => total + files.length,
    0,
  );

  // Get the effective service type (mapped from URL)
  const getEffectiveServiceType = () => {
    if (serviceType === "prescription") return "prescription-analysis";
    if (serviceType === "consultation") return "second-opinion";
    if (serviceType === "pharmacy") return "online-pharmacy";
    return serviceType;
  };

  const effectiveServiceType = getEffectiveServiceType();

  // Determine if this is a combined service flow
  const isCombinedService =
    effectiveServiceType === "prescription-analysis" ||
    effectiveServiceType === "second-opinion" ||
    effectiveServiceType === "online-pharmacy";

  // Check authentication on component mount
  useEffect(() => {
    // Check if user is logged in by checking for token in localStorage
    // The backend handles actual authentication via JWT cookie
    const token = getToken();
    if (!token) {
      navigate("/login");
      return;
    }
  }, [navigate]);

  // Auto-select service based on URL parameter
  useEffect(() => {
    // Map category from URL to service type
    let mappedServiceType = serviceType;
    if (serviceType === "prescription") {
      mappedServiceType = "prescription-analysis";
    } else if (serviceType === "consultation") {
      mappedServiceType = "second-opinion";
    } else if (serviceType === "pharmacy") {
      mappedServiceType = "online-pharmacy";
    }

    if (mappedServiceType === "prescription-analysis") {
      setSelectedServices({
        prescriptionAnalysis: true,
        secondOpinion: false,
        onlinePharmacy: false,
      });
    } else if (mappedServiceType === "second-opinion") {
      setSelectedServices({
        prescriptionAnalysis: false,
        secondOpinion: true,
        onlinePharmacy: false,
      });
    } else if (mappedServiceType === "online-pharmacy") {
      setSelectedServices({
        prescriptionAnalysis: false,
        secondOpinion: false,
        onlinePharmacy: true,
      });
    }
  }, [serviceType]);

  const serviceTitle = effectiveServiceType
    ?.split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  // Calculate total price
  const calculateTotal = () => {
    let total = 0;
    if (selectedServices.prescriptionAnalysis) {
      total += servicePricing["prescription-analysis"].price;
    }
    if (selectedServices.secondOpinion) {
      total += servicePricing["second-opinion"].price;
    }
    if (selectedServices.onlinePharmacy) {
      total += servicePricing["online-pharmacy"].price;
    }
    // Apply combined discount if both selected
    if (
      selectedServices.prescriptionAnalysis &&
      selectedServices.secondOpinion
    ) {
      total = combinedPricing["prescription-analysis"].price;
    }
    return total;
  };

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const uploadDocumentsIndividually = async (filesWithContent, userId) => {
    const uploadResults = await Promise.all(
      filesWithContent.map((file) =>
        documentAPI.uploadDocumentsBase64([file], userId, null),
      ),
    );

    return uploadResults.flatMap((result) =>
      Array.isArray(result) ? result : result ? [result] : [],
    );
  };

  // Handle file change for a specific category
  const handleFileChange = (category, e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const selectedFile = files[0];
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
      ];

      if (!selectedFile) {
        e.target.value = "";
        return;
      }

      if (files.length > 1) {
        Swal.fire({
          icon: "warning",
          title: "Only One Document Allowed",
          text: "Please select only one document for this category.",
          confirmButtonColor: "#2563EB",
        });
      }

      if (selectedFile.size > MAX_FILE_SIZE) {
        Swal.fire({
          icon: "error",
          title: "File Too Large",
          text: `${selectedFile.name} exceeds the maximum size of 10MB`,
          confirmButtonColor: "#2563EB",
        });
        e.target.value = "";
        return;
      }

      if (!allowedTypes.includes(selectedFile.type)) {
        Swal.fire({
          icon: "error",
          title: "Invalid File Type",
          text: `${selectedFile.name} is not a supported file type. Only PDF, JPG, and PNG files are allowed.`,
          confirmButtonColor: "#2563EB",
        });
        e.target.value = "";
        return;
      }

      setCategorizedFiles((prev) => ({
        ...prev,
        [category]: [selectedFile],
      }));

      e.target.value = "";
    }
  };

  // Remove file from a specific category
  const removeFile = (category, index) => {
    setCategorizedFiles((prev) => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index),
    }));
  };

  // Preview file handler
  const handlePreview = async (category, file, index) => {
    try {
      // Create object URL for preview
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setPreviewFile({ category, file, index, name: file.name });
    } catch (error) {
      console.error("Error creating preview:", error);
      Swal.fire({
        icon: "error",
        title: "Preview Error",
        text: "Unable to preview this file",
        confirmButtonColor: "#2563EB",
      });
    }
  };

  // Close preview modal
  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewFile(null);
    setPreviewUrl(null);
  };

  // Get file type icon
  const getFileTypeIcon = (fileName) => {
    const extension = fileName.split(".").pop().toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension)) {
      return FileImage;
    }
    if (extension === "pdf") {
      return FileText;
    }
    return File;
  };

  const sanitizeBriefHealthIssue = (value) =>
    (value || "")
      .replace(/[^A-Za-z0-9\s,.-]/g, "")
      .replace(/\s{2,}/g, " ");

  const validateBriefHealthIssue = (value) => {
    const trimmedValue = (value || "").trim();

    if (!trimmedValue) {
      return "";
    }

    if (trimmedValue.length < 3) {
      return "Brief health issue must be at least 3 characters";
    }

    if (trimmedValue.length > 500) {
      return "Brief health issue must be 500 characters or less";
    }

    if (!/^[A-Za-z0-9\s,.-]+$/.test(trimmedValue)) {
      return "Special characters are not allowed";
    }

    return "";
  };

  const validateDeliveryAddressField = (field, value, countryCode) => {
    const trimmedValue = typeof value === "string" ? value.trim() : "";
    const locationConfig = getCountryLocationConfig(countryCode);

    if (field === "address") {
      if (!trimmedValue) {
        return "Full address is required";
      }

      if (trimmedValue.length < 8 || trimmedValue.length > 200) {
        return "Address must be between 8 and 200 characters";
      }

      if (!/^[A-Za-z0-9\s,./-]+$/.test(trimmedValue)) {
        return "Address can use only letters, numbers, spaces, comma, period, slash, and hyphen";
      }

      if (!/[A-Za-z]/.test(trimmedValue) || !/\d/.test(trimmedValue)) {
        return "Enter a complete address with letters and house or area number";
      }

      return "";
    }

    if (field === "city" || field === "state") {
      if (!trimmedValue) {
        return `${field === "city" ? "City" : "State"} is required`;
      }

      if (trimmedValue.length < 2 || trimmedValue.length > 60) {
        return `${field === "city" ? "City" : "State"} must be between 2 and 60 characters`;
      }

      if (!/^[A-Za-z]+(?:[A-Za-z\s.-]*[A-Za-z])?$/.test(trimmedValue)) {
        return `${field === "city" ? "City" : "State"} can use only letters and spaces`;
      }

      return "";
    }

    if (field === "pincode") {
      if (!trimmedValue) {
        return "Pincode is required";
      }

      if (!/^\d+$/.test(trimmedValue)) {
        return "Pincode can contain only numbers";
      }

      if (trimmedValue.length < 3 || trimmedValue.length > 10) {
        return "Enter a valid pincode";
      }

      return "";
    }

    if (field === "phone") {
      return validatePhoneNumber(value, countryCode);
    }

    return "";
  };

  const getDeliveryValidationErrors = (formData) => ({
    address: validateDeliveryAddressField(
      "address",
      formData.address,
      formData.countryCode,
    ),
    city: validateDeliveryAddressField(
      "city",
      formData.city,
      formData.countryCode,
    ),
    state: validateDeliveryAddressField(
      "state",
      formData.state,
      formData.countryCode,
    ),
    pincode: validateDeliveryAddressField(
      "pincode",
      formData.pincode,
      formData.countryCode,
    ),
    phone: validateDeliveryAddressField(
      "phone",
      formData.phone,
      formData.countryCode,
    ),
  });

  const updateDeliveryField = (field, value) => {
    setDeliveryAddress((prev) => {
      let nextValue = value;

      if (field === "address") {
        nextValue = value.replace(/[^A-Za-z0-9\s,./-]/g, "");
      } else if (field === "city" || field === "state") {
        nextValue = value.replace(/[^A-Za-z\s.-]/g, "");
      } else if (field === "pincode") {
        nextValue = value.replace(/\D/g, "");
      } else if (field === "phone") {
        nextValue = sanitizePhoneInput(value, prev.countryCode);
      } else if (field === "countryCode") {
        nextValue = value;
      }

      const nextFormData = {
        ...prev,
        [field]: nextValue,
      };

      if (field === "countryCode") {
        nextFormData.phone = sanitizePhoneInput(prev.phone, nextValue);
      }

      setDeliveryErrors(getDeliveryValidationErrors(nextFormData));
      return nextFormData;
    });
  };

  const isDeliveryAddressValid =
    deliveryAddress.address &&
    deliveryAddress.city &&
    deliveryAddress.state &&
    deliveryAddress.pincode &&
    deliveryAddress.phone &&
    !Object.values(deliveryErrors).some(Boolean);

  const handleServiceToggle = (service) => {
    setSelectedServices((prev) => ({
      ...prev,
      [service]: !prev[service],
    }));
  };

  const handleProceedToPayment = async () => {
    const nextBriefHealthIssueError = validateBriefHealthIssue(briefHealthIssue);
    setBriefHealthIssueError(nextBriefHealthIssueError);

    if (nextBriefHealthIssueError) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Brief Health Issue",
        text: nextBriefHealthIssueError,
        confirmButtonColor: "#2563EB",
      });
      return;
    }

    if (totalFilesUploaded === 0) {
      Swal.fire({
        icon: "warning",
        title: "No Documents",
        text: "Please upload at least one document before proceeding",
        confirmButtonColor: "#2563EB",
      });
      return;
    }

    // Validate consent checkbox
    if (!consentChecked || !allConsentRead) {
      Swal.fire({
        icon: "warning",
        title: "Consent Required",
        text: "Please read all terms and conditions and accept the consent for data processing before proceeding",
        confirmButtonColor: "#2563EB",
      });
      return;
    }

    const hasSelectedService =
      selectedServices.prescriptionAnalysis ||
      selectedServices.secondOpinion ||
      selectedServices.onlinePharmacy;
    if (!hasSelectedService) {
      Swal.fire({
        icon: "warning",
        title: "Select a Service",
        text: "Please select at least one service (Prescription Analysis, Second Opinion, or Online Pharmacy)",
        confirmButtonColor: "#2563EB",
      });
      return;
    }

    setUploading(true);

    try {
      // Get userId from localStorage (stored after login)
      // Document upload endpoint is permitAll, so we don't need to call authAPI.getCurrentUser()
      let userId = null;
      try {
        const storedUser = getStoredUser();
        if (storedUser) {
          const user = storedUser;
          userId = user?.id;
          console.log("User ID from localStorage:", userId);
        }
      } catch (e) {
        console.error("Error parsing user from localStorage:", e);
      }

      if (!userId) {
        Swal.fire({
          icon: "warning",
          title: "Authentication Required",
          text: "Please login to upload documents.",
          confirmButtonColor: "#2563EB",
        }).then(() => {
          navigate("/login");
        });
        return;
      }

      // Convert files to base64 for storage
      const filesWithContent = await Promise.all(
        Object.entries(categorizedFiles).flatMap(([category, files]) =>
          files.map(async (file) => ({
            category,
            name: file.name,
            type: file.type,
            size: file.size,
            content: await fileToBase64(file),
          })),
        ),
      );

      // Upload documents to backend
      const uploadedDocuments = await uploadDocumentsIndividually(
        filesWithContent,
        userId,
      );

      console.log("Documents uploaded to backend:", uploadedDocuments);

      // Store selected services in sessionStorage for payment page
      // Note: Don't store full file content as it exceeds sessionStorage quota
      // The documents are already uploaded to backend, we only need documentIds
      const serviceData = {
        documentIds: uploadedDocuments.map((doc) => doc.id),
        briefHealthIssue: briefHealthIssue,
        services: selectedServices,
        totalPrice: calculateTotal(),
        serviceType: effectiveServiceType,
      };
      sessionStorage.setItem("pendingService", JSON.stringify(serviceData));

      // Navigate to payment
      navigate(`/user/payment/${effectiveServiceType}`);
    } catch (error) {
      console.error("Error uploading documents:", error);
      console.error("Error details:", error.response?.data || error.message);
      
      let errorMsg = "There was an error uploading your documents. Please try again.";
      
      // Check for specific error types
      if (error.response) {
        if (error.response.status === 400) {
          errorMsg = error.response.data?.error || "Invalid request. Please check your input and try again.";
        } else if (error.response.status === 401) {
          errorMsg = "Please login to upload documents.";
        } else if (error.response.status === 403) {
          errorMsg = "You don't have permission to upload documents.";
        } else if (error.response.status === 500) {
          errorMsg = "Server error. Please try again later.";
        }
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      Swal.fire({
        icon: "error",
        title: "Upload Failed",
        text: errorMsg,
        confirmButtonColor: "#2563EB",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitOnly = async () => {
    if (uploading) {
      return;
    }

    const nextBriefHealthIssueError = validateBriefHealthIssue(briefHealthIssue);
    setBriefHealthIssueError(nextBriefHealthIssueError);

    if (nextBriefHealthIssueError) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Brief Health Issue",
        text: nextBriefHealthIssueError,
        confirmButtonColor: "#2563EB",
      });
      return;
    }

    if (totalFilesUploaded === 0) {
      Swal.fire({
        icon: "warning",
        title: "No Documents",
        text: "Please upload at least one document before proceeding",
        confirmButtonColor: "#2563EB",
      });
      return;
    }

    // Validate consent checkbox
    if ((!consentChecked || !allConsentRead) && effectiveServiceType !== "online-pharmacy") {
      Swal.fire({
        icon: "warning",
        title: "Consent Required",
        text: "Please read all terms and conditions and accept the consent for data processing before submitting",
        confirmButtonColor: "#2563EB",
      });
      return;
    }

    // Validate delivery address for online pharmacy
    if (effectiveServiceType === "online-pharmacy") {
      const nextDeliveryErrors = getDeliveryValidationErrors(deliveryAddress);
      setDeliveryErrors(nextDeliveryErrors);

      if (Object.values(nextDeliveryErrors).some(Boolean)) {
        Swal.fire({
          icon: "warning",
          title: "Delivery Address Required",
          text: "Please enter a valid delivery address, postal code, and phone number before submitting",
          confirmButtonColor: "#2563EB",
        });
        return;
      }
    }

    setUploading(true);

    try {
      // Get userId from localStorage (stored after login)
      // Document upload endpoint is permitAll, so we don't need to call authAPI.getCurrentUser()
      let userId = null;
      try {
        const storedUser = getStoredUser();
        if (storedUser) {
          const user = storedUser;
          userId = user?.id;
          console.log("User ID from localStorage:", userId);
        }
      } catch (e) {
        console.error("Error parsing user from localStorage:", e);
      }

      if (!userId) {
        Swal.fire({
          icon: "warning",
          title: "Authentication Required",
          text: "Please login to upload documents.",
          confirmButtonColor: "#2563EB",
        }).then(() => {
          navigate("/login");
        });
        return;
      }

      // Convert files to base64 for storage
      const filesWithContent = await Promise.all(
        Object.entries(categorizedFiles).flatMap(([category, files]) =>
          files.map(async (file) => ({
            category,
            name: file.name,
            type: file.type,
            size: file.size,
            content: await fileToBase64(file),
          })),
        ),
      );

      // Upload documents to backend
      const uploadedDocuments = await uploadDocumentsIndividually(
        filesWithContent,
        userId,
      );

      console.log("Documents uploaded to backend:", uploadedDocuments);

      // Create order for online pharmacy (no payment required)
      // Determine the primary service type
      let primaryServiceType = "ONLINE_PHARMACY";
      if (effectiveServiceType === "prescription-analysis") {
        primaryServiceType = "PRESCRIPTION_ANALYSIS";
      } else if (effectiveServiceType === "second-opinion") {
        primaryServiceType = "SECOND_OPINION";
      }

      const orderDetails = {
        user: { id: userId },
        orderDetails: JSON.stringify({
          services: { "online-pharmacy": true },
          documentIds: uploadedDocuments.map((doc) => doc.id),
          briefHealthIssue: briefHealthIssue,
          serviceType: effectiveServiceType,
        }),
        totalAmount: 0,
        status: "SUBMITTED",
        paymentStatus: "PENDING",
        paymentMethod: "NONE",
        serviceType: primaryServiceType,
        // Include delivery address for online pharmacy
        deliveryAddress: deliveryAddress.address || null,
        deliveryCity: deliveryAddress.city || null,
        deliveryState: deliveryAddress.state || null,
        deliveryPincode: deliveryAddress.pincode || null,
        deliveryCountry: deliveryPhoneCountry.label || "India",
        deliveryPhone:
          formatPhoneForStorage(
            deliveryAddress.phone,
            deliveryAddress.countryCode,
          ) || null,
      };

      const { orderAPI } = await import("@/services/api.js");
      const orderResponse = await orderAPI.create(orderDetails);
      console.log("Order created successfully:", orderResponse.data);

      // Link documents to the order after it's created
      const orderId = orderResponse.data?.id || orderResponse.id;
      if (orderId && uploadedDocuments.length > 0) {
        for (const doc of uploadedDocuments) {
          try {
            await documentAPI.linkDocumentToOrder(doc.id, orderId);
          } catch (linkError) {
            console.error("Error linking document to order:", linkError);
          }
        }
      }

      // Show success sweet alert
      Swal.fire({
        icon: "success",
        title: "Documents Submitted Successfully!",
        text: "Your online pharmacy request has been submitted. You can view it in My Orders.",
        confirmButtonColor: "#2563EB",
        confirmButtonText: "View Orders",
      }).then((result) => {
        if (result.isConfirmed) {
          navigate("/user/orders");
        }
      });
    } catch (error) {
      console.error("Error submitting order:", error);
      console.error("Error details:", error.response?.data || error.message);
      
      let errorMsg = "There was an error submitting your request. Please try again.";
      
      // Check for specific error types
      if (error.response) {
        if (error.response.status === 400) {
          errorMsg = error.response.data?.error || "Invalid request. Please check your input and try again.";
        } else if (error.response.status === 401) {
          errorMsg = "Please login to submit your request.";
        } else if (error.response.status === 403) {
          errorMsg = "You don't have permission to submit this request.";
        } else if (error.response.status === 500) {
          errorMsg = "Server error. Please try again later.";
        }
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      Swal.fire({
        icon: "error",
        title: "Submission Failed",
        text: errorMsg,
        confirmButtonColor: "#2563EB",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextBriefHealthIssueError = validateBriefHealthIssue(briefHealthIssue);
    setBriefHealthIssueError(nextBriefHealthIssueError);

    if (nextBriefHealthIssueError) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Brief Health Issue",
        text: nextBriefHealthIssueError,
        confirmButtonColor: "#2563EB",
      });
      return;
    }

    setUploading(true);

    // Validate consent checkbox
    if (!consentChecked || !allConsentRead) {
      Swal.fire({
        icon: "warning",
        title: "Consent Required",
        text: "Please read all terms and conditions and accept the consent for data processing before proceeding",
        confirmButtonColor: "#2563EB",
      });
      setUploading(false);
      return;
    }

    try {
      // Get userId from localStorage (stored after login)
      // Document upload endpoint is permitAll, so we don't need to call authAPI.getCurrentUser()
      let userId = null;
      try {
        const storedUser = getStoredUser();
        if (storedUser) {
          const user = storedUser;
          userId = user?.id;
          console.log("User ID from localStorage:", userId);
        }
      } catch (e) {
        console.error("Error parsing user from localStorage:", e);
      }

      if (!userId) {
        Swal.fire({
          icon: "warning",
          title: "Authentication Required",
          text: "Please login to upload documents.",
          confirmButtonColor: "#2563EB",
        }).then(() => {
          navigate("/login");
        });
        return;
      }

      // Convert files to base64 for storage
      const filesWithContent = await Promise.all(
        Object.entries(categorizedFiles).flatMap(([category, files]) =>
          files.map(async (file) => ({
            category,
            name: file.name,
            type: file.type,
            size: file.size,
            content: await fileToBase64(file),
          })),
        ),
      );

      // Upload documents to backend
      const uploadedDocuments = await documentAPI.uploadDocumentsBase64(
        filesWithContent,
        userId,
        null,
      );

      console.log("Documents uploaded to backend:", uploadedDocuments);

      // Store selected service in sessionStorage
      // Note: Don't store full file content as it exceeds sessionStorage quota
      // The documents are already uploaded to backend, we only need documentIds
      const serviceData = {
        documentIds: uploadedDocuments.map((doc) => doc.id),
        briefHealthIssue: briefHealthIssue,
        services: selectedServices,
        totalPrice: calculateTotal(),
        serviceType: effectiveServiceType,
      };
      sessionStorage.setItem("pendingService", JSON.stringify(serviceData));

      // Navigate to payment
      navigate(`/user/payment/${effectiveServiceType}`);
    } catch (error) {
      console.error("Error uploading documents:", error);
      console.error("Error response:", error.response);

      let errorMsg =
        "There was an error uploading your documents. Please try again.";

      // Check for specific error types
      if (error.response) {
        if (error.response.status === 403) {
          // Authentication error - clear token and redirect to login
          removeToken();
          localStorage.removeItem("user");
          localStorage.removeItem("userId");

          Swal.fire({
            icon: "error",
            title: "Session Expired",
            text: "Your session has expired. Please login again to continue.",
            confirmButtonColor: "#2563EB",
          }).then(() => {
            navigate("/login");
          });
          return;
        } else if (error.response.status === 401) {
          errorMsg = "Please login to upload documents.";
        } else if (error.response?.message) {
          errorMsg = error.response.data.message;
        }
      } else if (error.message) {
        errorMsg = error.message;
      }

      Swal.fire({
        icon: "error",
        title: "Upload Failed",
        text: errorMsg,
        confirmButtonColor: "#2563EB",
      });
    } finally {
      setUploading(false);
    }
  };
  // Online Pharmacy only shows Prescription, other services show all categories
  const getCategoriesToShow = () => {
    if (effectiveServiceType === "online-pharmacy") {
      return [DOCUMENT_CATEGORIES.prescription];
    }
    return Object.values(DOCUMENT_CATEGORIES);
  };

  const categoriesToShow = getCategoriesToShow();

  return (
    <>
      <Navbar role="user" />

      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Steps */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-center gap-4">
              <div
                className={`flex items-center gap-2 ${step >= 1 ? "text-[#2563EB]" : "text-gray-400"}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? "bg-[#2563EB] text-white" : "bg-gray-200"}`}
                >
                  1
                </div>
                <span className="font-medium">Upload</span>
              </div>
              <div className="w-16 h-0.5 bg-gray-300"></div>
              <div
                className={`flex items-center gap-2 ${step >= 2 ? "text-[#2563EB]" : "text-gray-400"}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? "bg-[#2563EB] text-white" : "bg-gray-200"}`}
                >
                  2
                </div>
                <span className="font-medium">Services</span>
              </div>
              <div className="w-16 h-0.5 bg-gray-300"></div>
              <div className={`flex items-center gap-2 text-gray-400`}>
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  3
                </div>
                <span className="font-medium">Payment</span>
              </div>
            </div>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-3xl sm:text-4xl text-[#1E3A8A] mb-4">
              {step === 1 ? serviceTitle : "Select Additional Services"}
            </h1>
            <p className="text-xl text-gray-600">
              {step === 1
                ? "Upload your documents to get started"
                : "Choose the services you need"}
            </p>
          </motion.div>

          {step === 1 && (
            /* Step 1: Upload Documents */
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-3xl shadow-xl p-5 sm:p-8"
            >
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Document Categories */}
                <div className="space-y-6">
                  <h2 className="text-2xl text-[#1E3A8A] font-semibold mb-4">
                    Upload Your Medical Documents
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Please select the type of document you want to upload
                  </p>

                  {categoriesToShow.map((category) => {
                    const Icon = category.icon;
                    const categoryFiles = categorizedFiles[category.id] || [];

                    return (
                      <div
                        key={category.id}
                        className="border border-gray-200 rounded-2xl p-6 hover:border-[#2563EB] transition-colors duration-200"
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={`w-12 h-12 bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] rounded-xl flex items-center justify-center flex-shrink-0`}
                          >
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg text-[#1E3A8A] font-medium mb-1">
                              {category.name}
                            </h3>
                            <p className="text-sm text-gray-500 mb-3">
                              {category.description}
                            </p>

                            {/* File Upload Input */}
                            <input
                              type="file"
                              accept={category.accept}
                              onChange={(e) => handleFileChange(category.id, e)}
                              className="hidden"
                              id={`file-upload-${category.id}`}
                            />
                            <label
                              htmlFor={`file-upload-${category.id}`}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-[#F1F5F9] text-[#2563EB] rounded-lg hover:bg-[#E2E8F0] cursor-pointer transition-colors duration-200"
                            >
                              <Upload className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                Upload {category.name}
                              </span>
                            </label>

                            {/* Uploaded Files for this category */}
                            {categoryFiles.length > 0 && (
                              <div className="mt-4 grid grid-cols-1 gap-3">
                                {categoryFiles.map((file, index) => (
                                  <motion.div
                                    key={index}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                    className="relative group bg-white border-2 border-dashed border-[#2563EB] rounded-2xl p-4 hover:border-solid transition-all duration-200 cursor-pointer"
                                    onClick={() =>
                                      handlePreview(category.id, file, index)
                                    }
                                  >
                                    <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 bg-gradient-to-br from-[#2563EB] to-[#1E40AF] rounded-xl flex items-center justify-center shadow-md">
                                        {(() => {
                                          const FileTypeIcon = getFileTypeIcon(
                                            file.name,
                                          );
                                          return (
                                            <FileTypeIcon className="w-6 h-6 text-white" />
                                          );
                                        })()}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p
                                          className="text-gray-800 font-semibold text-base truncate"
                                          title={file.name}
                                        >
                                          {file.name}
                                        </p>
                                        <p className="text-gray-500 text-sm">
                                          {(file.size / 1024).toFixed(1)} KB •{" "}
                                          {category.name}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handlePreview(
                                              category.id,
                                              file,
                                              index,
                                            );
                                          }}
                                          className="w-10 h-10 bg-blue-50 hover:bg-blue-100 rounded-xl flex items-center justify-center text-blue-500 hover:text-blue-700 transition-all duration-200 opacity-100 group-hover:opacity-100"
                                          title="Preview"
                                        >
                                          <Eye className="w-5 h-5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            removeFile(category.id, index);
                                          }}
                                          className="w-10 h-10 bg-red-50 hover:bg-red-100 rounded-xl flex items-center justify-center text-red-500 hover:text-red-700 transition-all duration-200 opacity-100 group-hover:opacity-100"
                                        >
                                          <X className="w-5 h-5" />
                                        </button>
                                      </div>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Brief Health Issue - Hidden for Online Pharmacy */}
                {effectiveServiceType !== "online-pharmacy" && (
                  <div>
                    <label className="block text-gray-700 mb-4">
                      Brief Health Issue
                    </label>
                    <textarea
                      value={briefHealthIssue}
                      onChange={(e) => {
                        const sanitizedValue = sanitizeBriefHealthIssue(
                          e.target.value,
                        );
                        setBriefHealthIssue(sanitizedValue);
                        setBriefHealthIssueError(
                          validateBriefHealthIssue(sanitizedValue),
                        );
                      }}
                      placeholder="Please describe your health issue briefly..."
                      rows={4}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all duration-200 resize-none ${
                        briefHealthIssueError
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    {briefHealthIssueError && (
                      <p className="mt-2 text-sm text-red-500">
                        {briefHealthIssueError}
                      </p>
                    )}
                  </div>
                )}

                {/* Consent Section - Below Brief Health Issue */}
                {effectiveServiceType !== "online-pharmacy" && (
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6">
                    <h3 className="text-xl text-[#1E3A8A] font-bold mb-4 flex items-center gap-2">
                      <span className="bg-[#2563EB] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">!</span>
                      Consent for Data Processing
                    </h3>
                    
                    {!allConsentRead ? (
                      /* Button to open consent modal */
                      <div className="space-y-4">
                        <p className="text-gray-700 text-base leading-relaxed">
                          Please read all terms and conditions for data processing before proceeding.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setShowConsentModal(true);
                            setHasScrolledToBottom(false);
                          }}
                          className="w-full py-3 px-4 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium flex items-center justify-center gap-2"
                        >
                          <FileText className="w-5 h-5" />
                          Read Terms & Conditions
                        </button>
                      </div>
                    ) : (
                      /* Consent checkbox - shown after all messages are read */
                      <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                          <div className="flex items-center gap-2 text-green-700">
                            <CheckCircle className="w-5 h-5" />
                            <span className="font-medium">You have read all terms and conditions</span>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 mt-1">
                            <input
                              type="checkbox"
                              id="consent-checkbox"
                              checked={consentChecked}
                              onChange={(e) => setConsentChecked(e.target.checked)}
                              className="w-6 h-6 text-[#2563EB] border-gray-400 rounded focus:ring-[#2563EB] cursor-pointer"
                            />
                          </div>
                          <div className="flex-1">
                            <label htmlFor="consent-checkbox" className="cursor-pointer">
                              <p className="text-gray-700 text-base leading-relaxed">
                                I agree to the above mentioned terms and conditions, including consent for second opinion and medical reports analysis and the processing of my health data as described above.
                              </p>
                            </label>
                          </div>
                        </div>
                        
                        {/* Reset button to review terms again */}
                        <button
                          type="button"
                          onClick={() => {
                            setAllConsentRead(false);
                            setHasScrolledToBottom(false);
                            setConsentChecked(false);
                          }}
                          className="text-sm text-[#2563EB] hover:underline"
                        >
                          Review terms again
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Delivery Address - Only for Online Pharmacy */}
                {effectiveServiceType === "online-pharmacy" && (
                  <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6">
                    <h3 className="text-lg text-[#1E3A8A] font-semibold mb-4 flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Delivery Address
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Please provide your delivery address for medicine delivery
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-700 mb-2 text-sm">
                          Full Address
                        </label>
                        <textarea
                          value={deliveryAddress.address}
                          onChange={(e) =>
                            updateDeliveryField("address", e.target.value)
                          }
                          rows={2}
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent ${
                            deliveryErrors.address
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                          placeholder="Enter your full delivery address"
                        />
                        {deliveryErrors.address && (
                          <p className="mt-1 text-sm text-red-500">
                            {deliveryErrors.address}
                          </p>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div>
                          <label className="block text-gray-700 mb-2 text-sm">
                            {deliveryLocationConfig.cityLabel}
                          </label>
                          <input
                            type="text"
                            value={deliveryAddress.city}
                            onChange={(e) =>
                              updateDeliveryField("city", e.target.value)
                            }
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent ${
                              deliveryErrors.city
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                            placeholder={deliveryLocationConfig.cityLabel}
                          />
                          {deliveryErrors.city && (
                            <p className="mt-1 text-sm text-red-500">
                              {deliveryErrors.city}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-gray-700 mb-2 text-sm">
                            {deliveryLocationConfig.stateLabel}
                          </label>
                          <input
                            type="text"
                            value={deliveryAddress.state}
                            onChange={(e) =>
                              updateDeliveryField("state", e.target.value)
                            }
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent ${
                              deliveryErrors.state
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                            placeholder={deliveryLocationConfig.stateLabel}
                          />
                          {deliveryErrors.state && (
                            <p className="mt-1 text-sm text-red-500">
                              {deliveryErrors.state}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-gray-700 mb-2 text-sm">
                            {deliveryLocationConfig.postalLabel}
                          </label>
                          <input
                            type="text"
                            value={deliveryAddress.pincode}
                            onChange={(e) =>
                              updateDeliveryField("pincode", e.target.value)
                            }
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent ${
                              deliveryErrors.pincode
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                            placeholder={deliveryLocationConfig.postalPlaceholder}
                          />
                          {deliveryErrors.pincode && (
                            <p className="mt-1 text-sm text-red-500">
                              {deliveryErrors.pincode}
                            </p>
                          )}
                        </div>
                        <div className="lg:col-span-2">
                          <label className="block text-gray-700 mb-2 text-sm">Phone Number</label>
                          <div className="flex items-stretch gap-2">
                            <div className="flex min-h-[52px] items-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700">
                              {deliveryPhoneCountry.dialCode}
                            </div>
                            <input
                              type="tel"
                              value={deliveryAddress.phone}
                              onChange={(e) =>
                                updateDeliveryField("phone", e.target.value)
                              }
                              className={`min-w-0 flex-1 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent ${
                                deliveryErrors.phone
                                  ? "border-red-500"
                                  : "border-gray-300"
                              }`}
                              placeholder={deliveryPhoneCountry.example}
                              maxLength={deliveryPhoneCountry.maxLength}
                            />
                          </div>
                          {deliveryErrors.phone && (
                            <p className="mt-1 text-sm text-red-500">
                              {deliveryErrors.phone}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-gray-700 mb-2 text-sm">Country</label>
                          <PhoneCountryPicker
                            value={deliveryAddress.countryCode}
                            onChange={(countryCode) =>
                              updateDeliveryField("countryCode", countryCode)
                            }
                            className="w-full"
                            labelMode="full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload Summary */}
                {totalFilesUploaded > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-[#1E3A8A]">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">
                        {totalFilesUploaded} document
                        {totalFilesUploaded > 1 ? "s" : ""} ready to upload
                      </span>
                    </div>
                  </div>
                )}

                {/* Submit Buttons - Online Pharmacy only has Submit button (no payment) */}
                {effectiveServiceType === "online-pharmacy" ? (
                  /* Online Pharmacy - Submit Only (no payment) */
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleSubmitOnly}
                    disabled={
                      totalFilesUploaded === 0 || uploading || !isDeliveryAddressValid
                    }
                    className="w-full py-4 bg-gradient-to-r from-[#16A34A] to-[#22C55E] text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Submit Documents
                      </>
                    )}
                  </motion.button>
                ) : (
                  /* Other services - Submit & Continue to Payment */
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={totalFilesUploaded === 0 || uploading || !consentChecked || !allConsentRead}
                    className="w-full py-4 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Submit & Continue to Payment
                      </>
                    )}
                  </motion.button>
                )}
              </form>
            </motion.div>
          )}

          {step === 2 && (
            /* Step 2: Select Services */
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-6"
            >
              {/* Service Selection Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Prescription Analysis */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className={`bg-white rounded-3xl shadow-xl p-6 cursor-pointer border-3 transition-all duration-200 ${
                    selectedServices.prescriptionAnalysis
                      ? "border-[#2563EB] ring-2 ring-[#2563EB] ring-opacity-50"
                      : "border-transparent hover:border-gray-300"
                  }`}
                  onClick={() => handleServiceToggle("prescriptionAnalysis")}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={`w-14 h-14 bg-gradient-to-br from-[#1E3A8A] to-[#2563EB] rounded-xl flex items-center justify-center`}
                    >
                      <Pill className="w-7 h-7 text-white" />
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        selectedServices.prescriptionAnalysis
                          ? "bg-[#2563EB] border-[#2563EB]"
                          : "border-gray-300"
                      }`}
                    >
                      {selectedServices.prescriptionAnalysis && (
                        <CheckCircle className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </div>
                  <h3 className="text-xl text-[#1E3A8A] mt-4 mb-2">
                    Prescription Analysis
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {servicePricing["prescription-analysis"].description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-[#1E3A8A]">
                      {formatCurrencyAmount(
                        servicePricing["prescription-analysis"].price,
                        userCountry,
                      )}
                    </span>
                    <span className="text-sm text-gray-500">One-time fee</span>
                  </div>
                </motion.div>

                {/* Second Opinion */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className={`bg-white rounded-3xl shadow-xl p-6 cursor-pointer border-3 transition-all duration-200 ${
                    selectedServices.secondOpinion
                      ? "border-[#16A34A] ring-2 ring-[#16A34A] ring-opacity-50"
                      : "border-transparent hover:border-gray-300"
                  }`}
                  onClick={() => handleServiceToggle("secondOpinion")}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={`w-14 h-14 bg-gradient-to-br from-[#16A34A] to-[#22C55E] rounded-xl flex items-center justify-center`}
                    >
                      <Stethoscope className="w-7 h-7 text-white" />
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        selectedServices.secondOpinion
                          ? "bg-[#16A34A] border-[#16A34A]"
                          : "border-gray-300"
                      }`}
                    >
                      {selectedServices.secondOpinion && (
                        <CheckCircle className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </div>
                  <h3 className="text-xl text-[#1E3A8A] mt-4 mb-2">
                    Second Opinion
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {servicePricing["second-opinion"].description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-[#1E3A8A]">
                      {formatCurrencyAmount(
                        servicePricing["second-opinion"].price,
                        userCountry,
                      )}
                    </span>
                    <span className="text-sm text-gray-500">One-time fee</span>
                  </div>
                </motion.div>
              </div>

              {/* Combined Discount Notice */}
              {selectedServices.prescriptionAnalysis &&
                selectedServices.secondOpinion && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-[#16A34A] to-[#22C55E] text-white rounded-2xl p-4 text-center"
                  >
                    <p className="font-medium">
                      🎉 Combined Package! Pay only{" "}
                      {formatCurrencyAmount(
                        combinedPricing["prescription-analysis"].price,
                        userCountry,
                      )}
                    </p>
                  </motion.div>
                )}

              {/* Order Summary */}
              <div className="bg-white rounded-3xl shadow-xl p-6">
                <h3 className="text-xl text-[#1E3A8A] mb-4">Order Summary</h3>
                <div className="space-y-3 mb-4">
                  {selectedServices.prescriptionAnalysis && (
                    <div className="flex justify-between text-gray-700">
                      <span>Prescription Analysis</span>
                      <span>
                        {formatCurrencyAmount(
                          servicePricing["prescription-analysis"].price,
                          userCountry,
                        )}
                      </span>
                    </div>
                  )}
                  {selectedServices.secondOpinion && (
                    <div className="flex justify-between text-gray-700">
                      <span>Second Opinion</span>
                      <span>
                        {formatCurrencyAmount(
                          servicePricing["second-opinion"].price,
                          userCountry,
                        )}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between text-[#1E3A8A] text-xl font-bold">
                      <span>Total</span>
                      <span>{formatCurrencyAmount(calculateTotal(), userCountry)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:border-gray-400 transition-all duration-200"
                >
                  Back
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleProceedToPayment}
                  className="flex-1 py-4 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white rounded-xl hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Proceed to Payment
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Info Box - Hidden for Online Pharmacy */}
          {step === 1 && effectiveServiceType !== "online-pharmacy" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-6"
            >
              <h3 className="text-[#1E3A8A] mb-2">Important Information</h3>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li>• Ensure all documents are clear and readable</li>
                <li>
                  • Include all relevant medical reports (scans, blood tests,
                  urine tests, etc.)
                </li>
                <li>• Upload doctor prescriptions if available</li>
                <li>• Include any previous doctor conclusions or opinions</li>
                <li>• Our experts will review within 24 hours</li>
                <li>• You'll be notified via email once reviewed</li>
              </ul>
            </motion.div>
          )}


        </div>
      </main>

      <Footer />

      {/* Consent Modal */}
      {showConsentModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowConsentModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Terms & Conditions</h3>
                  <p className="text-sm text-white/80">
                    Consent for Second Opinion and Medical Reports Analysis
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConsentModal(false)}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div 
              ref={consentModalRef}
              className="p-6 overflow-auto max-h-[calc(90vh-180px)]"
              onScroll={(e) => {
                const { scrollTop, scrollHeight, clientHeight } = e.target;
                // Check if user has scrolled to bottom (with 50px threshold)
                if (scrollHeight - scrollTop - clientHeight < 50) {
                  setHasScrolledToBottom(true);
                }
              }}
            >
              {/* All consent messages */}
              <div className="space-y-6">
                {consentMessages.map((item, index) => (
                  <div key={index} className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                    <h4 className="text-xl text-[#1E3A8A] font-bold mb-3">
                      {item.title}
                    </h4>
                    <div className="space-y-3 text-gray-700 text-base leading-relaxed">
                      {item.content.map((paragraph, paragraphIndex) => (
                        <p key={`${index}-${paragraphIndex}`}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Scroll indicator */}
              {!hasScrolledToBottom && (
                <div className="mt-6 text-center text-gray-500 text-sm animate-bounce">
                  ↓ Scroll down to read all terms ↓
                </div>
              )}

              {/* Confirmation message after scrolling to bottom */}
              {hasScrolledToBottom && (
                <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">You have read all terms and conditions</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowConsentModal(false)}
                className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (hasScrolledToBottom) {
                    setAllConsentRead(true);
                    setShowConsentModal(false);
                  }
                }}
                disabled={!hasScrolledToBottom}
                className="px-6 py-2 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                I Have Read All Terms
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Document Preview Modal */}
      {previewFile && previewUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closePreview}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  {(() => {
                    const FileTypeIcon = getFileTypeIcon(previewFile.name);
                    return <FileTypeIcon className="w-5 h-5" />;
                  })()}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-lg">Document Preview</h3>
                  <p className="truncate text-sm text-white/80">{previewFile.name}</p>
                </div>
              </div>
              <button
                onClick={closePreview}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-hidden bg-gray-100 p-4">
              {previewFile.name.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={previewUrl}
                  className="h-full w-full rounded-xl border-0 bg-white"
                  title="PDF Preview"
                />
              ) : previewFile.name
                  .toLowerCase()
                  .match(/\.(jpg|jpeg|png|gif|webp)$/) ? (
                <div className="flex h-full items-center justify-center overflow-hidden">
                  <img
                    src={previewUrl}
                    alt={previewFile.name}
                    className="max-h-full max-w-full rounded-xl shadow-lg object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-gray-500">
                  <FileText className="w-16 h-16 mb-4" />
                  <p>Preview not available for this file type</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 p-4 border-t border-gray-200 bg-gray-50">
              <p className="min-w-0 text-sm text-gray-500">
                {(previewFile.file.size / 1024).toFixed(1)} KB •{" "}
                {DOCUMENT_CATEGORIES[previewFile.category]?.name || "Document"}
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={previewUrl}
                  download={previewFile.name}
                  className="flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-white transition-colors duration-200 hover:bg-[#1E40AF]"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
                <button
                  onClick={closePreview}
                  className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}

