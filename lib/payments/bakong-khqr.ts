import { createHash } from "crypto";

type BuildKhqrInput = {
  merchantId: string;
  merchantName: string;
  amount: number;
  currencyCode?: "USD" | "KHR";
  transactionRef: string;
};

export function buildBakongKhqr(input: BuildKhqrInput): string {
  const currencyCode = input.currencyCode ?? "USD";
  return [
    "000201",
    `010211`,
    `29${padLength(`0010KH_BAKONG01${input.merchantId}`)}`,
    `52${padLength("5812")}`,
    `53${padLength(currencyCode === "USD" ? "840" : "116")}`,
    `54${padLength(input.amount.toFixed(2))}`,
    `58${padLength("KH")}`,
    `59${padLength(input.merchantName)}`,
    `62${padLength(`0512${input.transactionRef.slice(0, 12)}`)}`,
    "6304",
  ].join("");
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
