import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  Wallet,
  BellRing,
  Star,
  Users,
  MessageCircle,
  CheckCircle2,
  Send,
  CalendarPlus,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

import { PageHeader, StatCard } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  StatusBadge,
  apptTone, apptLabel,
  paymentTone, paymentLabel,
  recallTone, recallLabel,
} from "@/components/status-badge";
import {
  formatMAD, formatDate,
  type Appointment,
  type Payment,
  type Recall,
  type ReviewRequest,
  type Patient,
} from "@/lib/demo-data";
import { formatLongDate, todayISO } from "@/lib/date-utils";
import {
  DEMO_MODE_EVENT,
  demoAppointments,
  demoPatients,
  demoPayments,
  demoRecalls,
  demoReviews,
  isDemoMode,
} from "@/lib/demoMode";
import { fillWhatsAppTemplate, logAndOpenWhatsapp, whatsappTemplates } from "@/lib/whatsapp";
import { getDashboardSummary, type DashboardSummary } from "@/services/dashboardApi";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — DentalPilot" },
      { name: "description", content: "Vue d'ensemble quotidienne du cabinet dentaire : rendez-vous, paiements, rappels et avis." },
    ],
  }),
  component: Dashboard,
});

const paymentStatusMap = {
  "Payé": "paid",
  Paye: "paid",
  Partiel: "partial",
  Impayé: "unpaid",
  "En retard": "unpaid",
  "Non réglé": "unpaid",
} as const;

const appointmentStatusMap = {
  "Confirmé": "confirmed",
  "En attente": "waiting",
  "Terminé": "completed",
  "Annulé": "cancelled",
  "No-show": "no_show",
} as const;

const emptyDashboardSummary: DashboardSummary = {
  appointments_today_count: 0,
  upcoming_appointments_count: 0,
  patients_total: 0,
  new_patients_this_month: 0,
  payments_collected_today: 0,
  payments_collected_month: 0,
  unpaid_balances_total: 0,
  overdue_payments_count: 0,
  recalls_due_count: 0,
  review_requests_pending: 0,
  review_requests_sent: 0,
  prescriptions_today_count: 0,
  certificates_today_count: 0,
  recent_patients: [],
  upcoming_appointments: [],
  overdue_payments: [],
  due_recalls: [],
  recent_activity: [],
};

const normalizeStatus = (status?: string | null) =>
  (status || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const toAppointmentStatus = (status?: string | null): Appointment["status"] => {
  const normalized = normalizeStatus(status);
  if (normalized.includes("termine") || normalized === "completed") return "completed";
  if (normalized.includes("annule") || normalized === "cancelled" || normalized === "canceled") return "cancelled";
  if (normalized.includes("attente") || normalized === "waiting") return "waiting";
  if (normalized.includes("no-show") || normalized.includes("no show")) return "no_show";
  return "confirmed";
};

const toPaymentStatus = (status?: string | null, remaining = 0): Payment["status"] => {
  const normalized = normalizeStatus(status);
  if (!normalized) return "unpaid";
  if (remaining <= 0 || normalized === "paye" || normalized === "paid") return "paid";
  if (normalized === "partiel" || normalized === "partial") return "partial";
  return "unpaid";
};

const toRecallStatus = (status?: string | null): Recall["status"] => {
  const normalized = normalizeStatus(status);
  if (normalized === "termine" || normalized === "completed") return "completed";
  if (normalized === "envoye" || normalized === "sent") return "sent";
  if (normalized.includes("retard") || normalized === "overdue") return "overdue";
  if (normalized.includes("planifie") || normalized === "scheduled") return "scheduled";
  return "due_soon";
};

const toDashboardPatient = (patient: (typeof demoPatients)[number]): Patient => ({
  id: patient.id,
  name: patient.full_name,
  phone: patient.phone || "",
  email: patient.email || "",
  status: patient.status ?? "active",
  lastVisit: patient.updated_at || todayISO(),
  notes: patient.notes,
});

const toDashboardPayment = (payment: (typeof demoPayments)[number]): Payment => ({
  id: payment.id,
  patientId: payment.patient_id,
  patient: payment.patients?.full_name || "Patient",
  treatment: payment.treatment,
  total: payment.total_amount,
  paid: payment.paid_amount,
  dueDate: payment.due_date || todayISO(),
  status: paymentStatusMap[payment.status as keyof typeof paymentStatusMap] ?? "unpaid",
  notes: payment.notes,
});

const toDashboardAppointment = (appointment: (typeof demoAppointments)[number]): Appointment => ({
  id: appointment.id,
  time: appointment.start_time,
  patientId: appointment.patient_id,
  patient: appointment.patients?.full_name || "Patient",
  treatment: appointment.treatment_type,
  status: appointmentStatusMap[appointment.status as keyof typeof appointmentStatusMap] ?? "waiting",
  paymentStatus: paymentStatusMap[appointment.payment_status as keyof typeof paymentStatusMap] ?? "unpaid",
  followUp: Boolean(appointment.follow_up_status && appointment.follow_up_status !== "Aucun suivi"),
});

const toDashboardRecall = (recall: (typeof demoRecalls)[number]): Recall => ({
  id: recall.id,
  patientId: recall.id,
  patient: recall.patient,
  phone: recall.phone,
  type: recall.type,
  lastVisit: todayISO(),
  nextRecall: recall.nextRecall,
  status: recall.status as Recall["status"],
});

const toDashboardReview = (review: (typeof demoReviews)[number]): ReviewRequest => ({
  id: review.id,
  patientId: review.id,
  patient: review.patient,
  phone: review.phone,
  visitDate: review.visitDate,
  status: review.status as ReviewRequest["status"],
  sentAt: review.sentAt,
});

const toRealDashboardPatient = (patient: DashboardSummary["recent_patients"][number]): Patient => ({
  id: patient.id,
  name: patient.full_name || "Patient",
  phone: patient.phone || "",
  email: "",
  status: "active",
  lastVisit: patient.created_at || todayISO(),
});

const toRealDashboardAppointment = (appointment: DashboardSummary["upcoming_appointments"][number]): Appointment => ({
  id: appointment.id,
  time: appointment.start_time || "",
  patientId: appointment.patient_id || "",
  patient: appointment.patient_name || "Patient",
  treatment: appointment.treatment_type || "",
  status: toAppointmentStatus(appointment.status),
  paymentStatus: toPaymentStatus(appointment.payment_status, appointment.payment_status ? 1 : 0),
  followUp: Boolean(appointment.follow_up_status && normalizeStatus(appointment.follow_up_status) !== "aucun suivi"),
});

const toRealDashboardPayment = (payment: DashboardSummary["overdue_payments"][number]): Payment => {
  const remaining = Number(payment.remaining_amount || 0);
  return {
    id: payment.id,
    patientId: payment.patient_id || "",
    patient: payment.patient_name || "Patient",
    treatment: payment.treatment || "",
    total: remaining,
    paid: 0,
    dueDate: payment.due_date || todayISO(),
    status: toPaymentStatus(payment.status, remaining),
  };
};

const toRealDashboardRecall = (recall: DashboardSummary["due_recalls"][number]): Recall => ({
  id: recall.id,
  patientId: recall.patient_id || "",
  patient: recall.patient_name || "Patient",
  phone: recall.phone || "",
  type: recall.recall_type || "",
  lastVisit: todayISO(),
  nextRecall: recall.next_recall_date || todayISO(),
  status: toRecallStatus(recall.status),
});

function Dashboard() {
  const [demoMode, setDemoModeState] = useState(() => isDemoMode());
  const [summary, setSummary] = useState<DashboardSummary>(emptyDashboardSummary);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState(false);

  const patients = demoMode ? demoPatients.map(toDashboardPatient) : summary.recent_patients.map(toRealDashboardPatient);
  const appointments = demoMode ? demoAppointments.map(toDashboardAppointment) : summary.upcoming_appointments.map(toRealDashboardAppointment);
  const payments = demoMode ? demoPayments.map(toDashboardPayment) : summary.overdue_payments.map(toRealDashboardPayment);
  const recalls = demoMode ? demoRecalls.map(toDashboardRecall) : summary.due_recalls.map(toRealDashboardRecall);
  const reviews = demoMode ? demoReviews.map(toDashboardReview) : [];
  const todayAppts = demoMode ? appointments : appointments.filter((appointment) => summary.upcoming_appointments.find((item) => item.id === appointment.id)?.appointment_date === todayISO());
  const unpaid = payments.filter((p) => p.status !== "paid");
  const todayCollected = payments
    .filter((p) => p.dueDate <= todayISO() && p.status === "paid")
    .reduce((s, p) => s + p.paid, 0);
  const monthRevenue = payments.reduce((s, p) => s + p.paid, 0);
  const upcomingRecalls = recalls.filter((r) => r.status !== "completed").slice(0, 5);
  const toSendReviews = reviews.filter((r) => r.status === "not_sent");
  const followUps = appointments.filter((a) => a.followUp);
  const appointmentsTodayCount = demoMode ? todayAppts.length : summary.appointments_today_count;
  const completedTodayCount = demoMode ? todayAppts.filter((a) => a.status === "completed").length : 0;
  const confirmedTodayCount = demoMode ? todayAppts.filter((a) => a.status === "confirmed").length : summary.upcoming_appointments_count;
  const collectedToday = demoMode ? todayCollected : summary.payments_collected_today;
  const collectedMonth = demoMode ? monthRevenue : summary.payments_collected_month;
  const unpaidTotal = demoMode ? unpaid.reduce((s, p) => s + (p.total - p.paid), 0) : summary.unpaid_balances_total;
  const unpaidCount = demoMode ? unpaid.length : summary.overdue_payments_count;
  const pendingReviewCount = demoMode ? toSendReviews.length : summary.review_requests_pending;
  const recentLeads = demoMode
    ? demoPatients.slice(-3).map((patient) => ({ id: patient.id, name: patient.full_name, phone: patient.phone || "", source: "Démo" }))
    : summary.recent_patients.slice(0, 3).map((patient) => ({ id: patient.id, name: patient.full_name || "Patient", phone: patient.phone || "", source: patient.status || "Patient" }));
  const patientPhone = (patientId?: string, patientName?: string) =>
    patients.find((patient) => patient.id === patientId || patient.name === patientName)?.phone;

  useEffect(() => {
    const updateDemoMode = () => setDemoModeState(isDemoMode());
    window.addEventListener(DEMO_MODE_EVENT, updateDemoMode);
    window.addEventListener("storage", updateDemoMode);
    return () => {
      window.removeEventListener(DEMO_MODE_EVENT, updateDemoMode);
      window.removeEventListener("storage", updateDemoMode);
    };
  }, []);

  useEffect(() => {
    if (demoMode) {
      setSummary(emptyDashboardSummary);
      setDashboardError(false);
      setDashboardLoading(false);
      return;
    }

    let cancelled = false;
    setDashboardLoading(true);
    setDashboardError(false);
    getDashboardSummary()
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch(() => {
        if (!cancelled) {
          setSummary(emptyDashboardSummary);
          setDashboardError(true);
          toast.error("Impossible de charger les statistiques du dashboard.");
        }
      })
      .finally(() => {
        if (!cancelled) setDashboardLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [demoMode]);

  const sendQuickWhatsApp = () => {
    const target = followUps[0] ?? appointments[0];
    if (!target) return;
    const message = fillWhatsAppTemplate(whatsappTemplates.appointment, {
      Patient: target.patient,
      Date: formatDate(todayISO()),
      Heure: target.time,
    });
    logAndOpenWhatsapp({ patientId: target.patientId, type: "appointment_reminder", phone: patientPhone(target.patientId, target.patient), message });
  };

  const sendPaymentFollowUp = (payment: (typeof payments)[number]) => {
    const message = fillWhatsAppTemplate(whatsappTemplates.payment, {
      Patient: payment.patient,
      Montant: payment.total - payment.paid,
      Traitement: payment.treatment,
    });
    logAndOpenWhatsapp({ patientId: payment.patientId, type: "payment_reminder", phone: patientPhone(payment.patientId, payment.patient), message });
  };

  const sendRecallFollowUp = (recall: (typeof recalls)[number]) => {
    const message = fillWhatsAppTemplate(whatsappTemplates.recall, {
      Patient: recall.patient,
      "Type de rappel": recall.type,
    });
    logAndOpenWhatsapp({ patientId: recall.patientId, type: "patient_recall", phone: recall.phone, message });
  };

  const sendReviewRequest = (request: (typeof reviews)[number]) => {
    const message = fillWhatsAppTemplate(whatsappTemplates.review, {
      Patient: request.patient,
      "Google Review Link": "https://g.page/r/cabinet-atlas-casablanca/review",
    });
    logAndOpenWhatsapp({ patientId: request.patientId, type: "review_request", phone: request.phone, message });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bonjour Dr. Safaa M'gaassy"
        description={`Voici ce qui demande votre attention aujourd'hui — ${formatLongDate()}.`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/patients"><Users className="size-4" /> Nouveau patient</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/appointments"><CalendarPlus className="size-4" /> Nouveau RDV</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="RDV aujourd'hui"
          value={dashboardLoading ? "..." : String(appointmentsTodayCount)}
          hint={`${completedTodayCount} terminés · ${confirmedTodayCount} à venir`}
          icon={<CalendarDays className="size-5" />}
          accent="primary"
        />
        <StatCard
          label="Encaissé aujourd'hui"
          value={dashboardLoading ? "..." : formatMAD(collectedToday)}
          trend={dashboardError ? "Données indisponibles" : undefined}
          trendTone="up"
          icon={<Wallet className="size-5" />}
          accent="success"
        />
        <StatCard
          label="Impayés en cours"
          value={dashboardLoading ? "..." : formatMAD(unpaidTotal)}
          hint={`${unpaidCount} patients concernés`}
          icon={<AlertCircle className="size-5" />}
          accent="danger"
        />
        <StatCard
          label="Revenu du mois"
          value={dashboardLoading ? "..." : formatMAD(collectedMonth)}
          trend={demoMode ? "+18% vs avril" : undefined}
          trendTone="up"
          icon={<TrendingUp className="size-5" />}
          accent="info"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Rendez-vous d'aujourd'hui</CardTitle>
              <CardDescription>{`Planning du cabinet — ${formatLongDate()}`}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/appointments">Tout voir <ArrowUpRight className="size-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Heure</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden md:table-cell">Traitement</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden sm:table-cell">Paiement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayAppts.slice(0, 6).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-sm">{a.time}</TableCell>
                    <TableCell className="font-medium">{a.patient}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{a.treatment}</TableCell>
                    <TableCell><StatusBadge tone={apptTone(a.status)}>{apptLabel(a.status)}</StatusBadge></TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <StatusBadge tone={paymentTone(a.paymentStatus)}>{paymentLabel(a.paymentStatus)}</StatusBadge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions rapides</CardTitle>
            <CardDescription>Les tâches du jour à un clic</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-auto flex-col py-4 gap-1.5" onClick={sendQuickWhatsApp}>
              <MessageCircle className="size-5 text-success" />
              <span className="text-xs font-medium">Envoyer WhatsApp</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4 gap-1.5" asChild>
              <Link to="/payments">
              <CheckCircle2 className="size-5 text-primary" />
              <span className="text-xs font-medium">Marquer payé</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4 gap-1.5" asChild>
              <Link to="/reviews">
              <Star className="size-5 text-warning" />
              <span className="text-xs font-medium">Envoyer avis</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4 gap-1.5" asChild>
              <Link to="/recalls">
              <BellRing className="size-5 text-info" />
              <span className="text-xs font-medium">Planifier rappel</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Patients avec solde impayé</CardTitle>
              <CardDescription>Relances à effectuer rapidement</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/payments">Voir tout <ArrowUpRight className="size-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {unpaid.slice(0, 4).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border bg-background/50 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.patient}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.treatment} · Échéance {formatDate(p.dueDate)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatMAD(p.total - p.paid)}</p>
                    <StatusBadge tone={paymentTone(p.status)}>{paymentLabel(p.status)}</StatusBadge>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => sendPaymentFollowUp(p)}>
                    <Send className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Rappels patients à venir</CardTitle>
              <CardDescription>Détartrages, contrôles, suivis</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/recalls">Voir tout <ArrowUpRight className="size-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingRecalls.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border bg-background/50 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.patient}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.type} · {formatDate(r.nextRecall)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge tone={recallTone(r.status)}>{recallLabel(r.status)}</StatusBadge>
                  <Button size="icon" variant="ghost" onClick={() => sendRecallFollowUp(r)}>
                    <MessageCircle className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Star className="size-4 text-warning" /> Avis Google à envoyer</CardTitle>
            <CardDescription>{pendingReviewCount} demandes en attente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {toSendReviews.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 rounded-xl border p-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.patient}</p>
                  <p className="text-xs text-muted-foreground">Visite {formatDate(r.visitDate)}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => sendReviewRequest(r)}>
                  <Send className="size-3.5" /> Envoyer
                </Button>
              </div>
            ))}
            {pendingReviewCount === 0 && <p className="text-sm text-muted-foreground">Aucune demande en attente.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertCircle className="size-4 text-warning-foreground" /> Suivis nécessaires</CardTitle>
            <CardDescription>{followUps.length} patients à recontacter</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {followUps.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-xl border p-2.5">
                <div>
                  <p className="text-sm font-medium">{f.patient}</p>
                  <p className="text-xs text-muted-foreground">{f.treatment}</p>
                </div>
                <StatusBadge tone={apptTone(f.status)}>{apptLabel(f.status)}</StatusBadge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="size-4 text-info" /> Nouveaux prospects</CardTitle>
            <CardDescription>Récemment ajoutés</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentLeads.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-xl border p-2.5">
                <div>
                  <p className="text-sm font-medium">{l.name}</p>
                  <p className="text-xs text-muted-foreground">{l.phone}</p>
                </div>
                <span className="text-xs text-muted-foreground">{l.source}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
