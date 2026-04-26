import nodemailer from "nodemailer";

type SendPaymentConfirmationInput = {
  recipientEmail: string;
  recipientName?: string;
  transactionId: string;
  amount: string;
  templates: Array<{ title: string; quantity: number }>;
};

function createTransporter() {
  const host = process.env.EMAIL_SERVER_HOST;
  const port = Number(process.env.EMAIL_SERVER_PORT ?? "587");
  const user = process.env.EMAIL_SERVER_USER;
  const pass = process.env.EMAIL_SERVER_PASSWORD;

  if (!host || !port || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendPaymentConfirmation(input: SendPaymentConfirmationInput): Promise<{ ok: boolean; error?: string }> {
  const transporter = createTransporter();
  if (!transporter) {
    console.log("[payments] Email service not configured, skipping confirmation email");
    return { ok: true };
  }

  const from = process.env.EMAIL_FROM ?? "noreply@analite.store";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "https://analite.store";

  const templateList = input.templates
    .map((t) => `<li>${t.title}${t.quantity > 1 ? ` (qty: ${t.quantity})` : ""}</li>`)
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0b3b8f; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f5f9ff; padding: 20px; border-radius: 0 0 8px 8px; }
    .amount { font-size: 32px; font-weight: bold; color: #0b3b8f; margin: 20px 0; }
    .button { display: inline-block; background: #0b3b8f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { font-size: 12px; color: #999; margin-top: 30px; text-align: center; }
    ul { margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Payment Confirmed ✓</h1>
    </div>
    <div class="content">
      <p>Hi ${input.recipientName || "there"},</p>
      
      <p>Your payment has been successfully processed! Your purchased templates are now ready for download.</p>
      
      <div class="amount">$${input.amount} USD</div>
      
      <p><strong>Transaction ID:</strong> ${input.transactionId}</p>
      
      <p><strong>Items purchased:</strong></p>
      <ul>
        ${templateList}
      </ul>
      
      <p>
        <a href="${siteUrl}/library" class="button">View My Library</a>
      </p>
      
      <p>Your files are available for download in your library. You can access them anytime from your account.</p>
      
      <p>Thank you for your purchase!</p>
      
      <div class="footer">
        <p>Analite Kit • Premium Template Marketplace</p>
        <p>© ${new Date().getFullYear()} All rights reserved</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  try {
    await transporter.sendMail({
      from,
      to: input.recipientEmail,
      subject: `Payment Confirmed: Your Templates are Ready (${input.transactionId.slice(0, 8)})`,
      html,
    });
    return { ok: true };
  } catch (error) {
    console.error("[payments] Failed to send confirmation email:", error);
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
