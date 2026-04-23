"use client";

import Link from "next/link";
import { Laptop, Tablet, Smartphone } from "lucide-react";
import { useMemo, useState } from "react";

type PreviewFrameProps = {
  title: string;
  previewUrl: string;
};

type DeviceMode = "desktop" | "tablet" | "mobile";

const frameClassMap: Record<DeviceMode, string> = {
  desktop: "w-full",
  tablet: "w-[820px] max-w-full",
  mobile: "w-[390px] max-w-full",
};

export function PreviewFrame({ title, previewUrl }: PreviewFrameProps) {
  const [device, setDevice] = useState<DeviceMode>("desktop");

  const deviceButtons = useMemo(
    () => [
      { id: "desktop" as const, icon: Laptop, label: "Desktop" },
      { id: "tablet" as const, icon: Tablet, label: "Tablet" },
      { id: "mobile" as const, icon: Smartphone, label: "Mobile" },
    ],
    [],
  );

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-20 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Template Preview</p>
            <h1 className="text-sm font-medium tracking-[-0.01em] text-foreground sm:text-base">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-border bg-white p-1">
            {deviceButtons.map((item) => {
              const Icon = item.icon;
              const active = item.id === device;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDevice(item.id)}
                  className={`rounded-full px-3 py-1.5 text-xs transition ${
                    active
                      ? "border border-border bg-slate-50 text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                  aria-label={item.label}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>

          <Link
            href="/products"
            className="rounded-full border border-border px-4 py-2 text-xs tracking-[0.14em] text-foreground transition hover:border-slate-400"
          >
            CLOSE
          </Link>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-7xl justify-center px-3 py-8 sm:px-8 sm:py-12">
        <div className={`overflow-hidden rounded-2xl border border-border bg-white transition-all duration-300 ${frameClassMap[device]}`}>
          <iframe
            src={previewUrl}
            title={`${title} preview`}
            className="h-[78vh] w-full"
            loading="lazy"
          />
        </div>
      </section>
    </main>
  );
}
