import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatPrice, type Currency } from "@/lib/config/currency";

type InvoiceLineItem = {
  templateId: string;
  title: string;
  slug: string | null;
  category: string;
  licenseKey: string;
  amountUsd: number;
  currency: Currency;
};

type GenerateInvoiceInput = {
  transactionId: string;
  createdAt: Date;
  bankRef: string;
  amountUsd: number;
  currency: Currency;
  provider: string;
  customerEmail: string;
  lineItems: InvoiceLineItem[];
};

function wrapText(text: string, maxWidth: number, fontSize: number, measure: (value: string, size: number) => number): string[] {
  if (!text.trim()) {
    return [""];
  }

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate, fontSize) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
      continue;
    }

    let chunk = "";
    for (const char of word) {
      const candidateChunk = `${chunk}${char}`;
      if (measure(candidateChunk, fontSize) <= maxWidth) {
        chunk = candidateChunk;
      } else {
        lines.push(chunk);
        chunk = char;
      }
    }
    current = chunk;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

export async function generateInvoicePdf(input: GenerateInvoiceInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const monoFont = await pdf.embedFont(StandardFonts.Courier);

  const drawRow = (label: string, value: string, y: number) => {
    page.drawText(label, {
      x: 50,
      y,
      size: 10,
      font: boldFont,
      color: rgb(0.12, 0.16, 0.22),
    });

    page.drawText(value, {
      x: 190,
      y,
      size: 10,
      font,
      color: rgb(0.24, 0.3, 0.37),
    });
  };

  page.drawRectangle({
    x: 0,
    y: 730,
    width: 595,
    height: 112,
    color: rgb(0.07, 0.09, 0.13),
  });

  page.drawText("ANALITE KIT", {
    x: 50,
    y: 792,
    size: 11,
    font: boldFont,
    color: rgb(0.78, 0.83, 0.89),
  });

  page.drawText("Payment Receipt", {
    x: 50,
    y: 760,
    size: 28,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  page.drawText("Thank you for your purchase", {
    x: 50,
    y: 740,
    size: 11,
    font,
    color: rgb(0.86, 0.9, 0.95),
  });

  page.drawText(`Generated: ${input.createdAt.toISOString().replace("T", " ").slice(0, 19)} UTC`, {
    x: 360,
    y: 740,
    size: 10,
    font,
    color: rgb(0.86, 0.9, 0.95),
  });

  page.drawRectangle({
    x: 50,
    y: 660,
    width: 495,
    height: 1,
    color: rgb(0.87, 0.9, 0.94),
  });

  page.drawText("Billing Summary", {
    x: 50,
    y: 630,
    size: 13,
    font: boldFont,
    color: rgb(0.07, 0.09, 0.13),
  });

  drawRow("Transaction ID", input.transactionId, 604);
  drawRow("Customer", input.customerEmail, 584);
  drawRow("Provider", input.provider.toUpperCase(), 564);
  drawRow("Bank Reference", input.bankRef || "Pending", 544);
  drawRow("Items", String(input.lineItems.length), 524);
  drawRow("Total (USD)", formatPrice(input.amountUsd, "USD"), 504);
  drawRow("Total (Selected Currency)", formatPrice(input.amountUsd, input.currency), 484);

  page.drawRectangle({
    x: 50,
    y: 250,
    width: 495,
    height: 210,
    color: rgb(0.97, 0.98, 1),
  });
  page.drawRectangle({
    x: 50,
    y: 250,
    width: 495,
    height: 1,
    color: rgb(0.85, 0.89, 0.95),
  });
  page.drawRectangle({
    x: 50,
    y: 459,
    width: 495,
    height: 1,
    color: rgb(0.85, 0.89, 0.95),
  });

  page.drawText("Purchased Templates", {
    x: 64,
    y: 442,
    font: boldFont,
    size: 10,
    color: rgb(0.07, 0.09, 0.13),
  });

  const visibleItems = input.lineItems.slice(0, 4);
  let itemY = 424;
  for (const item of visibleItems) {
    const titleLines = wrapText(item.title, 280, 10, (value, size) => boldFont.widthOfTextAtSize(value, size));

    page.drawText(`• ${titleLines[0] ?? item.title}`, {
      x: 64,
      y: itemY,
      size: 10,
      font: boldFont,
      color: rgb(0.12, 0.16, 0.22),
    });

    if (titleLines.length > 1) {
      for (const line of titleLines.slice(1, 2)) {
        itemY -= 12;
        page.drawText(line, {
          x: 76,
          y: itemY,
          size: 10,
          font: boldFont,
          color: rgb(0.12, 0.16, 0.22),
        });
      }
    }

    const slugText = item.slug ? `/${item.slug}` : "(no slug)";
    page.drawText(`ID: ${item.templateId.slice(0, 8)}...  Slug: ${slugText}`, {
      x: 76,
      y: itemY - 12,
      size: 9,
      font,
      color: rgb(0.34, 0.4, 0.47),
    });

    page.drawText(`Category: ${item.category}  License: ${item.licenseKey.slice(0, 12)}...`, {
      x: 76,
      y: itemY - 24,
      size: 9,
      font,
      color: rgb(0.34, 0.4, 0.47),
    });

    page.drawText(formatPrice(item.amountUsd, "USD"), {
      x: 460,
      y: itemY - 6,
      size: 10,
      font: boldFont,
      color: rgb(0.09, 0.13, 0.19),
    });

    itemY -= 44;
    if (itemY < 286) {
      break;
    }
  }

  if (input.lineItems.length > visibleItems.length) {
    page.drawText(`+ ${input.lineItems.length - visibleItems.length} more item(s) included in this transaction`, {
      x: 64,
      y: 274,
      size: 9,
      font,
      color: rgb(0.34, 0.4, 0.47),
    });
  }

  page.drawText("Receipt Note", {
    x: 50,
    y: 218,
    size: 10,
    font: boldFont,
    color: rgb(0.07, 0.09, 0.13),
  });

  const noteLines = [
    "This receipt confirms successful digital payment for your template purchase.",
    "Keep this file for billing records, licensing verification, and support requests.",
  ];

  let noteY = 202;
  for (const line of noteLines) {
    page.drawText(line, {
      x: 50,
      y: noteY,
      size: 10,
      font,
      color: rgb(0.25, 0.29, 0.34),
    });
    noteY -= 14;
  }

  page.drawText(`Receipt #${input.transactionId.slice(0, 12).toUpperCase()}`, {
    x: 50,
    y: 70,
    size: 10,
    font: monoFont,
    color: rgb(0.35, 0.4, 0.46),
  });

  page.drawText("Support: support@analite.store", {
    x: 50,
    y: 54,
    size: 10,
    font,
    color: rgb(0.35, 0.4, 0.46),
  });

  return pdf.save();
}
