"use client";

import { useEffect, useState } from "react";
import { COOKIE_CONSENT_NAME, hasCookieConsent, setCookie } from "@/lib/web/cookies";

export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!hasCookieConsent());
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-border bg-white/95 px-4 py-3 shadow-[0_-8px_20px_rgba(15,23,42,0.08)] backdrop-blur-md sm:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-muted sm:text-sm">
          We use cookies for sign-in security, cart recovery, wishlist sync, currency preference, and a smoother refresh experience.
        </p>
        <button
          type="button"
          onClick={() => {
            setCookie(COOKIE_CONSENT_NAME, "accepted", 60 * 60 * 24 * 365);
            setVisible(false);
          }}
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-foreground px-4 py-2 text-xs font-medium text-white transition hover:bg-slate-800 sm:text-sm"
        >
          Accept Cookies
        </button>
      </div>
    </div>
  );
}
