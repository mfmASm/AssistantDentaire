export type AppRole = "admin" | "doctor" | "secretary" | string | undefined | null;

export function normalizeRole(role: AppRole) {
  return typeof role === "string" ? role.trim().toLowerCase() : role;
}

export function getRoleLabel(role: AppRole) {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "doctor") return "Docteur";
  if (normalizedRole === "secretary") return "Secrétaire médicale";
  return "Docteur propriétaire";
}

export function canManageTeam(role: AppRole) {
  return normalizeRole(role) === "admin";
}

export function canManageCabinetSettings(role: AppRole) {
  return normalizeRole(role) === "admin";
}

export function canFinalizeMedicalDocuments(role: AppRole) {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "admin" || normalizedRole === "doctor";
}

export function canAccessMedicalDocuments(role: AppRole) {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "admin" || normalizedRole === "doctor";
}

export function canManageOperations(role: AppRole) {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "admin" || normalizedRole === "doctor" || normalizedRole === "secretary";
}
