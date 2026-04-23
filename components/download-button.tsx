"use client";

import { useActionState, useEffect } from "react";
import { defaultDownloadState } from "@/app/actions/download-types";
import {
  type DownloadState,
} from "@/app/actions/download-types";

type DownloadButtonProps = {
  action: (state: DownloadState) => Promise<DownloadState>;
};

export function DownloadButton({ action }: DownloadButtonProps) {
  const [state, formAction, pending] = useActionState(action, defaultDownloadState);

  useEffect(() => {
    if (state.ok && state.url) {
      window.location.href = state.url;
    }
  }, [state.ok, state.url]);

  return (
    <form action={formAction} className="mt-4">
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-accent px-5 py-3 text-sm font-medium text-white transition hover:bg-accent-soft disabled:opacity-60"
      >
        {pending ? "Preparing secure file..." : "Download Instantly"}
      </button>
      <p className="mt-2 text-xs text-muted">{state.message}</p>
    </form>
  );
}
