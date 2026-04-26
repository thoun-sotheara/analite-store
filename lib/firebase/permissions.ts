export function isFirestorePermissionError(error: unknown): boolean {
  const candidate = error as { code?: string } | undefined;
  return candidate?.code === "permission-denied";
}

export function shouldFallbackFromFirestore(error: unknown): boolean {
  const candidate = error as { code?: string; message?: string } | undefined;
  const code = candidate?.code?.toLowerCase() ?? "";
  const message = candidate?.message?.toLowerCase() ?? "";

  return code === "permission-denied"
    || code === "unavailable"
    || code === "cancelled"
    || code === "aborted"
    || message.includes("permission-denied")
    || message.includes("permission denied")
    || message.includes("net::err_aborted")
    || message.includes("network request failed")
    || message.includes("client is offline");
}
