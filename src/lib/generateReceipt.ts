// src/lib/generateReceipt.ts
// Generates a PDF receipt using jsPDF (works in Node.js — no DOM required).

import { jsPDF } from "jspdf";

const LEAF_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://leafenergy.app";

export type ReceiptData = {
  jobId: string;
  jobType: "hes" | "inspector";
  customerName: string;
  customerEmail: string | null;
  serviceName: string;
  address: string;
  scheduledDate: string;
  amountCents: number;
  paymentId: string;
  stripeSessionId: string;
  paidAt: string; // ISO timestamp
};

export async function generateReceiptPdf(data: ReceiptData): Promise<Buffer> {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 50;
  let y = 60;

  const amount = (data.amountCents / 100).toFixed(2);
  const paidDate = new Date(data.paidAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const receiptRef = data.stripeSessionId.slice(-12).toUpperCase();

  // ─── Company header ──────────────────────────────────────────────
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("LEAF Energy Services", margin, y);
  y += 18;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Renewable Energy Incentives", margin, y);
  y += 14;
  doc.text("support@renewableenergyincentives.com", margin, y);
  y += 30;

  // ─── "RECEIPT" title (right-aligned) ─────────────────────────────
  doc.setTextColor(16, 185, 129);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("RECEIPT", pageWidth - margin, y, { align: "right" });
  y += 10;

  // Divider
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 30;

  // ─── Receipt details ────────────────────────────────────────────
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  const valueX = margin + 130;

  const rows: [string, string][] = [
    ["Date:", paidDate],
    ["Receipt #:", receiptRef],
    ["Customer:", data.customerName],
    ["Email:", data.customerEmail || "N/A"],
    ["Service:", data.serviceName],
    ["Property:", data.address || "N/A"],
    ["Scheduled:", data.scheduledDate],
  ];

  for (const [label, value] of rows) {
    doc.setFont("helvetica", "bold");
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, valueX, y);
    y += 18;
  }

  y += 24;

  // ─── Line items table ───────────────────────────────────────────
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(60, 60, 60);
  doc.text("Description", margin, y);
  doc.text("Amount", pageWidth - margin, y, { align: "right" });
  y += 8;
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  doc.setFont("helvetica", "normal");
  doc.text(data.serviceName, margin, y);
  doc.text(`$${amount}`, pageWidth - margin, y, { align: "right" });
  y += 20;

  doc.line(margin, y, pageWidth - margin, y);
  y += 24;

  // ─── Total ──────────────────────────────────────────────────────
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60, 60, 60);
  doc.text("Total Paid:", pageWidth - margin - 150, y);
  doc.setTextColor(16, 185, 129);
  doc.text(`$${amount}`, pageWidth - margin, y, { align: "right" });
  y += 16;

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.text(`Payment ID: ${data.paymentId}`, pageWidth - margin, y, { align: "right" });
  y += 40;

  // ─── LEAF Report link ──────────────────────────────────────────
  const reportUrl = `${LEAF_APP_URL}/report/${data.jobId}`;
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "bold");
  doc.text("Your LEAF Home Energy Report:", margin, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(59, 130, 246);
  doc.textWithLink(reportUrl, margin, y, { url: reportUrl });
  y += 30;

  // ─── Footer ─────────────────────────────────────────────────────
  const footerY = doc.internal.pageSize.getHeight() - 60;
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text("Thank you for choosing LEAF Energy Services.", pageWidth / 2, footerY, { align: "center" });
  doc.text("This receipt was generated automatically.", pageWidth / 2, footerY + 14, { align: "center" });

  // Return as Buffer (Node-safe — no DOM required)
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
