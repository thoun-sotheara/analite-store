export function resolveRoleFromEmail(email: string, adminEmail?: string): "ADMIN" | "USER" {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedAdminEmail = (adminEmail ?? process.env.ADMIN_EMAIL ?? "")
    .trim()
    .toLowerCase();

  if (!normalizedAdminEmail) {
    return "USER";
  }

  return normalizedEmail === normalizedAdminEmail ? "ADMIN" : "USER";
}
