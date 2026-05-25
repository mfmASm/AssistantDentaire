import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
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
  reviewTone, reviewLabel,
} from "@/components/status-badge";
import {
  appointments, payments, recalls, reviews, newLeads, patients,
  formatMAD, formatDate,
} from "@/lib/demo-data";
import { formatLongDate, todayISO } from "@/lib/date-utils";
import { fillWhatsAppTemplate, openWhatsAppMessage, whatsappTemplates } from "@/lib/whatsapp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — DentalPilot" },
      { name: "description", content: "Vue d'ensemble quotidienne du cabinet dentaire : rendez-vous, paiements, rappels et avis." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const todayAppts = appointments;
  const unpaid = payments.filter((p) => p.status !== "paid");
  const todayCollected = payments
    .filter((p) => p.dueDate <= todayISO() && p.status === "paid")
    .reduce((s, p) => s + p.paid, 0);
  const monthRevenue = payments.reduce((s, p) => s + p.paid, 0);
  const upcomingRecalls = recalls.filter((r) => r.status !== "completed").slice(0, 5);
  const toSendReviews = reviews.filter((r) => r.status === "not_sent");
  const followUps = appointments.filter((a) => a.followUp);
  const patientPhone = (patientId?: string, patientName?: string) =>
    patients.find((patient) => patient.id === patientId || patient.name === patientName)?.phone;

  const sendQuickWhatsApp = () => {
    const target = followUps[0] ?? appointments[0];
    const message = fillWhatsAppTemplate(whatsappTemplates.appointment, {
      Patient: target.patient,
      Date: formatDate(todayISO()),
      Heure: target.time,
    });
    openWhatsAppMessage(patientPhone(target.patientId, target.patient), message);
  };

  const sendPaymentFollowUp = (payment: (typeof payments)[number]) => {
    const message = fillWhatsAppTemplate(whatsappTemplates.payment, {
      Patient: payment.patient,
      Montant: payment.total - payment.paid,
      Traitement: payment.treatment,
    });
    openWhatsAppMessage(patientPhone(payment.patientId, payment.patient), message);
  };

  const sendRecallFollowUp = (recall: (typeof recalls)[number]) => {
    const message = fillWhatsAppTemplate(whatsappTemplates.recall, {
      Patient: recall.patient,
      "Type de rappel": recall.type,
    });
    openWhatsAppMessage(recall.phone, message);
  };

  const sendReviewRequest = (request: (typeof reviews)[number]) => {
    const message = fillWhatsAppTemplate(whatsappTemplates.review, {
      Patient: request.patient,
      "Google Review Link": "https://g.page/r/cabinet-atlas-casablanca/review",
    });
    openWhatsAppMessage(request.phone, message);
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
          value={String(todayAppts.length)}
          hint={`${todayAppts.filter((a) => a.status === "completed").length} terminés · ${todayAppts.filter((a) => a.status === "confirmed").length} à venir`}
          icon={<CalendarDays className="size-5" />}
          accent="primary"
        />
        <StatCard
          label="Encaissé aujourd'hui"
          value={formatMAD(todayCollected)}
          trend="+12% vs hier"
          trendTone="up"
          icon={<Wallet className="size-5" />}
          accent="success"
        />
        <StatCard
          label="Impayés en cours"
          value={formatMAD(unpaid.reduce((s, p) => s + (p.total - p.paid), 0))}
          hint={`${unpaid.length} patients concernés`}
          icon={<AlertCircle className="size-5" />}
          accent="danger"
        />
        <StatCard
          label="Revenu du mois"
          value={formatMAD(monthRevenue)}
          trend="+18% vs avril"
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
            <CardDescription>{toSendReviews.length} demandes en attente</CardDescription>
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
            {toSendReviews.length === 0 && <p className="text-sm text-muted-foreground">Aucune demande en attente.</p>}
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
            {newLeads.map((l) => (
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
