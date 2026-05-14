import { motion } from "motion/react";
import { Calendar, Download, Eye, FileText, FolderOpen, IndianRupee, Plus, Receipt, Send, Trash2, User, X } from "lucide-react";
import { formatReportId } from "@/app/utils/reportId.js";

export function DocumentsModal({ isOpen, selectedUser, documents, onClose, onView, onDownload }) {
  if (!isOpen) return null;

  const modalTitle = selectedUser?.user?.fullName
    ? `${selectedUser.user.fullName}'s Documents`
    : "Uploaded Documents";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-xl font-semibold text-[#1E3A8A]">{modalTitle}</h3>
            <p className="text-sm text-gray-500">
              {documents.length} document{documents.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto p-6">
          {documents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-gray-500">
              No documents available.
            </div>
          ) : (
            documents.map((doc, index) => (
              <div
                key={doc.id || `${doc.fileName || doc.originalFileName || "doc"}-${index}`}
                className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-800">
                    {doc.originalFileName || doc.fileName || `Document ${index + 1}`}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                    <span>{doc.category || "Document"}</span>
                    <span>{doc.mimeType || "Unknown type"}</span>
                    <span>{doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : "Size unavailable"}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onView(doc)}
                    className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1E40AF]"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => onDownload(doc)}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                  >
                    Download
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function Header({ showAllUsers, onCreateNew, orderData, isNewQuotation, isViewOnly, documentsCount, onOpenDocuments }) {
  if (showAllUsers) {
    return (
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="mb-2 text-3xl sm:text-4xl text-[#1E3A8A]">Prescription Bills</h1>
          <p className="text-xl text-gray-600">View and manage patient prescription bills</p>
        </div>
        <button onClick={onCreateNew} className="flex items-center gap-2 rounded-xl bg-[#16A34A] px-6 py-3 text-white transition-colors hover:bg-[#15803D]">
          <Plus className="h-5 w-5" /> Create New Bill
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="mb-2 text-3xl sm:text-4xl text-[#1E3A8A]">{isNewQuotation ? "New Quotation" : isViewOnly ? "View Quotation" : "Generate Quotation"}</h1>
          <p className="text-xl text-gray-600">
            {isNewQuotation
              ? "Create a new quotation without prescription"
              : `Report ID: ${formatReportId(orderData?.orderNumber || orderData?.id)}`}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function CustomerDetails({ isNewQuotation, orderData, userRole, orderBill, documents, onOpenDocuments, onViewDocument, onDownloadDocument, onViewLegacyFile, onDownloadLegacyFile, onViewOrderBill, onDownloadOrderBill, summary }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
      <h3 className="text-xl text-[#1E3A8A] mb-4">{isNewQuotation ? "Customer Details" : "Patient & Order Details"}</h3>
      <div className="space-y-3 text-gray-700">
        {isNewQuotation ? (
          <>
            <div className="flex items-start gap-2"><User className="w-4 h-4 mt-1 text-gray-400" /><div><p className="text-sm text-gray-500">Customer Name</p><input type="text" placeholder="Enter customer name" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2563EB]" /></div></div>
            <div className="flex items-start gap-2"><FileText className="w-4 h-4 mt-1 text-gray-400" /><div><p className="text-sm text-gray-500">Email</p><input type="email" placeholder="Enter email" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2563EB]" /></div></div>
            <div className="flex items-start gap-2"><Calendar className="w-4 h-4 mt-1 text-gray-400" /><div><p className="text-sm text-gray-500">Phone</p><input type="tel" placeholder="Enter phone" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2563EB]" /></div></div>
          </>
        ) : (
          <>
            <div className="flex items-start gap-2"><User className="w-4 h-4 mt-1 text-gray-400" /><div><p className="text-sm text-gray-500">Patient</p><p>{orderData?.patientName}</p></div></div>
            <div className="flex items-start gap-2"><FileText className="w-4 h-4 mt-1 text-gray-400" /><div><p className="text-sm text-gray-500">Email</p><p>{orderData?.patientEmail}</p></div></div>
            <div className="flex items-start gap-2"><Calendar className="w-4 h-4 mt-1 text-gray-400" /><div><p className="text-sm text-gray-500">Date</p><p>{orderData?.uploadedDate ? new Date(orderData.uploadedDate).toLocaleDateString() : "-"}</p></div></div>
            <div className="pt-3 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-1">Service Type</p>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                {userRole === "ACCOUNTANT" ? "Online Pharmacy" : orderData?.serviceType === "PRESCRIPTION_ANALYSIS" ? "Prescription Analysis" : orderData?.serviceType === "SECOND_OPINION" ? "Second Opinion" : orderData?.serviceType}
              </span>
            </div>
            {orderData?.deliveryAddress && (
              <div className="pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Delivery Address</p>
                <div className="text-sm text-gray-700 space-y-1">
                  {orderData?.deliveryAddress && <p>{orderData.deliveryAddress}</p>}
                  {orderData?.deliveryCity && <p>{orderData.deliveryCity}{orderData?.deliveryState || orderData?.deliveryPincode ? ", " : ""}{orderData?.deliveryState}{orderData?.deliveryPincode ? " - " : ""}{orderData?.deliveryPincode}</p>}
                  {orderData?.deliveryCountry && orderData.deliveryCountry !== "India" && <p>{orderData.deliveryCountry}</p>}
                  {orderData?.deliveryPhone && <p className="mt-2">{orderData.deliveryPhone}</p>}
                </div>
              </div>
            )}
            {orderData?.notes && (
              <div className="pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Notes</p>
                <p className="text-sm">{orderData.notes}</p>
              </div>
            )}
            {orderBill && (
              <div className="pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-2">Online Pharmacy Bill</p>
                <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-700">Pharmacy Bill Available</p>
                      <p className="text-xs text-gray-500">Bill for Online Pharmacy order</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={onViewOrderBill} className="rounded-lg bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700">View</button>
                    <button onClick={onDownloadOrderBill} className="rounded-lg bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700">Download</button>
                  </div>
                </div>
              </div>
            )}
            {documents.length > 0 && (
              <div className="pt-3 border-t border-gray-200">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm text-gray-500">Uploaded Documents ({documents.length})</p>
                </div>
                <div className="space-y-2">
                  {documents.slice(0, 3).map((doc, index) => (
                    <div key={doc.id || index} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <FileText className="h-5 w-5 shrink-0 text-[#2563EB]" />
                        <div className="min-w-0 flex-1">
                          <p className="break-all text-sm font-medium text-gray-700">{doc.originalFileName || doc.fileName}</p>
                          <p className="text-xs text-gray-500">{doc.user?.fullName ? `By: ${doc.user.fullName} • ` : ""}{doc.category || "Document"} • {(doc.fileSize / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button onClick={() => onViewDocument(doc)} className="rounded-lg bg-[#2563EB] px-2 py-1 text-xs text-white hover:bg-[#1E40AF]">View</button>
                        <button onClick={() => onDownloadDocument(doc)} className="rounded-lg bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700">Download</button>
                      </div>
                    </div>
                  ))}
                  {documents.length > 3 && <p className="text-center text-xs text-gray-500">+{documents.length - 3} more documents</p>}
                </div>
              </div>
            )}
            {orderData?.files?.length > 0 && (
              <div className="pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-2">Uploaded Documents (Legacy)</p>
                <div className="space-y-2">
                  {orderData.files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <FileText className="h-5 w-5 shrink-0 text-[#2563EB]" />
                        <div className="min-w-0 flex-1">
                          <p className="break-all text-sm font-medium text-gray-700">{file.name || file.category}</p>
                          <p className="text-xs text-gray-500">{file.category}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button onClick={() => onViewLegacyFile(file)} className="rounded-lg bg-[#2563EB] px-2 py-1 text-xs text-white hover:bg-[#1E40AF]">View</button>
                        {file.content && <button onClick={() => onDownloadLegacyFile(file)} className="rounded-lg bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700">Download</button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <AmountSummary summary={summary} />
    </div>
  );
}

export function AmountSummary({ summary }) {
  return (
    <div className="mt-6 border-t border-gray-200 pt-6">
      <h4 className="mb-3 text-gray-700">Total Summary</h4>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-gray-600"><span>Subtotal:</span><span>₹{summary.subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between text-gray-600"><span>Delivery Charge:</span><span>₹{summary.deliveryCharge.toFixed(2)}</span></div>
        <div className="flex justify-between text-gray-600"><span>Delivery GST (18%):</span><span>₹{summary.deliveryGst.toFixed(2)}</span></div>
        <div className="flex justify-between border-t border-gray-200 pt-2 text-[#1E3A8A]"><span>Total:</span><span className="text-xl">₹{summary.total.toFixed(2)}</span></div>
      </div>
    </div>
  );
}

export function MedicineTable({ medicines, isViewOnly, deliveryCharge, submitting, onAddMedicine, onUpdateMedicine, onRemoveMedicine, onDeliveryChargeChange, onSubmit, onExportPDF }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-8">
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl text-[#1E3A8A]">Medicine List</h3>
          {!isViewOnly && (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={() => onAddMedicine(null)} className="flex items-center gap-2 rounded-xl bg-[#16A34A] px-4 py-2 text-white hover:bg-[#15803D]">
              <Plus className="h-4 w-4" /> Add Medicine
            </motion.button>
          )}
        </div>

        <div className="space-y-4">
          {medicines.map((medicine, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="rounded-xl border border-gray-200 p-4">
              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><label className="mb-2 block text-sm text-gray-700">Active Molecule</label><input type="text" value={medicine.name} onChange={(e) => onUpdateMedicine(index, "name", e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-[#2563EB]" required disabled={isViewOnly} /></div>
                <div><label className="mb-2 block text-sm text-gray-700">Medicine Brand</label><input type="text" value={medicine.brand || ""} onChange={(e) => onUpdateMedicine(index, "brand", e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-[#2563EB]" disabled={isViewOnly} /></div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div><label className="mb-2 block text-sm text-gray-700">Dosage</label><input type="text" value={medicine.dosage} onChange={(e) => onUpdateMedicine(index, "dosage", e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-[#2563EB]" required disabled={isViewOnly} /></div>
                <div><label className="mb-2 block text-sm text-gray-700">Quantity</label><input type="number" value={medicine.quantity} onChange={(e) => onUpdateMedicine(index, "quantity", parseInt(e.target.value, 10) || 0)} className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-[#2563EB]" required min="1" disabled={isViewOnly} /></div>
                <div><label className="mb-2 block text-sm text-gray-700">Price/Unit (₹)</label><input type="number" step="0.01" value={medicine.pricePerUnit} onChange={(e) => onUpdateMedicine(index, "pricePerUnit", parseFloat(e.target.value) || 0)} className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-[#2563EB]" required min="0" disabled={isViewOnly} /></div>
              </div>
              {!isViewOnly && (
                <button type="button" onClick={() => onRemoveMedicine(index)} className="mt-2 flex items-center gap-1 text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /> Remove</button>
              )}
            </motion.div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-[#2563EB]" />
            <h4 className="font-medium text-gray-700">Delivery Charge</h4>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm text-gray-600">Enter Delivery Charge (GST 18% will be added)</label>
              <input type="number" value={deliveryCharge} onChange={(e) => onDeliveryChargeChange(parseFloat(e.target.value) || 0)} className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-[#2563EB]" min="0" step="0.01" disabled={isViewOnly} placeholder="0.00" />
            </div>
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600">
              <span className="text-gray-500">With GST (18%):</span>
              <span className="ml-1 font-semibold text-[#2563EB]">₹{(deliveryCharge * 1.18).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-6">
          {!isViewOnly && (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={submitting || medicines.length === 0} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] py-4 text-white hover:shadow-lg disabled:opacity-50">
              {submitting ? <><div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />Submitting...</> : <><Send className="h-5 w-5" />Submit</>}
            </motion.button>
          )}
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={onExportPDF} className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-4 text-white hover:bg-green-700">
            <Download className="h-5 w-5" />Export PDF
          </motion.button>
        </div>
      </form>
    </div>
  );
}

export function EmptyState() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl bg-white p-12 text-center shadow-lg">
      <FolderOpen className="mx-auto mb-4 h-16 w-16 text-gray-300" />
      <h3 className="mb-2 text-xl text-gray-600">No Prescriptions Found</h3>
      <p className="text-gray-500">No prescriptions have been submitted yet.</p>
    </motion.div>
  );
}
