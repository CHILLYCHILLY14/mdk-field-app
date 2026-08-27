import { displayDate, money, quoteTotals, timesheetTotals, workOrderTotals } from "./data.js";

const MARGIN = 14;
const PAGE_BOTTOM = 270;
let logoDataUrl;

async function getLogo() {
  if (logoDataUrl) return logoDataUrl;
  const response = await fetch(new URL("./assets/mdk-logo.jpg", import.meta.url));
  const blob = await response.blob();
  logoDataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  return logoDataUrl;
}

function clean(value) {
  return String(value ?? "").trim() || "—";
}

function safeFilename(value) {
  return clean(value).replace(/[^a-z0-9_-]+/gi, "_");
}

function fileInfo(type, doc) {
  const labels = { workOrders: "Work_Order", timesheets: "Timesheet", quotes: "Quote" };
  return { filename: `${labels[type]}_${safeFilename(doc.number)}.pdf`, title: `${labels[type].replace("_", " ")} ${clean(doc.number)}` };
}

function addCompanyHeader(pdf, settings, title, number) {
  try { pdf.addImage(logoDataUrl, "JPEG", MARGIN, 10, 41, 20); } catch { /* text header remains */ }
  pdf.setTextColor(10, 34, 50);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text(title.toUpperCase(), 202, 16, { align: "right" });
  pdf.setFontSize(10);
  pdf.setTextColor(0, 139, 185);
  pdf.text(clean(number), 202, 22, { align: "right" });
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(75, 91, 103);
  pdf.setFontSize(7.6);
  pdf.text(`${settings.companyName}  •  ${settings.phone}  •  ${settings.email}`, 202, 28, { align: "right" });
  pdf.setDrawColor(24, 177, 221);
  pdf.setLineWidth(0.6);
  pdf.line(MARGIN, 34, 202, 34);
  return 40;
}

function addFooter(pdf, settings) {
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(205, 216, 224);
    pdf.setLineWidth(0.25);
    pdf.line(MARGIN, 276, 202, 276);
    pdf.setTextColor(95, 108, 117);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.text(`${settings.companyName} • HST ${settings.hstNumber}`, MARGIN, 281);
    pdf.text(`Page ${page} of ${pages}`, 202, 281, { align: "right" });
  }
}

function ensureSpace(pdf, y, required, settings, title, number) {
  if (y + required <= PAGE_BOTTOM) return y;
  pdf.addPage();
  return addCompanyHeader(pdf, settings, title, number);
}

function sectionTitle(pdf, title, y, settings, docTitle, number) {
  y = ensureSpace(pdf, y, 12, settings, docTitle, number);
  pdf.setFillColor(9, 38, 58);
  pdf.roundedRect(MARGIN, y, 188, 8, 1.5, 1.5, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.text(title.toUpperCase(), MARGIN + 3, y + 5.4);
  return y + 12;
}

function infoGrid(pdf, pairs, y, columns, settings, docTitle, number) {
  const width = 188 / columns;
  const rows = Math.ceil(pairs.length / columns);
  const height = rows * 14;
  y = ensureSpace(pdf, y, height + 3, settings, docTitle, number);
  pairs.forEach(([label, value], index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = MARGIN + col * width;
    const top = y + row * 14;
    pdf.setDrawColor(210, 221, 228);
    pdf.rect(x, top, width, 14);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.8);
    pdf.setTextColor(65, 85, 98);
    pdf.text(String(label).toUpperCase(), x + 2.5, top + 4);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(12, 27, 38);
    pdf.text(pdf.splitTextToSize(clean(value), width - 5).slice(0, 2), x + 2.5, top + 8.2);
  });
  return y + height + 4;
}

function notesBlock(pdf, label, value, y, settings, docTitle, number) {
  const lines = pdf.splitTextToSize(clean(value), 182);
  const height = Math.max(18, lines.length * 4.2 + 9);
  y = ensureSpace(pdf, y, height + 3, settings, docTitle, number);
  pdf.setDrawColor(210, 221, 228);
  pdf.rect(MARGIN, y, 188, height);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(60, 80, 93);
  pdf.setFontSize(6.8);
  pdf.text(label.toUpperCase(), MARGIN + 3, y + 4.5);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(12, 27, 38);
  pdf.setFontSize(8.5);
  pdf.text(lines, MARGIN + 3, y + 9);
  return y + height + 4;
}

function table(pdf, headers, rows, widths, y, settings, docTitle, number) {
  const scale = 188 / widths.reduce((sum, width) => sum + width, 0);
  const cellWidths = widths.map(width => width * scale);
  const drawHeader = () => {
    pdf.setFillColor(215, 239, 247);
    pdf.rect(MARGIN, y, 188, 8, "F");
    let x = MARGIN;
    headers.forEach((header, index) => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.7);
      pdf.setTextColor(25, 58, 75);
      pdf.text(String(header).toUpperCase(), x + 2, y + 5.2);
      x += cellWidths[index];
    });
    y += 8;
  };

  y = ensureSpace(pdf, y, 18, settings, docTitle, number);
  drawHeader();
  const safeRows = rows.length ? rows : [headers.map((_, index) => index ? "" : "No entries")];
  safeRows.forEach(row => {
    const wrapped = row.map((value, index) => pdf.splitTextToSize(clean(value), cellWidths[index] - 4));
    const rowHeight = Math.max(8, Math.max(...wrapped.map(lines => lines.length)) * 3.6 + 3.5);
    if (y + rowHeight > PAGE_BOTTOM) {
      pdf.addPage();
      y = addCompanyHeader(pdf, settings, docTitle, number);
      drawHeader();
    }
    let x = MARGIN;
    wrapped.forEach((lines, index) => {
      pdf.setDrawColor(218, 226, 232);
      pdf.rect(x, y, cellWidths[index], rowHeight);
      pdf.setTextColor(20, 33, 42);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.2);
      pdf.text(lines, x + 2, y + 4.7);
      x += cellWidths[index];
    });
    y += rowHeight;
  });
  return y + 5;
}

function totalsBlock(pdf, lines, y, settings, docTitle, number) {
  const height = lines.length * 7 + 4;
  y = ensureSpace(pdf, y, height + 2, settings, docTitle, number);
  const x = 116;
  const width = 86;
  lines.forEach(([label, value, emphasized], index) => {
    const top = y + index * 7;
    if (emphasized) {
      pdf.setFillColor(9, 38, 58);
      pdf.rect(x, top, width, 7, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
    } else {
      pdf.setTextColor(35, 53, 64);
      pdf.setFont("helvetica", "normal");
    }
    pdf.setFontSize(8.2);
    pdf.text(label, x + 2.5, top + 4.8);
    pdf.text(String(value), x + width - 2.5, top + 4.8, { align: "right" });
  });
  return y + height + 2;
}

function addressLines(address) {
  return [address.name, address.company, address.addressLine1, address.addressLine2,
    [address.city, address.provinceState, address.postalCode].filter(Boolean).join(", "),
    address.country, address.phone, address.email].filter(value => String(value || "").trim()).join("\n");
}

export async function makePdf(type, doc, settings) {
  if (!window.jspdf?.jsPDF) throw new Error("The PDF creator did not load. Refresh and try again.");
  logoDataUrl = await getLogo();
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: "mm", format: "letter", compress: true });
  const info = fileInfo(type, doc);
  const title = type === "workOrders" ? "Work Order" : type === "timesheets" ? "Timesheet" : "Quote";
  let y = addCompanyHeader(pdf, settings, title, doc.number);

  if (type === "workOrders") {
    const totals = workOrderTotals(doc);
    y = infoGrid(pdf, [["Customer", doc.customer], ["Job No.", doc.jobNumber], ["Date", displayDate(doc.date)], ["Completed By", doc.completedBy], ["Incident No.", doc.incidentNumber], ["Status", doc.status]], y, 3, settings, title, doc.number);
    y = notesBlock(pdf, "Work completed", doc.workCompleted, y, settings, title, doc.number);
    y = sectionTitle(pdf, "Materials", y, settings, title, doc.number);
    y = table(pdf, ["Qty", "Description", "Unit Cost", "Extension"], doc.materials.map(row => [row.quantity, row.description, money(row.unitCost), money((Number(row.quantity) || 0) * (Number(row.unitCost) || 0))]), [18, 90, 36, 38], y, settings, title, doc.number);
    y = sectionTitle(pdf, "Labour", y, settings, title, doc.number);
    y = table(pdf, ["Date", "Name", "Hours", "Rate", "Extension"], doc.labour.map(row => [displayDate(row.date), row.name, row.hours, money(row.hourlyRate), money((Number(row.hours) || 0) * (Number(row.hourlyRate) || 0))]), [33, 55, 22, 34, 38], y, settings, title, doc.number);
    y = sectionTitle(pdf, "Expenses", y, settings, title, doc.number);
    y = table(pdf, ["Date", "Name", "Description", "Amount"], doc.expenses.map(row => [displayDate(row.date), row.employeeName, row.description, money(row.amount)]), [32, 42, 80, 34], y, settings, title, doc.number);
    y = totalsBlock(pdf, [["Material", money(totals.material)], ["Labour", money(totals.labour)], ["Expenses", money(totals.expenses)], ["Subtotal", money(totals.subtotal)], [`HST (${((Number(doc.taxRate) || 0) * 100).toFixed(1)}%)`, money(totals.tax)], ["AMOUNT OWING", money(totals.total), true]], y, settings, title, doc.number);
    y = infoGrid(pdf, [["Authorized By", doc.authorizedBy], ["Customer PO", doc.customerPO], ["Date", displayDate(doc.authorizationDate)]], y, 3, settings, title, doc.number);
    if (doc.internalNotes) notesBlock(pdf, "Internal notes", doc.internalNotes, y, settings, title, doc.number);
  }

  if (type === "timesheets") {
    const totals = timesheetTotals(doc);
    y = infoGrid(pdf, [["Employee", doc.employee], ["Week Ending", displayDate(doc.weekEnding)], ["Status", doc.status]], y, 3, settings, title, doc.number);
    y = table(pdf, ["Day / Date", "Customer / PO", "Job Description", "Reg", "1.5", "2.0", "Expenses"], doc.entries.map(row => [displayDate(row.date), row.customerPO, row.jobDescription, row.regularHours, row.overtimeHours, row.doubleTimeHours, money(row.expenses)]), [32, 35, 58, 14, 14, 14, 24], y, settings, title, doc.number);
    y = totalsBlock(pdf, [["Regular Hours", totals.regular.toFixed(2)], ["1.5x Hours", totals.overtime.toFixed(2)], ["2x Hours", totals.doubleTime.toFixed(2)], ["Total Hours", totals.totalHours.toFixed(2), true], ["Expenses", money(totals.expenses)]], y, settings, title, doc.number);
    y = infoGrid(pdf, [["Signature", doc.signatureName], ["Date", displayDate(doc.signedDate)]], y, 2, settings, title, doc.number);
    if (doc.notes) notesBlock(pdf, "Notes", doc.notes, y, settings, title, doc.number);
  }

  if (type === "quotes") {
    const totals = quoteTotals(doc);
    y = infoGrid(pdf, [["Date", displayDate(doc.date)], ["Valid Until", displayDate(doc.validUntil)], ["Customer ID", doc.customerID], ["Purchase Order", doc.purchaseOrder], ["Currency", doc.currencyCode], ["Status", doc.status]], y, 3, settings, title, doc.number);
    const shipping = doc.useBillingForShipping ? doc.billedTo : doc.shipTo;
    y = infoGrid(pdf, [["Billed To", addressLines(doc.billedTo)], ["Ship To", addressLines(shipping)]], y, 2, settings, title, doc.number);
    y = sectionTitle(pdf, "Items", y, settings, title, doc.number);
    y = table(pdf, ["Description", "Unit Cost", "Qty", "Amount"], doc.items.map(row => [row.description, money(row.unitCost, doc.currencyCode), row.quantity, money((Number(row.unitCost) || 0) * (Number(row.quantity) || 0), doc.currencyCode)]), [104, 32, 18, 34], y, settings, title, doc.number);
    y = totalsBlock(pdf, [["Subtotal", money(totals.subtotal, doc.currencyCode)], ["Discount", money(-Number(doc.discountAmount || 0), doc.currencyCode)], [`Tax (${((Number(doc.taxRate) || 0) * 100).toFixed(1)}%)`, money(totals.tax, doc.currencyCode)], ["TOTAL", money(totals.total, doc.currencyCode), true]], y, settings, title, doc.number);
    if (doc.specialNotes) notesBlock(pdf, "Special notes and instructions", doc.specialNotes, y, settings, title, doc.number);
  }

  addFooter(pdf, settings);
  pdf.setProperties({ title: info.title, subject: `${settings.companyName} field document`, author: settings.companyName, creator: "MDK Field Web App" });
  return { pdf, ...info };
}

export async function savePdf(type, doc, settings) {
  const result = await makePdf(type, doc, settings);
  result.pdf.save(result.filename);
  return result.filename;
}

export async function sharePdf(type, doc, settings) {
  const result = await makePdf(type, doc, settings);
  const blob = result.pdf.output("blob");
  const file = new File([blob], result.filename, { type: "application/pdf" });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title: result.title, text: `${settings.companyName} — ${result.title}`, files: [file] });
    return { shared: true, filename: result.filename };
  }
  result.pdf.save(result.filename);
  return { shared: false, filename: result.filename };
}
