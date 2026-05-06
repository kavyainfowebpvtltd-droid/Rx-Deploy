import { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { 
  Download, 
  Mail, 
  Printer,
  Send,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2
} from "lucide-react";
import "./InvoiceQuotation.css";
import logoImg from "@/assets/logo-b.png";

// Default invoice data
const defaultInvoiceData = {
  invoiceNo: "INV-2026-0001",
  date: new Date().toISOString().split('T')[0],
  customer: {
    name: "John Doe",
    address: "123 Main Street, Mumbai - 400001",
    email: "john.doe@example.com"
  },
  items: [
    { id: 1, name: "Amoxicillin 500mg Capsule", price: 150.00, quantity: 3 },
    { id: 2, name: "Ibuprofen 400mg Tablet", price: 25.00, quantity: 10 },
    { id: 3, name: "Cetirizine 10mg Tablet", price: 35.00, quantity: 5 },
    { id: 4, name: "Vitamin D3 1000IU", price: 120.00, quantity: 2 }
  ]
};

export default function Invoice() {
  const invoiceRef = useRef(null);
  const [invoiceData, setInvoiceData] = useState(defaultInvoiceData);
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState("");
  const [editingItem, setEditingItem] = useState(null);

  // Calculations
  const calculateItemTotal = (price, quantity) => price * quantity;
  
  const subtotal = invoiceData.items.reduce(
    (sum, item) => sum + calculateItemTotal(item.price, item.quantity),
    0
  );
  
  const GST_RATE = 0.18;
  const gstAmount = subtotal * GST_RATE;
  const grandTotal = subtotal + gstAmount;

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `₹${amount.toFixed(2)}`;
  };

  // Handle PDF download
  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) {
      alert("No invoice content to generate PDF from.");
      return;
    }

    setLoading(true);
    try {
      const element = invoiceRef.current;
      
      // Ensure element is visible and styled correctly for PDF
      element.style.visibility = 'visible';
      element.style.opacity = '1';
      
      // Capture the element as canvas with high quality settings
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        allowTaint: true,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.querySelector('.invoice-container');
          if (clonedElement) {
            clonedElement.style.visibility = 'visible';
            clonedElement.style.opacity = '1';
            clonedElement.style.position = 'relative';
            clonedElement.style.width = '100%';
            clonedElement.style.maxWidth = '800px';
            clonedElement.style.margin = '0';
            clonedElement.style.boxShadow = 'none';
            clonedElement.style.border = '1px solid #e2e8f0';
          }
        }
      });

      // Calculate dimensions for A4
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Create PDF
      const pdf = new jsPDF("p", "mm", "a4");
      const imgData = canvas.toDataURL("image/png");

      // Add image to PDF with proper margins
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

      // Download
      pdf.save(`Invoice_${invoiceData.invoiceNo}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle email sending
  const handleSendEmail = async () => {
    if (!email) {
      alert("Please enter an email address.");
      return;
    }

    setEmailLoading(true);
    try {
      // First generate PDF as base64
      if (!invoiceRef.current) {
        alert("No invoice content to generate PDF from.");
        return;
      }

      const element = invoiceRef.current;
      element.style.visibility = 'visible';
      element.style.opacity = '1';
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        allowTaint: true,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.querySelector('.invoice-container');
          if (clonedElement) {
            clonedElement.style.visibility = 'visible';
            clonedElement.style.opacity = '1';
            clonedElement.style.position = 'relative';
          }
        }
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF("p", "mm", "a4");
      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

      // Get PDF as base64
      const pdfBase64 = pdf.output('datauristring');

      // Send to backend
      const response = await fetch('/api/invoice/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          invoiceNo: invoiceData.invoiceNo,
          pdfData: pdfBase64
        })
      });

      if (response.ok) {
        alert("Invoice sent successfully to " + email);
        setShowEmailModal(false);
        setEmail("");
      } else {
        const error = await response.text();
        alert("Failed to send email: " + error);
      }
    } catch (error) {
      console.error("Error sending email:", error);
      alert("Failed to send email. Please try again.");
    } finally {
      setEmailLoading(false);
    }
  };

  // Update item
  const updateItem = (id, field, value) => {
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  // Delete item
  const deleteItem = (id) => {
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  // Add new item
  const addItem = () => {
    const newId = Math.max(...invoiceData.items.map(i => i.id), 0) + 1;
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, { id: newId, name: "New Medicine", price: 0, quantity: 1 }]
    }));
  };

  // Print invoice
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="invoice-page">
      {/* Action Buttons */}
      <div className="invoice-actions">
        <button 
          className="invoice-btn primary" 
          onClick={handleDownloadPDF}
          disabled={loading}
        >
          <Download size={18} />
          {loading ? "Generating..." : "Download PDF"}
        </button>
        
        <button 
          className="invoice-btn secondary" 
          onClick={() => setShowEmailModal(true)}
        >
          <Send size={18} />
          Send Email
        </button>
        
        <button 
          className="invoice-btn secondary" 
          onClick={handlePrint}
        >
          <Printer size={18} />
          Print
        </button>
      </div>

      {/* Invoice Container */}
      <div className="invoice-wrapper">
        <div className="invoice-container" ref={invoiceRef}>
          {/* Header */}
          <div className="invoice-header">
            <div className="header-brand">
              <img src={logoImg} alt="RxIncredible Logo" style={{ width: '120px', height: 'auto', objectFit: 'contain' }} />
            </div>
            <div className="header-right">
              <div className="invoice-type">INVOICE</div>
            </div>
          </div>

          {/* Info Section */}
          <div className="invoice-info">
            <div className="info-left">
              <div className="info-row">
                <span className="info-label">Invoice No:</span>
                <span className="info-value">{invoiceData.invoiceNo}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Date:</span>
                <span className="info-value">{formatDate(invoiceData.date)}</span>
              </div>
            </div>
            <div className="info-right">
              <div className="customer-card">
                <div className="customer-label">Bill To</div>
                <div className="customer-name">{invoiceData.customer.name}</div>
                <div className="customer-address">{invoiceData.customer.address}</div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="invoice-table-container">
            <table className="invoice-table">
              <thead>
                <tr>
                  <th className="col-sr">#</th>
                  <th className="col-item">Item Name (Medicine)</th>
                  <th className="col-price">Price</th>
                  <th className="col-qty">Quantity</th>
                  <th className="col-total">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoiceData.items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="col-sr">{index + 1}</td>
                    <td className="col-item">{item.name}</td>
                    <td className="col-price">{formatCurrency(item.price)}</td>
                    <td className="col-qty">{item.quantity}</td>
                    <td className="col-total">{formatCurrency(calculateItemTotal(item.price, item.quantity))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="invoice-totals">
            <div className="totals-summary">
              <div className="total-row">
                <span className="total-label">Subtotal</span>
                <span className="total-value">{formatCurrency(subtotal)}</span>
              </div>
              <div className="total-row">
                <span className="total-label">GST (18%)</span>
                <span className="total-value">{formatCurrency(gstAmount)}</span>
              </div>
              <div className="total-row due-total">
                <span className="total-label">Due Total</span>
                <span className="total-value">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="invoice-footer">
            <p>Thank you for your business!</p>
            <p className="footer-contact">Contact: contact@rxincredible.com | Phone: 9822848689</p>
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="modal-overlay" onClick={() => setShowEmailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Send Invoice via Email</h3>
              <button className="modal-close" onClick={() => setShowEmailModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <label>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter recipient email"
              />
              <p className="modal-hint">
                Invoice will be sent as PDF attachment with subject: "Your Invoice - Rxincredible"
              </p>
            </div>
            <div className="modal-footer">
              <button className="modal-btn cancel" onClick={() => setShowEmailModal(false)}>
                Cancel
              </button>
              <button 
                className="modal-btn send" 
                onClick={handleSendEmail}
                disabled={emailLoading}
              >
                {emailLoading ? "Sending..." : "Send Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          .invoice-page {
            background: white !important;
            padding: 0 !important;
          }
          .invoice-actions, 
          .modal-overlay {
            display: none !important;
          }
          .invoice-container {
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
}
