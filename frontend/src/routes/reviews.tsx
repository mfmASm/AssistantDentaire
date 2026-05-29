import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Star, Send, Link2, MessageCircle, TrendingUp, Copy } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, StatCard } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge, reviewTone, reviewLabel } from "@/components/status-badge";
import { formatDate, type ReviewRequest, type ReviewStatus } from "@/lib/demo-data";
import { todayISO } from "@/lib/date-utils";
import { DEMO_MODE_EVENT, demoPatients, demoReviews, isDemoMode } from "@/lib/demoMode";
import { fillWhatsAppTemplate, logAndOpenWhatsapp, whatsappTemplates } from "@/lib/whatsapp";
import { appointmentsApi, type ApiAppointment } from "@/services/appointmentsApi";
import { patientsApi, type ApiPatient } from "@/services/patientsApi";
import { createReviewRequest, getReviews, markReviewSent, type ApiReviewRequest, type ReviewPayload } from "@/services/reviewsApi";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Avis Google - DentalPilot" },
      { name: "description", content: "Automatisez vos demandes d'avis Google et suivez votre reputation en ligne." },
    ],
  }),
  component: ReviewsPage,
});

const normalizeReviewStatus = (status?: string): ReviewStatus => {
  if (status === "Envoyé" || status === "Envoye" || status === "sent") return "sent";
  if (status === "Avis reçu" || status === "Avis recu" || status === "reviewed") return "reviewed";
  return "not_sent";
};

const toDemoRows = (): ReviewRequest[] =>
  demoReviews.map((review) => {
    const patient = demoPatients.find((p) => p.full_name === review.patient);
    return {
      id: review.id,
      patientId: patient?.id ?? review.id,
      patient: review.patient,
      phone: review.phone,
      visitDate: review.visitDate,
      status: normalizeReviewStatus(review.status),
      sentAt: review.sentAt,
    };
  });

const toReviewRow = (
  review: ApiReviewRequest,
  patientsById: Record<string, ApiPatient>,
  appointmentsById: Record<string, ApiAppointment> = {},
): ReviewRequest => {
  const patient = review.patient_id ? patientsById[review.patient_id] : undefined;
  const appointment = review.appointment_id ? appointmentsById[review.appointment_id] : undefined;
  return {
    id: review.id,
    patientId: review.patient_id || review.id,
    patient: patient?.full_name ?? "Patient inconnu",
    phone: patient?.phone ?? "",
    visitDate: appointment?.appointment_date || review.created_at?.slice(0, 10) || todayISO(),
    status: normalizeReviewStatus(review.status),
    sentAt: review.sent_at?.slice(0, 10),
  };
};

function ReviewsPage() {
  const [demoMode, setDemoModeState] = useState(() => isDemoMode());
  const [rows, setRows] = useState<ReviewRequest[]>(() => (isDemoMode() ? toDemoRows() : []));
  const [patients, setPatients] = useState<ApiPatient[]>(() => (isDemoMode() ? demoPatients : []));
  const [reviews, setReviews] = useState<ApiReviewRequest[]>([]);
  const [appointments, setAppointments] = useState<ApiAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewLink, setReviewLink] = useState("https://g.page/r/cabinet-atlas-casablanca/review");
  const [template, setTemplate] = useState(whatsappTemplates.review);
  const sent = rows.filter((r) => r.status !== "not_sent").length;
  const received = rows.filter((r) => r.status === "reviewed").length;
  const rate = sent > 0 ? Math.round((received / sent) * 100) : 0;

  const refreshRealReviews = async () => {
    const [reviewsResponse, patientsResponse, appointmentsResponse] = await Promise.all([
      getReviews(),
      patientsApi.list(),
      appointmentsApi.getAppointments().catch(() => [] as ApiAppointment[]),
    ]);
    const patientsById = Object.fromEntries(patientsResponse.map((patient) => [patient.id, patient]));
    const appointmentsById = Object.fromEntries(appointmentsResponse.map((appointment) => [appointment.id, appointment]));
    setPatients(patientsResponse);
    setReviews(reviewsResponse);
    setAppointments(appointmentsResponse);
    setRows(reviewsResponse.map((review) => toReviewRow(review, patientsById, appointmentsById)));
  };

  useEffect(() => {
    let active = true;

    if (demoMode) {
      setLoading(false);
      setPatients(demoPatients);
      setReviews([]);
      setAppointments([]);
      setRows(toDemoRows());
      return () => {
        active = false;
      };
    }

    setLoading(true);
    Promise.all([getReviews(), patientsApi.list(), appointmentsApi.getAppointments().catch(() => [] as ApiAppointment[])])
      .then(([reviewsResponse, patientsResponse, appointmentsResponse]) => {
        if (!active) return;
        const patientsById = Object.fromEntries(patientsResponse.map((patient) => [patient.id, patient]));
        const appointmentsById = Object.fromEntries(appointmentsResponse.map((appointment) => [appointment.id, appointment]));
        setPatients(patientsResponse);
        setReviews(reviewsResponse);
        setAppointments(appointmentsResponse);
        setRows(reviewsResponse.map((review) => toReviewRow(review, patientsById, appointmentsById)));
      })
      .catch(() => {
        if (!active) return;
        setPatients([]);
        setReviews([]);
        setAppointments([]);
        setRows([]);
        toast.error("Impossible de charger les demandes d'avis.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [demoMode]);

  useEffect(() => {
    const updateDemoMode = () => setDemoModeState(isDemoMode());
    window.addEventListener(DEMO_MODE_EVENT, updateDemoMode);
    window.addEventListener("storage", updateDemoMode);
    return () => {
      window.removeEventListener(DEMO_MODE_EVENT, updateDemoMode);
      window.removeEventListener("storage", updateDemoMode);
    };
  }, []);

  const sendReview = async (id: string) => {
    const request = rows.find((r) => r.id === id);
    if (!request?.phone) {
      toast.error("Numéro WhatsApp du patient manquant.");
      return;
    }

    const message = fillWhatsAppTemplate(template, {
      Patient: request?.patient,
      "Google Review Link": reviewLink,
      Nom: request?.patient,
      Lien: reviewLink,
    });
    if (!logAndOpenWhatsapp({ patientId: request.patientId, type: "review_request", phone: request.phone, message })) return;
    setRows((current) => current.map((r) => (r.id === id && r.status === "not_sent" ? { ...r, status: "sent", sentAt: todayISO() } : r)));

    if (!demoMode) {
      markReviewSent(id)
        .then((updated) => {
          setRows((current) =>
            current.map((r) => (r.id === id ? { ...r, status: normalizeReviewStatus(updated.status), sentAt: updated.sent_at?.slice(0, 10) || todayISO() } : r)),
          );
          toast.success("Demande d'avis mise à jour.");
        })
        .catch(() => toast.error("Impossible de mettre à jour la demande d'avis."));

    }
  };

  const latestAppointmentForPatient = (patientId: string) =>
    appointments
      .filter((appointment) => appointment.patient_id === patientId)
      .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date))[0];

  const sendAll = async () => {
    if (!demoMode) {
      const patientsWithPhone = patients.filter((patient) => patient.phone?.trim());
      if (patientsWithPhone.length === 0) {
        toast.error("Aucun patient avec numéro WhatsApp disponible.");
        return;
      }

      const alreadyPreparedToday = new Set(
        reviews
          .filter((review) => review.created_at?.slice(0, 10) === todayISO())
          .map((review) => review.patient_id)
          .filter(Boolean),
      );
      const eligiblePatients = patientsWithPhone.filter((patient) => !alreadyPreparedToday.has(patient.id));

      try {
        await Promise.all(
          eligiblePatients.map((patient) => {
            const appointment = latestAppointmentForPatient(patient.id);
            const payload: ReviewPayload = {
              patient_id: patient.id,
              appointment_id: appointment?.id ?? null,
              status: "Non envoyé",
            };
            return createReviewRequest(payload);
          }),
        );
        await refreshRealReviews();
        toast.success(`${eligiblePatients.length} demandes d’avis préparées.`);
      } catch {
        toast.error("Impossible de préparer les demandes d'avis.");
      }
      return;
    }

    const pendingRows = rows.filter((r) => r.status === "not_sent");
    pendingRows.forEach((request) => {
      if (!request.phone) {
        toast.error("Numéro WhatsApp du patient manquant.");
        return;
      }

      const message = fillWhatsAppTemplate(template, {
        Patient: request.patient,
        "Google Review Link": reviewLink,
        Nom: request.patient,
        Lien: reviewLink,
      });
      if (!logAndOpenWhatsapp({ patientId: request.patientId, type: "review_request", phone: request.phone, message })) return;

    });
    setRows((current) => current.map((r) => (r.status === "not_sent" ? { ...r, status: "sent", sentAt: todayISO() } : r)));
    toast.success(`${pendingRows.length} demandes préparées`);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard?.writeText(reviewLink);
      toast.success("Lien copie");
    } catch {
      toast.error("Copie indisponible dans ce navigateur");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Avis Google"
        description="Automatisez vos demandes d'avis et boostez votre visibilite"
        actions={
          <Button size="sm" onClick={sendAll}>
            <Send className="size-4" /> Envoyer en masse
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Demandes envoyees" value={String(sent)} icon={<Send className="size-5" />} accent="info" />
        <StatCard label="Avis recus" value={String(received)} icon={<Star className="size-5" />} accent="warning" />
        <StatCard label="Taux de conversion" value={`${rate}%`} trend="+8% ce mois" trendTone="up" icon={<TrendingUp className="size-5" />} accent="success" />
        <StatCard label="Note moyenne" value="4.9 etoiles" hint="sur 87 avis Google" icon={<Star className="size-5" />} accent="primary" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Demandes d'avis</CardTitle>
            <CardDescription>Patients recents et statut des demandes</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden sm:table-cell">Visite</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">Chargement des demandes d'avis...</TableCell>
                  </TableRow>
                )}
                {!loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">Aucune demande d'avis à afficher.</TableCell>
                  </TableRow>
                )}
                {!loading && rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.patient}</div>
                      <div className="text-xs text-muted-foreground">{r.phone}</div>
                      {r.sentAt && <div className="text-xs text-muted-foreground">Envoye le {formatDate(r.sentAt)}</div>}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{formatDate(r.visitDate)}</TableCell>
                    <TableCell><StatusBadge tone={reviewTone(r.status)}>{reviewLabel(r.status)}</StatusBadge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => sendReview(r.id)}>
                        <MessageCircle className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lien Google Reviews</CardTitle>
              <CardDescription>Utilise dans toutes les demandes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={reviewLink} onChange={(e) => setReviewLink(e.target.value)} className="pl-9 text-xs" />
                </div>
                <Button size="icon" variant="outline" onClick={copyLink}>
                  <Copy className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Modele de message</CardTitle>
              <CardDescription>Personnalisez le message envoye</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label className="text-xs text-muted-foreground">WhatsApp</Label>
              <Textarea value={template} onChange={(e) => setTemplate(e.target.value)} rows={5} className="text-xs" />
              <Button size="sm" className="w-full" onClick={() => toast.success("Modele enregistre")}>Enregistrer</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
