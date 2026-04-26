import { createHash } from "crypto";

type BuildKhqrInput = {
  merchantId: string;
  merchantName: string;
  amount: number;
  currencyCode?: "USD" | "KHR";
  transactionRef: string;
};

/**
 * EMVCo CRC-16/CCITT-FALSE  (poly=0x1021, init=0xFFFF, refIn=false, refOut=false, xorOut=0x0000)
 * Required by the KHQR / Bakong QR spec. Applied to the entire payload including the "6304" tag.
 */
function emvcoCrc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function buildBakongKhqr(input: BuildKhqrInput): string {
  const currencyCode = input.currencyCode ?? "USD";

  const withoutCrc = [
    "000201",
    "010211",
    `29${padLength(`0010KH_BAKONG01${input.merchantId}`)}`,
    `52${padLength("5812")}`,
    `53${padLength(currencyCode === "USD" ? "840" : "116")}`,
    `54${padLength(input.amount.toFixed(2))}`,
    `58${padLength("KH")}`,
    `59${padLength(input.merchantName)}`,
    `62${padLength(`0512${input.transactionRef.slice(0, 12)}`)}`,
    "6304",
  ].join("");

  return withoutCrc + emvcoCrc16(withoutCrc);
}

export function getKhqrImageUrl(khqrString: string): string {
  const encoded = encodeURIComponent(khqrString);
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encoded}`;
}

export function hashKhqrPayload(khqrString: string): string {
  return createHash("sha256").update(khqrString).digest("hex");
}

function padLength(value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${len}${value}`;
}
