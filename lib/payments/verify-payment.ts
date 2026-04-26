import { createHmac, timingSafeEqual } from "crypto";

function safeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyPaymentSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const normalizedSignature = signature.trim().replace(/^sha256=/i, "");
  const hmac = createHmac("sha256", secret).update(payload);
  const hexDigest = hmac.digest("hex");
  const base64Digest = createHmac("sha256", secret).update(payload).digest("base64");

  return safeCompare(hexDigest, normalizedSignature) || safeCompare(base64Digest, normalizedSignature);
}
