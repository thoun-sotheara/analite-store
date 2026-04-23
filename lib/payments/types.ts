export type PaymentProvider = "aba" | "bakong";

export type PaymentSession = {
  ok: boolean;
  provider: PaymentProvider;
  transactionId: string;
  amount: number;
  khqrString: string;
  qrImageUrl: string;
  expiresAt: string;
  message?: string;
};

export const emptyPaymentSession: PaymentSession = {
  ok: false,
  provider: "bakong",
  transactionId: "",
  amount: 0,
  khqrString: "",
  qrImageUrl: "",
  expiresAt: "",
  message: "Waiting for checkout initialization.",
};
