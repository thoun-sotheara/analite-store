import { createHash } from "node:crypto";
import nodemailer from "nodemailer";

export function hashVerificationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function sendVerificationEmail(params: {
  to: string;
  verificationUrl: string;
}): Promise<boolean> {
  const host = process.env.EMAIL_SERVER_HOST;
  const portRaw = process.env.EMAIL_SERVER_PORT;
  const user = process.env.EMAIL_SERVER_USER;
  const pass = process.env.EMAIL_SERVER_PASSWORD;
  const from = process.env.EMAIL_FROM;

  if (!host || !portRaw || !user || !pass || !from) {
    return false;
  }

  const port = Number(portRaw);
  const secure = port === 465;

  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  await transport.sendMail({
    from,
    to: params.to,
    subject: "Verify your Analite Kit email",
    text: [
      "Welcome to Analite Kit!",
      "",
      "Please verify your email before signing in:",
      params.verificationUrl,
      "",
      "This link expires in 24 hours.",
    ].join("\n"),
    html: `
      <p>Welcome to Analite Kit!</p>
      <p>Please verify your email before signing in:</p>
      <p><a href="${params.verificationUrl}">Verify Email</a></p>
      <p>This link expires in 24 hours.</p>
    `,
  });

  return true;
}
