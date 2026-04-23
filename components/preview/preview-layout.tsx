"use client";

import Link from "next/link";
import { Laptop, Smartphone, Tablet } from "lucide-react";
import { useMemo, useState } from "react";
import { CurrencySwitcher } from "@/components/currency/currency-switcher";

type DeviceMode = "desktop" | "tablet" | "mobile";

type PreviewLayoutProps = {
  title: string;
  previewUrl: string;
  purchaseHref: string;
};

const iframeWidths: Record<DeviceMode, string> = {
  desktop: "100%",
  tablet: "900px",
  mobile: "375px",
};

export function PreviewLayout({ title, previewUrl, purchaseHref }: PreviewLayoutProps) {
  const [device, setDevice] = useState<DeviceMode>("desktop");

  const devices = useMemo(
    () => [
      { id: "desktop" as const, label: "Desktop", icon: Laptop },
      { id: "tablet" as const, label: "Tablet", icon: Tablet },
      { id: "mobile" as const, label: "Mobile", icon: Smartphone },
    ],
    [],
  );

  return (
    <main className="h-screen w-screen overflow-hidden bg-slate-100">
      <header className="fixed left-0 top-0 z-20 flex h-16 w-full items-center border-b border-border bg-white/80 px-4 backdrop-blur-md sm:px-6">
        <div className="flex w-full items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/products"
              className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground transition hover:border-slate-400"
            >
              Back to Store
            </Link>
            <p className="hidden text-sm text-muted sm:block">
              <span className="font-semibold text-foreground">{title}</span> By Analite
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-md border border-border bg-white p-1">
            {devices.map((item) => {
              const Icon = item.icon;
              const active = device === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDevice(item.id)}
                  className={`inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs transition ${
                    active
                      ? "border border-border bg-slate-50 text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                  aria-label={item.label}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <CurrencySwitcher />
            <Link
              href={purchaseHref}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Buy Now
            </Link>
          </div>
        </div>
      </header>

      <section className="flex h-full w-full items-center justify-center px-3 pb-3 pt-20 sm:px-6 sm:pb-6">
        <div
          className="h-full max-h-[calc(100vh-92px)] overflow-hidden rounded-lg border border-border bg-white transition-all duration-300"
          style={{ width: iframeWidths[device], maxWidth: "100%" }}
        >
          <iframe
            title={`${title} full preview`}
            src={previewUrl}
            className="h-full w-full"
            loading="lazy"
          />
        </div>
      </section>
    </main>
  );
}
