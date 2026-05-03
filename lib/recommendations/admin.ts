// Hardcoded admin allow-list for the /admin/resources surface.
// We don't have a role schema yet — when we do, replace this with a flag on
// the User model and migrate.
//
// Override at runtime via SAGE_ADMIN_EMAILS (comma-separated) so we don't have
// to redeploy when adding admins.

const DEFAULT_ADMIN_EMAILS = ["xieedev@gmail.com"];

export function getAdminEmails(): string[] {
  const fromEnv = process.env.SAGE_ADMIN_EMAILS;
  if (!fromEnv) return DEFAULT_ADMIN_EMAILS;
  return fromEnv
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}
