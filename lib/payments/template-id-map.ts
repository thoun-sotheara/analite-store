import { createHash } from "crypto";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function applyUuidV5Bits(hex32: string): string {
  const chars = hex32.toLowerCase().split("");
  chars[12] = "5";
  const variant = parseInt(chars[16], 16);
  chars[16] = ((variant & 0x3) | 0x8).toString(16);
  const normalized = chars.join("");

  return [
    normalized.slice(0, 8),
    normalized.slice(8, 12),
    normalized.slice(12, 16),
    normalized.slice(16, 20),
    normalized.slice(20, 32),
  ].join("-");
}

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function toDbTemplateId(templateId: string): string {
  const normalized = templateId.trim().toLowerCase();
  if (isUuid(normalized)) {
    return normalized;
  }

  const hex32 = createHash("sha1").update(`analite:${normalized}`).digest("hex").slice(0, 32);
  return applyUuidV5Bits(hex32);
}
