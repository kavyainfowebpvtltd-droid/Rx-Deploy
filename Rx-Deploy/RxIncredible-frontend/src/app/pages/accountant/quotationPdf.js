import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { createQuotationNumber, formatCurrency, formatDate, getDisplayServiceType, numberToWords } from "./quotationHelpers.js";

pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts;

const getLogoBase64 = (logoSrc) =>
  new Promise((resolve) => {
    if (!logoSrc) {
      resolve("");
      return;
    }

    let settled = false;
    const finish = (value) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeoutId);
        resolve(value);
      }
    };

    const timeoutId = setTimeout(() => finish(""), 1500);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      finish(canvas.toDataURL("image/png"));
    };
    img.onerror = () => finish("");
    img.src = logoSrc;
  });

const createDetailLine = (label, value, valueStyle = "detailValue") => ({
  columns: [
    { width: "40%", text: label, style: "detailLabel" },
    { width: "60%", text: value || "-", style: valueStyle, alignment: "right" },
  ],
  columnGap: 12,
  margin: [0, 0, 0, 8],
});

const createDivider = (lineColor, lineWidth = 1.5, margin = [0, 0, 0, 0]) => ({
  table: {
    widths: ["*"],
    body: [[{ text: "", border: [false, false, false, false], margin: [0, 0, 0, 0] }]],
  },
  layout: {
    hLineWidth: (i) => (i === 0 ? lineWidth : 0),
    vLineWidth: () => 0,
    hLineColor: () => lineColor,
    paddingLeft: () => 0,
    paddingRight: () => 0,
    paddingTop: () => 0,
    paddingBottom: () => 0,
  },
  margin,
});

export const getDocDefinition = async ({
  orderData,
  medicines,
  deliveryCharge,
  prescriptionId,
  userRole,
  logoSrc,
}) => {
  const subtotal = medicines.reduce((sum, medicine) => sum + medicine.quantity * medicine.pricePerUnit, 0);
  const total = subtotal + deliveryCharge;
  const quotationNumber = createQuotationNumber(orderData, prescriptionId);
  const customerAddress = [
    orderData?.deliveryAddress,
    [orderData?.deliveryCity, orderData?.deliveryState].filter(Boolean).join(", "),
    orderData?.deliveryPincode,
    orderData?.deliveryCountry && orderData.deliveryCountry !== "India" ? orderData.deliveryCountry : "",
  ]
    .filter(Boolean)
    .join(", ");

  const logoBase64 = await getLogoBase64(logoSrc);

  const medicineTableBody = [
    [
      { text: "Sr No", style: "tableHeader", alignment: "center" },
      { text: "Medicine Name", style: "tableHeader" },
      { text: "Dosage", style: "tableHeader", alignment: "center" },
      { text: "Qty", style: "tableHeader", alignment: "center" },
      { text: "Rate", style: "tableHeader", alignment: "right" },
      { text: "Amount", style: "tableHeader", alignment: "right" },
    ],
    ...medicines.map((medicine, index) => {
      const fillColor = index % 2 === 0 ? "#F8FAFC" : "#FFFFFF";
      const amount = (medicine.quantity || 0) * (medicine.pricePerUnit || 0);

      return [
        { text: String(index + 1), style: "tableCell", alignment: "center", fillColor },
        {
          stack: [
            { text: medicine.name || "-", style: "tableCell" },
            medicine.brand ? { text: medicine.brand, style: "tableSubCell" } : null,
          ].filter(Boolean),
          fillColor,
        },
        { text: medicine.dosage || "-", style: "tableCell", alignment: "center", fillColor },
        { text: String(medicine.quantity || 0), style: "tableCell", alignment: "center", fillColor },
        { text: formatCurrency(medicine.pricePerUnit), style: "tableCell", alignment: "right", fillColor },
        { text: formatCurrency(amount), style: "tableCellBold", alignment: "right", fillColor },
      ];
    }),
  ];

  return {
    pageSize: "A4",
    pageMargins: [40, 50, 40, 50],
    footer: (currentPage, pageCount) => ({
      margin: [40, 10, 40, 20],
      stack: [
        createDivider("#1E3A8A", 1.5, [0, 0, 0, 10]),
        {
          columns: [
            { width: "*", text: "Thank you for choosing Bhagyavati Drugs & Chemicals Pvt. Ltd.", style: "footerText" },
            { width: "auto", text: `Page ${currentPage} of ${pageCount}`, style: "footerText", alignment: "right" },
          ],
        },
        {
          text: "Contact: +91 9822848689 | contact@rxincredible.com | www.rxincredible.com",
          style: "footerText",
          margin: [0, 4, 0, 0],
        },
      ],
    }),
    content: [
      {
        columns: [
          {
            width: "*",
            columns: [
              ...(logoBase64
                ? [{ width: 84, image: logoBase64, fit: [72, 72], margin: [0, 0, 16, 0] }]
                : []),
              {
                width: "*",
                stack: [
                  { text: "Bhagyavati Drugs & Chemicals Pvt. Ltd.", style: "headerCompanyDark" },
                  { text: "234 Shree Nagar, Nagpur-440015, Maharashtra, India", style: "headerSubtext" },
                  { text: "Phone: +91 9822848689 | Email: contact@rxincredible.com", style: "headerSubtext" },
                  { text: "GST Number: 27AALCB2082P2Z4", style: "headerSubtextStrong" },
                ],
                margin: [0, 4, 0, 0],
              },
            ],
          },
          {
            width: 155,
            table: {
              widths: ["*"],
              body: [[{
                text: "QUOTATION",
                style: "headerTitleBadge",
                alignment: "center",
                border: [false, false, false, false],
                fillColor: "#163C8C",
                margin: [0, 18, 0, 18],
              }]],
            },
            layout: "noBorders",
          },
        ],
        margin: [0, 0, 0, 20],
      },
      createDivider("#1E3A8A", 2.5, [0, 0, 0, 18]),
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: "Customer Details", style: "sectionTitle" },
              {
                table: {
                  widths: ["*"],
                  body: [[{
                    border: [false, false, false, false],
                    fillColor: "#F3F8FF",
                    stack: [
                      { text: orderData?.patientName || "Customer Name", style: "customerName" },
                      { text: orderData?.patientEmail || "-", style: "detailText" },
                      { text: orderData?.patientPhone || "-", style: "detailText" },
                      { text: customerAddress || "-", style: "detailText", margin: [12, 4, 12, 12] },
                    ],
                  }]],
                },
                layout: "noBorders",
              },
            ],
          },
          { width: 18, text: "" },
          {
            width: "*",
            stack: [
              { text: "Quotation Details", style: "sectionTitle" },
              {
                table: {
                  widths: ["*"],
                  body: [[{
                    border: [false, false, false, false],
                    fillColor: "#F3F8FF",
                    stack: [
                      createDetailLine("Quotation Number", quotationNumber, "detailValueStrong"),
                      createDetailLine("Date", formatDate(orderData?.uploadedDate)),
                      createDetailLine("Service Type", getDisplayServiceType(orderData?.serviceType, userRole)),
                      createDetailLine("Payment Terms", "Due on Receipt"),
                    ],
                    margin: [12, 12, 12, 4],
                  }]],
                },
                layout: "noBorders",
              },
            ],
          },
        ],
        margin: [0, 0, 0, 22],
      },
      {
        table: {
          widths: ["auto", "*"],
          body: [[
            {
              text: "Medicine Summary",
              style: "sectionTitleCapsule",
              border: [false, false, false, false],
              fillColor: "#DDEBFF",
              margin: [12, 7, 12, 7],
            },
            { text: "", border: [false, false, false, false] },
          ]],
        },
        layout: "noBorders",
        margin: [0, 0, 0, 12],
      },
      {
        table: {
          headerRows: 1,
          dontBreakRows: false,
          widths: [36, "*", 68, 38, 72, 84],
          body: medicineTableBody,
        },
        layout: {
          hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 1.5 : 0.5),
          vLineWidth: () => 0,
          hLineColor: (i, node) => (i === 0 || i === node.table.body.length ? "#1E3A8A" : "#E5E7EB"),
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
        margin: [0, 0, 0, 20],
      },
      {
        columns: [
          {
            width: "*",
            table: {
              widths: ["*"],
              body: [[{
                text: "Prepared for timely medicine planning and order confirmation.",
                style: "noteText",
                border: [false, false, false, false],
                fillColor: "#F4F8FF",
                margin: [16, 14, 16, 14],
              }]],
            },
            layout: "noBorders",
          },
          {
            width: 238,
            table: {
              widths: ["*", "auto"],
              body: [
                [{ text: "Amount Summary", colSpan: 2, style: "summaryHeader", border: [false, false, false, false] }, {}],
                [
                  { text: "Subtotal", style: "totalLabel", border: [false, false, false, false] },
                  { text: formatCurrency(subtotal), style: "totalValue", alignment: "right", border: [false, false, false, false] },
                ],
                [
                  { text: "Delivery", style: "totalLabel", border: [false, false, false, false] },
                  { text: formatCurrency(deliveryCharge), style: "totalValue", alignment: "right", border: [false, false, false, false] },
                ],
                [
                  { text: "Grand Total", style: "grandTotalLabel", border: [false, false, false, false], fillColor: "#DDEBFF" },
                  { text: formatCurrency(total), style: "grandTotalValue", alignment: "right", border: [false, false, false, false], fillColor: "#DDEBFF" },
                ],
              ],
            },
            layout: {
              hLineWidth: (i) => (i === 1 ? 1 : i === 0 || i === 3 ? 0 : 0.6),
              vLineWidth: () => 0,
              hLineColor: (i) => (i === 1 ? "#B9D0F4" : "#D9E2EC"),
              paddingLeft: () => 16,
              paddingRight: () => 16,
              paddingTop: () => 11,
              paddingBottom: () => 11,
            },
          },
        ],
        margin: [0, 0, 0, 16],
      },
      {
        text: `Amount in Words: Rupees ${numberToWords(Math.round(total))} Only`,
        style: "amountWords",
        margin: [0, 0, 0, 12],
      },
    ],
    styles: {
      headerCompanyDark: { fontSize: 24, bold: true, color: "#1E3A8A", letterSpacing: 0.5 },
      headerSubtext: { fontSize: 10, color: "#486581", margin: [0, 5, 0, 0] },
      headerSubtextStrong: { fontSize: 10, color: "#1E3A8A", bold: true, margin: [0, 5, 0, 0] },
      headerTitleBadge: { fontSize: 20, bold: true, color: "#FFFFFF", letterSpacing: 2 },
      sectionTitle: { fontSize: 11, bold: true, color: "#1E3A8A", margin: [0, 0, 0, 10] },
      sectionTitleCapsule: { fontSize: 11, bold: true, color: "#1E3A8A" },
      customerName: { fontSize: 14, bold: true, color: "#1E3A8A", margin: [14, 14, 14, 8] },
      detailText: { fontSize: 9.5, color: "#486581", lineHeight: 1.35, margin: [14, 0, 14, 5] },
      detailLabel: { fontSize: 9, color: "#7B8794" },
      detailValue: { fontSize: 9, color: "#243B53" },
      detailValueStrong: { fontSize: 9, bold: true, color: "#102A43" },
      tableHeader: { fontSize: 9, bold: true, color: "#FFFFFF", fillColor: "#1E3A8A", margin: [0, 6, 0, 6] },
      tableCell: { fontSize: 9, color: "#243B53", margin: [0, 3, 0, 3] },
      tableSubCell: { fontSize: 8, color: "#7B8794", margin: [0, 2, 0, 0] },
      tableCellBold: { fontSize: 9, bold: true, color: "#102A43", margin: [0, 3, 0, 3] },
      noteText: { fontSize: 9.5, color: "#486581", lineHeight: 1.4 },
      summaryHeader: { fontSize: 10.5, bold: true, color: "#1E3A8A", margin: [0, 2, 0, 3] },
      totalLabel: { fontSize: 9.5, color: "#486581" },
      totalValue: { fontSize: 9.5, color: "#243B53" },
      grandTotalLabel: { fontSize: 12, bold: true, color: "#1E3A8A" },
      grandTotalValue: { fontSize: 12, bold: true, color: "#1E3A8A" },
      amountWords: { fontSize: 10, color: "#1E3A8A", italics: true, bold: true },
      footerText: { fontSize: 8, color: "#7B8794" },
    },
    defaultStyle: { font: "Roboto" },
  };
};

export const generatePDFBuffer = async (options) => {
  const docDefinition = await getDocDefinition(options);
  return new Promise((resolve, reject) => {
    try {
      pdfMake.createPdf(docDefinition).getBuffer((buffer) => resolve(buffer));
    } catch (error) {
      reject(error);
    }
  });
};

export const generatePDFBase64 = async (options) => {
  const buffer = await generatePDFBuffer(options);
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

export const downloadPDF = async (options, fileName) => {
  const docDefinition = await getDocDefinition(options);
  pdfMake.createPdf(docDefinition).download(fileName);
};
