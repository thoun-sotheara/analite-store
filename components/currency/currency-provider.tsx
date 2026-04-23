"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_CURRENCY,
  formatPrice,
  type Currency,
} from "@/lib/config/currency";

type CurrencyContextValue = {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatFromUsd: (usdAmount: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const COOKIE_NAME = "preferred_currency";

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(DEFAULT_CURRENCY);

  useEffect(() => {
    const fromCookie = document.cookie
      .split("; ")
      .find((item) => item.startsWith(`${COOKIE_NAME}=`))
      ?.split("=")[1] as Currency | undefined;

    if (fromCookie === "USD" || fromCookie === "KHR") {
      setCurrencyState(fromCookie);
    }
  }, []);

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      setCurrency: (nextCurrency: Currency) => {
        setCurrencyState(nextCurrency);
        document.cookie = `${COOKIE_NAME}=${nextCurrency}; Path=/; Max-Age=2592000; SameSite=Lax`;
      },
      formatFromUsd: (usdAmount: number) => formatPrice(usdAmount, currency),
    }),
    [currency],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);

  if (!ctx) {
    throw new Error("useCurrency must be used inside CurrencyProvider.");
  }

  return ctx;
}
