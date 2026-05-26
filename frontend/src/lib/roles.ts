export type AppRole = "admin" | "doctor" | "secretary" | string | undefined | null;

export function getRoleLabel(role: AppRole) {
  if (role === "doctor") return "Docteur";
  if (role === "secretary") return "Secrétaire médicale";
  return "Docteur propriétaire";
}

export function canManageTeam(role: AppRole) {
  return role === "admin";
}

export function canManageCabinetSettings(role: AppRole) {
  return role === "admin";
}

export function canFinalizeMedicalDocuments(role: AppRole) {
  return role === "admin" || role === "doctor";
}

export function canAccessMedicalDocuments(role: AppRole) {
  return role === "admin" || role === "doctor";
}

export function canManageOperations(role: AppRole) {
  return role === "admin" || role === "doctor" || role === "secretary";
}
