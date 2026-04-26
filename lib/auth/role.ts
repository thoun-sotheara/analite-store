export function resolveRoleFromEmail(email: string, adminEmail?: string): "ADMIN" | "USER" {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedAdminEmail = (adminEmail ?? process.env.ADMIN_EMAIL ?? "admin@analite.store")
    .trim()
    .toLowerCase();

  return normalizedEmail === normalizedAdminEmail ? "ADMIN" : "USER";
}
