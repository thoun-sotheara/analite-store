"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";

type LivePreviewButtonProps = {
  previewUrl: string;
  label?: ReactNode;
  triggerClassName?: string;
};

export function LivePreviewButton({
  previewUrl,
  label = "Live Preview",
  triggerClassName,
}: LivePreviewButtonProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={
          triggerClassName ??
          "rounded-lg border border-border px-3 py-2 text-sm transition hover:border-accent"
        }
        onClick={() => setOpen(true)}
      >
        {label}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3">
          <div className="glass-card relative w-full max-w-5xl overflow-hidden rounded-2xl border border-border">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-full bg-slate-900/85 p-2 text-slate-200 hover:text-white"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
            <iframe
              src={previewUrl}
              title="Template live preview"
              className="h-[72vh] w-full bg-slate-950"
              loading="lazy"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
