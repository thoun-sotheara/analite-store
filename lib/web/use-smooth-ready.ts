"use client";

import { useEffect, useState } from "react";

export function useSmoothReady(ready: boolean, minDelayMs = 320): boolean {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (!ready) {
      setShowContent(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setShowContent(true);
    }, minDelayMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [ready, minDelayMs]);

  return showContent;
}
