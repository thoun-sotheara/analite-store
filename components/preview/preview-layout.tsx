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

const viewports: Record<DeviceMode, { width: string; label: string; hint: string }> = {
  desktop: { width: "100%", label: "Desktop", hint: "Fluid" },
  tablet: { width: "900px", label: "Tablet", hint: "900px" },
  mobile: { width: "390px", label: "Mobile", hint: "390px" },
};

export function PreviewLayout({ title, previewUrl, purchaseHref }: PreviewLayoutProps) {
  const [device, setDevice] = useState<DeviceMode>("desktop");

  const devices = useMemo(
    () => [
      { id: "desktop" as const, icon: Laptop },
      { id: "tablet" as const, icon: Tablet },
      { id: "mobile" as const, icon: Smartphone },
    ],
    [],
  );

  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-white/85 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2.5">
            <Link
              href="/products"
              className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground transition hover:border-slate-400"
            >
              Back to Store
            </Link>
            <p className="line-clamp-1 text-sm text-muted">
              <span className="font-semibold text-foreground">{title}</span> live preview
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm">
            {devices.map((item) => {
              const Icon = item.icon;
              const active = device === item.id;
              const viewport = viewports[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDevice(item.id)}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs transition ${
                    active
                      ? "border border-slate-300 bg-slate-50 text-foreground shadow-sm"
                      : "border border-transparent text-muted hover:border-slate-200 hover:text-foreground"
                  }`}
                  aria-label={viewport.label}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="font-medium">{viewport.label}</span>
                  <span className="text-[10px] text-muted">{viewport.hint}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
            <div className="rounded-md border border-border bg-white px-2 py-1.5">
              <CurrencySwitcher />
            </div>
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-border bg-white px-3 py-2 text-xs font-medium text-foreground transition hover:bg-slate-50"
            >
              Open Preview
            </a>
            <Link
              href={purchaseHref}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Buy Now
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-[1440px] px-3 pb-5 pt-4 sm:px-6 sm:pb-8">
        <div className="rounded-2xl border border-border/70 bg-white/60 p-3 shadow-[0_20px_50px_rgba(15,23,42,0.06)] sm:p-4">
          <p className="mb-3 text-center text-xs text-muted">
            Some preview sites block embedded iframes. If the frame does not load, use Open Preview.
          </p>
          <div
            className="mx-auto h-[calc(100vh-220px)] min-h-[520px] max-h-[900px] overflow-hidden rounded-xl border border-border bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)] transition-all duration-300"
            style={{ width: viewports[device].width, maxWidth: "100%" }}
          >
            <iframe
              title={`${title} full preview`}
              src={previewUrl}
              className="h-full w-full"
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
