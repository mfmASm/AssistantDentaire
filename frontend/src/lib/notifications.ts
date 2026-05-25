import {
  appointments,
  formatDate,
  formatMAD,
  payments,
  recalls,
  reviews,
} from "@/lib/demo-data";
import { relativeISO, todayISO } from "@/lib/date-utils";

export type AppNotification = {
  id: string;
  title: string;
  description: string;
  href: string;
  tone: "danger" | "warning" | "info";
  createdAt: string;
};

export const getNotifications = (): AppNotification[] => {
  const today = todayISO();
  const upcomingLimit = relativeISO(3);

  const paymentNotifications = payments
    .filter((payment) => payment.status !== "paid" && payment.dueDate <= upcomingLimit)
    .map((payment) => {
      const overdue = payment.dueDate < today;
      const remaining = payment.total - payment.paid;

      return {
        id: `payment-${payment.id}-${payment.status}-${payment.dueDate}-${remaining}`,
        title: overdue ? "Paiement en retard" : "Paiement a suivre",
        description: `${payment.patient} doit ${formatMAD(remaining)} - echeance ${formatDate(payment.dueDate)}`,
        href: "/payments",
        tone: overdue ? "danger" : "warning",
        createdAt: payment.dueDate,
      } satisfies AppNotification;
    });

  const recallNotifications = recalls
    .filter((recall) => recall.status !== "completed" && (recall.status === "overdue" || recall.nextRecall <= upcomingLimit))
    .map((recall) => {
      const overdue = recall.status === "overdue" || recall.nextRecall < today;

      return {
        id: `recall-${recall.id}-${recall.status}-${recall.nextRecall}`,
        title: overdue ? "Rappel patient en retard" : "Rappel patient a venir",
        description: `${recall.patient} - ${recall.type}, prevu le ${formatDate(recall.nextRecall)}`,
        href: "/recalls",
        tone: overdue ? "danger" : "info",
        createdAt: recall.nextRecall,
      } satisfies AppNotification;
    });

  const noShowNotifications = appointments
    .filter((appointment) => appointment.status === "no_show")
    .map((appointment) => ({
      id: `appointment-${appointment.id}-${appointment.status}`,
      title: "No-show a traiter",
      description: `${appointment.patient} ne s'est pas presente au RDV de ${appointment.time}`,
      href: "/appointments",
      tone: "warning",
      createdAt: today,
    }) satisfies AppNotification);

  const reviewNotifications = reviews
    .filter((review) => review.status === "not_sent")
    .map((review) => ({
      id: `review-${review.id}-${review.status}`,
      title: "Avis Google a envoyer",
      description: `${review.patient} - visite du ${formatDate(review.visitDate)}`,
      href: "/reviews",
      tone: "info",
      createdAt: review.visitDate,
    }) satisfies AppNotification);

  return [
    ...paymentNotifications,
    ...recallNotifications,
    ...noShowNotifications,
    ...reviewNotifications,
  ].sort((a, b) => toneRank(a.tone) - toneRank(b.tone) || a.createdAt.localeCompare(b.createdAt));
};

const toneRank = (tone: AppNotification["tone"]) => {
  if (tone === "danger") return 0;
  if (tone === "warning") return 1;
  return 2;
};
