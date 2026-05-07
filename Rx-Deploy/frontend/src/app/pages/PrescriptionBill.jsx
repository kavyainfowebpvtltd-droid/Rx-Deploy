import { useMemo, useState } from "react";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { Download, FileText, Loader2 } from "lucide-react";
import "./PrescriptionBill.css";
import logoImg from "@/assets/logo-b.png";

pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts;

const defaultBillData = {
  billNo: "RXI-2026-0316",
  date: "2026-03-16",
  patient: {
    name: "Mayur Ramteke",
    email: "mramteke80@gmail.com",
  },
  medicines: [
    { name: "Amoxicillin 500mg", qty: 30, rate: 18.5 },
    { name: "Ibuprofen 400mg", qty: 20, rate: 12.3 },
  ],
  delivery: 45,
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const getLogoBase64 = (src) =>
  new Promise((resolve) => {
    if (!src) {
      resolve("");
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve("");
        return;
      }

      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve("");
    img.src = src;
  });

const createDivider = (margin = [0, 0, 0, 0]) => ({
  table: {
    widths: ["*", 14, "*"],
    body: [[
      { text: "", border: [false, false, false, true], borderColor: ["#D6E4FF", "#D6E4FF", "#D6E4FF", "#D6E4FF"] },
      {
        text: "",
        fillColor: "#2563EB",
        border: [false, false, false, false],
        margin: [0, 2, 0, 2],
      },
      { text: "", border: [false, false, false, true], borderColor: ["#D6E4FF", "#D6E4FF", "#D6E4FF", "#D6E4FF"] },
    ]],
  },
  layout: {
    hLineWidth: () => 0,
    vLineWidth: () => 0,
    paddingLeft: () => 0,
    paddingRight: () => 0,
    paddingTop: () => 0,
    paddingBottom: () => 0,
  },
  margin,
});

const createLabelChip = (symbol, label, value, align = "left") => ({
  table: {
    widths: [24, "*"],
    body: [[
      {
        text: symbol,
        alignment: "center",
        color: "#FFFFFF",
        fillColor: "#2563EB",
        bold: true,
        margin: [0, 6, 0, 6],
        border: [false, false, false, false],
      },
      {
        stack: [
          { text: label, style: "metaLabel", alignment: align },
          { text: value, style: "metaValue", alignment: align },
        ],
        fillColor: "#F6FAFF",
        margin: [12, 6, 12, 6],
        border: [false, false, false, false],
      },
    ]],
  },
  layout: "noBorders",
});

const buildMedicineRows = (medicines) => [
  [
    { text: "No", style: "tableHeader", alignment: "center" },
    { text: "Medicine Name", style: "tableHeader" },
    { text: "Quantity", style: "tableHeader", alignment: "center" },
    { text: "Rate", style: "tableHeader", alignment: "right" },
    { text: "Amount", style: "tableHeader", alignment: "right" },
  ],
  ...medicines.map((medicine, index) => {
    const fillColor = index % 2 === 0 ? "#F8FBFF" : "#FFFFFF";
    const amount = medicine.qty * medicine.rate;

    return [
      {
        text: String(index + 1),
        style: "tableCell",
        alignment: "center",
        fillColor,
      },
      {
        stack: [
          { text: medicine.name, style: "tableCell", fillColor },
          { text: "RX Medicine", style: "tableSubText", fillColor },
        ],
        fillColor,
      },
      {
        text: String(medicine.qty),
        style: "tableCell",
        alignment: "center",
        fillColor,
      },
      {
        text: formatCurrency(medicine.rate),
        style: "tableCell",
        alignment: "right",
        fillColor,
      },
      {
        text: formatCurrency(amount),
        style: "tableCellStrong",
        alignment: "right",
        fillColor,
      },
    ];
  }),
];

const createDocDefinition = async (billData) => {
  const logoBase64 = await getLogoBase64(logoImg);
  const subtotal = billData.medicines.reduce(
    (sum, medicine) => sum + medicine.qty * medicine.rate,
    0
  );
  const tax = subtotal * 0.1;
  const delivery = Number(billData.delivery || 0);
  const total = subtotal + tax + delivery;

  return {
    pageSize: "A4",
    pageMargins: [32, 34, 32, 28],
    background: () => ({
      stack: [
        {
          columns: [
            { text: "RX", color: "#EAF1FF", fontSize: 34, bold: true, margin: [0, 28, 0, 0] },
            { text: "MED", color: "#F1F6FF", fontSize: 28, bold: true, alignment: "right", margin: [0, 42, 0, 0] },
          ],
          margin: [16, 0, 16, 0],
        },
        {
          columns: [
            { text: "CARE", color: "#F5F9FF", fontSize: 22, bold: true, margin: [40, 100, 0, 0] },
            { text: "RX", color: "#EDF4FF", fontSize: 32, bold: true, alignment: "right", margin: [0, 140, 24, 0] },
          ],
        },
      ],
    }),
    content: [
      {
        table: {
          widths: ["*", 188],
          body: [[
            {
              stack: [
                {
                  columns: [
                    ...(logoBase64
                      ? [{ width: 94, image: logoBase64, fit: [86, 56], margin: [0, 0, 14, 0] }]
                      : []),
                    {
                      width: "*",
                      stack: [
                        { text: "RxIncredible", style: "brandTitle" },
                        { text: "Prescription billing for modern pharmacy workflows", style: "brandSubtitle" },
                      ],
                      margin: [0, 6, 0, 0],
                    },
                  ],
                },
              ],
              border: [false, false, false, false],
            },
            {
              table: {
                widths: ["*"],
                body: [[
                  {
                    text: "PRESCRIPTION BILL",
                    style: "billBadge",
                    alignment: "center",
                    border: [false, false, false, false],
                    fillColor: "#EAF2FF",
                    margin: [0, 16, 0, 16],
                  },
                ]],
              },
              layout: "noBorders",
              border: [false, false, false, false],
            },
          ]],
        },
        layout: "noBorders",
      },
      createDivider([0, 16, 0, 18]),
      {
        columns: [
          createLabelChip("#", "Bill No", billData.billNo),
          createLabelChip("D", "Date", formatDate(billData.date), "right"),
        ],
        columnGap: 16,
        margin: [0, 0, 0, 18],
      },
      {
        table: {
          widths: ["*"],
          body: [[
            {
              stack: [
                { text: "Patient Details", style: "sectionHeading", margin: [0, 0, 0, 12] },
                {
                  columns: [
                    createLabelChip("P", "Patient Name", billData.patient.name),
                    createLabelChip("@", "Email", billData.patient.email),
                  ],
                  columnGap: 16,
                },
              ],
              fillColor: "#FFFFFF",
              border: [false, false, false, false],
              margin: [16, 14, 16, 16],
            },
          ]],
        },
        layout: {
          hLineWidth: (i) => (i === 0 ? 4 : 0),
          vLineWidth: () => 0,
          hLineColor: () => "#60A5FA",
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 18],
      },
      {
        table: {
          widths: ["*"],
          body: [[
            {
              text: "Prescription Medicines",
              style: "sectionCapsule",
              border: [false, false, false, false],
              fillColor: "#2E7CF6",
              margin: [14, 10, 14, 10],
            },
          ]],
        },
        layout: "noBorders",
        margin: [0, 0, 0, 8],
      },
      {
        table: {
          headerRows: 1,
          widths: [34, "*", 62, 76, 82],
          body: buildMedicineRows(billData.medicines),
        },
        layout: {
          hLineWidth: (i) => (i === 0 || i === 1 ? 0 : 0.6),
          vLineWidth: () => 0,
          hLineColor: () => "#DCE8F8",
          paddingLeft: () => 10,
          paddingRight: () => 10,
          paddingTop: () => 8,
          paddingBottom: () => 8,
        },
        margin: [0, 0, 0, 20],
      },
      {
        columns: [
          {
            width: "*",
            table: {
              widths: ["*"],
              body: [[
                {
                  text: "Prepared with care for accurate medicine billing and delivery.",
                  style: "supportCopy",
                  border: [false, false, false, false],
                  fillColor: "#F6FAFF",
                  margin: [16, 14, 16, 14],
                },
              ]],
            },
            layout: "noBorders",
          },
          {
            width: 220,
            table: {
              widths: ["*", "auto"],
              body: [
                [
                  { text: "Bill Summary", colSpan: 2, style: "summaryTitle", border: [false, false, false, false], fillColor: "#EAF2FF", margin: [12, 10, 12, 10] },
                  {},
                ],
                [
                  { text: "Subtotal", style: "summaryLabel", border: [false, false, false, false] },
                  { text: formatCurrency(subtotal), style: "summaryValue", alignment: "right", border: [false, false, false, false] },
                ],
                [
                  { text: "Tax (10%)", style: "summaryLabel", border: [false, false, false, false] },
                  { text: formatCurrency(tax), style: "summaryValue", alignment: "right", border: [false, false, false, false] },
                ],
                [
                  { text: "Delivery Charges", style: "summaryLabel", border: [false, false, false, false] },
                  { text: formatCurrency(delivery), style: "summaryValue", alignment: "right", border: [false, false, false, false] },
                ],
                [
                  { text: "Total Payable", style: "summaryTotalLabel", border: [false, false, false, false], fillColor: "#DDEBFF" },
                  { text: formatCurrency(total), style: "summaryTotalValue", alignment: "right", border: [false, false, false, false], fillColor: "#DDEBFF" },
                ],
              ],
            },
            layout: {
              hLineWidth: (i) => (i === 0 || i === 1 ? 0 : 0.6),
              vLineWidth: () => 0,
              hLineColor: () => "#DCE8F8",
              paddingLeft: () => 14,
              paddingRight: () => 14,
              paddingTop: () => 10,
              paddingBottom: () => 10,
            },
          },
        ],
        columnGap: 16,
        margin: [0, 0, 0, 22],
      },
      createDivider([0, 0, 0, 12]),
      {
        text: "Generated by RxIncredible - Thank you for choosing us!",
        style: "footerText",
        alignment: "center",
      },
      {
        text: "Wishing you a speedy recovery!",
        style: "footerSubtext",
        alignment: "center",
        margin: [0, 6, 0, 0],
      },
    ],
    styles: {
      brandTitle: { fontSize: 24, bold: true, color: "#123B88" },
      brandSubtitle: { fontSize: 10, color: "#60758B", margin: [0, 4, 0, 0] },
      billBadge: { fontSize: 16, bold: true, color: "#1D4ED8", letterSpacing: 1.2 },
      metaLabel: { fontSize: 9, color: "#7A8DA6", margin: [0, 0, 0, 2] },
      metaValue: { fontSize: 11, bold: true, color: "#183B67" },
      sectionHeading: { fontSize: 13, bold: true, color: "#1D4ED8" },
      sectionCapsule: { fontSize: 12, bold: true, color: "#FFFFFF" },
      tableHeader: { fontSize: 9.5, bold: true, color: "#FFFFFF", fillColor: "#3B82F6", margin: [0, 6, 0, 6] },
      tableCell: { fontSize: 9.5, color: "#2A3E55", margin: [0, 2, 0, 2] },
      tableCellStrong: { fontSize: 9.5, color: "#173B68", bold: true, margin: [0, 2, 0, 2] },
      tableSubText: { fontSize: 8, color: "#7A8DA6", margin: [0, 2, 0, 0] },
      supportCopy: { fontSize: 9.5, color: "#5A7088", lineHeight: 1.3 },
      summaryTitle: { fontSize: 10.5, bold: true, color: "#1D4ED8" },
      summaryLabel: { fontSize: 9.5, color: "#5F738A" },
      summaryValue: { fontSize: 9.5, color: "#173B68", bold: true },
      summaryTotalLabel: { fontSize: 11.5, color: "#123B88", bold: true },
      summaryTotalValue: { fontSize: 13.5, color: "#1D4ED8", bold: true },
      footerText: { fontSize: 10, color: "#48637E", bold: true },
      footerSubtext: { fontSize: 9.5, color: "#7A8DA6" },
    },
    defaultStyle: {
      font: "Roboto",
    },
  };
};

export default function PrescriptionBill() {
  const [billData] = useState(defaultBillData);
  const [loading, setLoading] = useState(false);

  const totals = useMemo(() => {
    const subtotal = billData.medicines.reduce(
      (sum, medicine) => sum + medicine.qty * medicine.rate,
      0
    );
    const tax = subtotal * 0.1;
    const delivery = Number(billData.delivery || 0);

    return {
      subtotal,
      tax,
      delivery,
      total: subtotal + tax + delivery,
    };
  }, [billData]);

  const handleDownload = async () => {
    setLoading(true);

    try {
      const docDefinition = await createDocDefinition(billData);
      pdfMake.createPdf(docDefinition).download(`Prescription_Bill_${billData.billNo}.pdf`);
    } catch (error) {
      console.error("Error generating pdfmake prescription bill:", error);
      window.alert("Failed to generate the PDF. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="prescription-page">
      <section className="prescription-shell">
        <div className="prescription-hero">
          <div>
            <p className="hero-kicker">pdfmake Prescription Bill</p>
            <h1 className="hero-title">Prescription Bill PDF Generator</h1>
            <p className="hero-copy">
              This bill now downloads directly through `pdfmake`, without `html2canvas`
              or `jsPDF`.
            </p>
          </div>

          <button
            type="button"
            className="download-button"
            onClick={handleDownload}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="button-icon spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="button-icon" />
                Download PDF
              </>
            )}
          </button>
        </div>

        <section className="preview-card">
          <div className="preview-header">
            <div className="preview-badge">
              <FileText size={18} />
              <span>PRESCRIPTION BILL</span>
            </div>
            <div className="preview-meta">
              <span>{billData.billNo}</span>
              <span>{formatDate(billData.date)}</span>
            </div>
          </div>

          <div className="preview-grid">
            <div className="preview-panel">
              <p className="panel-label">Patient Name</p>
              <p className="panel-value">{billData.patient.name}</p>
            </div>
            <div className="preview-panel">
              <p className="panel-label">Email</p>
              <p className="panel-value">{billData.patient.email}</p>
            </div>
          </div>

          <div className="preview-table">
            {billData.medicines.map((medicine, index) => (
              <div className="preview-row" key={`${medicine.name}-${index}`}>
                <span>{index + 1}</span>
                <span>{medicine.name}</span>
                <span>{medicine.qty}</span>
                <span>{formatCurrency(medicine.rate)}</span>
                <span>{formatCurrency(medicine.qty * medicine.rate)}</span>
              </div>
            ))}
          </div>

          <div className="preview-summary">
            <div><span>Subtotal</span><strong>{formatCurrency(totals.subtotal)}</strong></div>
            <div><span>Tax (10%)</span><strong>{formatCurrency(totals.tax)}</strong></div>
            <div><span>Delivery Charges</span><strong>{formatCurrency(totals.delivery)}</strong></div>
            <div className="preview-total"><span>Total Payable</span><strong>{formatCurrency(totals.total)}</strong></div>
          </div>
        </section>
      </section>
    </main>
  );
}
