import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

const tones: Record<Tone, string> = {
  success: "bg-success/15 text-success border-success/20",
  warning: "bg-warning/20 text-warning-foreground border-warning/30",
  danger: "bg-destructive/15 text-destructive border-destructive/20",
  info: "bg-info/15 text-info border-info/20",
  neutral: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium border", tones[tone], className)}>
      <span className={cn("mr-1.5 size-1.5 rounded-full", {
        "bg-success": tone === "success",
        "bg-warning": tone === "warning",
        "bg-destructive": tone === "danger",
        "bg-info": tone === "info",
        "bg-muted-foreground": tone === "neutral",
      })} />
      {children}
    </Badge>
  );
}

export const paymentTone = (s: string): Tone =>
  s === "paid" ? "success" : s === "partial" ? "warning" : s === "unpaid" ? "danger" : "neutral";

export const paymentLabel = (s: string) =>
  s === "paid" ? "Payé" : s === "partial" ? "Partiel" : s === "unpaid" ? "Impayé" : s;

export const recallTone = (s: string): Tone =>
  s === "scheduled" ? "info" : s === "due_soon" ? "warning" : s === "overdue" ? "danger" : "success";

export const recallLabel = (s: string) =>
  s === "scheduled" ? "Planifié" : s === "due_soon" ? "Bientôt" : s === "overdue" ? "En retard" : s === "sent" ? "Envoyé" : "Terminé";

export const reviewTone = (s: string): Tone =>
  s === "reviewed" ? "success" : s === "sent" ? "info" : "neutral";

export const reviewLabel = (s: string) =>
  s === "reviewed" ? "Avis reçu" : s === "sent" ? "Envoyé" : "Non envoyé";

export const apptTone = (s: string): Tone =>
  s === "completed" ? "success" : s === "confirmed" ? "info" : s === "waiting" ? "warning" : s === "no_show" ? "danger" : "neutral";

export const apptLabel = (s: string) =>
  s === "completed" ? "Terminé" : s === "confirmed" ? "Confirmé" : s === "waiting" ? "En attente" : s === "no_show" ? "Absent" : "Annulé";

export const patientTone = (s: string): Tone =>
  s === "active" ? "success" : s === "payment_pending" ? "danger" : s === "recall_due" ? "warning" : "info";

export const patientLabel = (s: string) =>
  s === "active" ? "Actif" : s === "payment_pending" ? "Paiement dû" : s === "recall_due" ? "Rappel dû" : "Suivi";
