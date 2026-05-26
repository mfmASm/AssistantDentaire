import { apiFetch, jsonBody } from "@/services/api";

export type TeamMember = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
  cabinet_id?: string | null;
  created_at?: string | null;
  status?: string | null;
};

export type TeamInvitePayload = {
  full_name: string;
  email: string;
  role: "doctor" | "secretary";
};

export type TeamInviteResult = {
  status: "todo";
  message: string;
  invitee: TeamInvitePayload;
};

export const teamApi = {
  list: () => apiFetch<TeamMember[]>("/team"),
  invite: (payload: TeamInvitePayload) =>
    apiFetch<TeamInviteResult>("/team/invite", { method: "POST", body: jsonBody(payload) }),
};
