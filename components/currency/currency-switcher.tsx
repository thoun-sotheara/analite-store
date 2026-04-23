"use client";

import { useCurrency } from "@/components/currency/currency-provider";

export function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="inline-flex rounded-full border border-border bg-white p-1">
      {(["USD", "KHR"] as const).map((item) => {
        const active = item === currency;
        return (
          <button
            key={item}
            type="button"
            onClick={() => setCurrency(item)}
            className={`rounded-full px-3 py-1 text-xs tracking-[0.1em] transition ${
              active
                ? "border border-border bg-slate-50 text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
