export const SUPPORTED_CURRENCIES = ["USD", "KHR"] as const;

export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = "USD";

export const KHR_PER_USD = Number(process.env.NEXT_PUBLIC_KHR_PER_USD ?? "4100");

export function formatPrice(usdAmount: number, currency: Currency): string {
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(usdAmount);
  }

  const khrAmount = Math.round(usdAmount * KHR_PER_USD);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "KHR",
    maximumFractionDigits: 0,
  }).format(khrAmount);
}
