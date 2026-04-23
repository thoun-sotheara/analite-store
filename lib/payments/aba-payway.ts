import { createHmac } from "crypto";

type CreateAbaPaymentInput = {
  merchantId: string;
  amount: number;
  transactionId: string;
  returnUrl: string;
};

export function createAbaPaymentPayload(input: CreateAbaPaymentInput) {
  const payload = {
    merchant_id: input.merchantId,
    tran_id: input.transactionId,
    amount: input.amount.toFixed(2),
    return_url: input.returnUrl,
    req_time: new Date().toISOString(),
  };

  return payload;
}

export function signAbaPayload(payload: Record<string, string>, secretKey: string) {
  const payloadString = Object.keys(payload)
    .sort()
    .map((key) => `${key}=${payload[key]}`)
    .join("&");

  return createHmac("sha256", secretKey).update(payloadString).digest("hex");
}
