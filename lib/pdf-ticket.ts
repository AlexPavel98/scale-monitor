import { jsPDF } from "jspdf";
import type { Weighing } from "@/lib/supabase";
import { formatKg, formatDateTime, formatM3 } from "@/lib/format";

type CompanyInfo = {
  name: string;
  address1: string;
  address2: string;
  phone?: string;
  cvr?: string;
};

export function generateTicketPdf(
  weighing: Weighing,
  companyInfo?: CompanyInfo,
  operatorName?: string,
  lang: string = "da"
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 25;
  const marginRight = 25;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let y = 30;

  // --- Company header ---
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  if (companyInfo?.name) {
    doc.text(companyInfo.name, pageWidth / 2, y, { align: "center" });
    y += 7;
  }

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  if (companyInfo?.address1) {
    doc.text(companyInfo.address1, pageWidth / 2, y, { align: "center" });
    y += 5;
  }
  if (companyInfo?.address2) {
    doc.text(companyInfo.address2, pageWidth / 2, y, { align: "center" });
    y += 5;
  }
  if (companyInfo?.phone) {
    doc.text(`Tlf: ${companyInfo.phone}`, pageWidth / 2, y, {
      align: "center",
    });
    y += 5;
  }
  if (companyInfo?.cvr) {
    doc.text(`CVR: ${companyInfo.cvr}`, pageWidth / 2, y, {
      align: "center",
    });
    y += 5;
  }

  y += 4;

  // --- Title ---
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  const title = lang === "da" ? "VEJESEDDEL" : "WEIGHING RECEIPT";
  doc.text(title, pageWidth / 2, y, { align: "center" });
  y += 10;

  // --- Weighing number ---
  doc.setFontSize(20);
  doc.text(`#${weighing.weighing_number}`, pageWidth / 2, y, {
    align: "center",
  });
  y += 12;

  // --- Separator line ---
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 8;

  // --- Detail rows ---
  doc.setFontSize(10);

  function addRow(label: string, value: string, bold = false) {
    doc.setFont("helvetica", "normal");
    doc.text(label, marginLeft, y);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(value, pageWidth - marginRight, y, { align: "right" });
    y += 6;
  }

  const lbl = lang === "da"
    ? {
        date: "Dato",
        date2: "Dato (2)",
        vehicle: "Bil",
        carrier: "Vognmand",
        customer: "Kunde",
        product: "Vare",
        direction: "Retning",
        dirIn: "Indvejning",
        dirOut: "Udvejning",
        firstWeighing: "1. vejning",
        secondWeighing: "2. vejning",
        net: "Netto",
        volume: "Volumen",
        deliveryNote: "Følgeseddel",
        notes: "Bemærkninger",
        operator: "Operatør",
      }
    : {
        date: "Date",
        date2: "Date (2)",
        vehicle: "Vehicle",
        carrier: "Carrier",
        customer: "Customer",
        product: "Product",
        direction: "Direction",
        dirIn: "Weigh in",
        dirOut: "Weigh out",
        firstWeighing: "1st weighing",
        secondWeighing: "2nd weighing",
        net: "Net",
        volume: "Volume",
        deliveryNote: "Delivery note",
        notes: "Notes",
        operator: "Operator",
      };

  addRow(lbl.date, formatDateTime(weighing.first_date, lang));
  if (weighing.second_date) {
    addRow(lbl.date2, formatDateTime(weighing.second_date, lang));
  }

  y += 2;

  addRow(lbl.vehicle, weighing.plate_number || "-");
  addRow(lbl.carrier, weighing.carrier_name || "-");

  y += 2;

  addRow(
    lbl.customer,
    [weighing.customer_number, weighing.customer_name]
      .filter(Boolean)
      .join(" - ") || "-"
  );
  addRow(
    lbl.product,
    [weighing.product_number, weighing.product_name]
      .filter(Boolean)
      .join(" - ") || "-"
  );

  y += 2;

  addRow(
    lbl.direction,
    weighing.direction === "in" ? lbl.dirIn : lbl.dirOut
  );

  // --- Weights section ---
  y += 4;
  doc.setDrawColor(180);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 8;

  addRow(lbl.firstWeighing, formatKg(weighing.first_weight));
  addRow(lbl.secondWeighing, formatKg(weighing.second_weight));

  // Bold separator for net
  y += 2;
  doc.setDrawColor(0);
  doc.setLineWidth(0.8);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 8;

  // Net weight — large and bold
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(lbl.net, marginLeft, y);
  const netWeight =
    weighing.net_weight ??
    (weighing.first_weight != null && weighing.second_weight != null
      ? Math.abs(weighing.first_weight - weighing.second_weight)
      : null);
  doc.text(formatKg(netWeight), pageWidth - marginRight, y, {
    align: "right",
  });
  y += 8;

  doc.setDrawColor(0);
  doc.setLineWidth(0.8);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 8;

  doc.setFontSize(10);

  if (weighing.volume_m3 != null) {
    addRow(lbl.volume, formatM3(weighing.volume_m3));
  }

  // --- Optional fields ---
  if (weighing.delivery_note) {
    addRow(lbl.deliveryNote, weighing.delivery_note);
  }
  if (weighing.notes) {
    addRow(lbl.notes, weighing.notes);
  }

  // --- Separator ---
  y += 4;
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 8;

  if (operatorName) {
    addRow(lbl.operator, operatorName);
  }

  // --- Footer ---
  y += 10;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(140);
  doc.text(
    `Scale Monitor — ${new Date().getFullYear()}`,
    pageWidth / 2,
    y,
    { align: "center" }
  );

  // --- Download ---
  doc.save(`vejeseddel_${weighing.weighing_number}.pdf`);
}

export function generateStatisticsPdf(
  weighings: Array<{
    weighing_number: number;
    first_date: string | null;
    plate_number?: string | null;
    customer_name?: string | null;
    product_name?: string | null;
    net_weight?: number | null;
    volume_m3?: number | null;
    direction: string;
  }>,
  dateFrom: string,
  dateTo: string,
  lang: string = "da"
) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 15;
  let y = 20;

  // Title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  const title =
    lang === "da"
      ? `Vejestatistik ${dateFrom} – ${dateTo}`
      : `Weighing Statistics ${dateFrom} – ${dateTo}`;
  doc.text(title, pageWidth / 2, y, { align: "center" });
  y += 10;

  // Summary
  const totalKg = weighings.reduce((s, w) => s + (w.net_weight || 0), 0);
  const totalM3 = weighings.reduce((s, w) => s + (w.volume_m3 || 0), 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${lang === "da" ? "Antal" : "Count"}: ${weighings.length}  |  ${
      lang === "da" ? "Total vægt" : "Total weight"
    }: ${formatKg(totalKg)}  |  ${
      lang === "da" ? "Total volumen" : "Total volume"
    }: ${formatM3(totalM3)}`,
    pageWidth / 2,
    y,
    { align: "center" }
  );
  y += 10;

  // Table headers
  const headers =
    lang === "da"
      ? ["Nr.", "Dato", "Nummerplade", "Kunde", "Vare", "Netto (kg)", "m³", "Retning"]
      : ["No.", "Date", "Plate", "Customer", "Product", "Net (kg)", "m³", "Direction"];

  const colX = [15, 30, 70, 105, 150, 195, 225, 250];

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  headers.forEach((h, i) => {
    doc.text(h, colX[i], y);
  });
  y += 2;
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.line(marginLeft, y, pageWidth - 15, y);
  y += 5;

  // Table rows
  doc.setFont("helvetica", "normal");
  const pageHeight = doc.internal.pageSize.getHeight();

  for (const w of weighings) {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }

    const row = [
      String(w.weighing_number),
      w.first_date ? w.first_date.slice(0, 10) : "",
      (w.plate_number || "-").slice(0, 15),
      (w.customer_name || "-").slice(0, 20),
      (w.product_name || "-").slice(0, 20),
      w.net_weight != null ? String(Math.round(w.net_weight)) : "-",
      w.volume_m3 != null ? w.volume_m3.toFixed(1) : "-",
      w.direction === "in"
        ? lang === "da"
          ? "Ind"
          : "In"
        : lang === "da"
          ? "Ud"
          : "Out",
    ];

    row.forEach((val, i) => {
      doc.text(val, colX[i], y);
    });
    y += 5;
  }

  // Footer
  y += 5;
  doc.setFontSize(7);
  doc.setTextColor(140);
  doc.text(
    `Scale Monitor — ${new Date().getFullYear()}`,
    pageWidth / 2,
    y,
    { align: "center" }
  );

  doc.save(`weighings_${dateFrom}_${dateTo}.pdf`);
}
