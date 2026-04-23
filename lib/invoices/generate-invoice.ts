import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatPrice, type Currency } from "@/lib/config/currency";

type GenerateInvoiceInput = {
  transactionId: string;
  createdAt: Date;
  bankRef: string;
  amountUsd: number;
  currency: Currency;
};

export async function generateInvoicePdf(input: GenerateInvoiceInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawText("Analite Store Invoice", {
    x: 50,
    y: 780,
    size: 20,
    font: boldFont,
    color: rgb(0.07, 0.09, 0.13),
  });

  const rows = [
    ["Transaction ID", input.transactionId],
    ["Date", input.createdAt.toISOString()],
    ["Bank Reference", input.bankRef || "Pending"],
    ["Total (USD)", formatPrice(input.amountUsd, "USD")],
    ["Total (Dual Currency)", formatPrice(input.amountUsd, input.currency)],
  ];

  let y = 730;
  for (const [label, value] of rows) {
    page.drawText(label, {
      x: 50,
      y,
      size: 11,
      font: boldFont,
      color: rgb(0.07, 0.09, 0.13),
    });
    page.drawText(value, {
      x: 220,
      y,
      size: 11,
      font,
      color: rgb(0.25, 0.29, 0.34),
    });
    y -= 28;
  }

  return pdf.save();
}
