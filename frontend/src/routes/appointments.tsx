import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, MessageCircle, Search, CalendarDays, CheckCircle2, Clock, UserX, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ActionDialog } from "@/components/action-dialog";
import { PageHeader, StatCard } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusBadge, apptTone, apptLabel, paymentTone, paymentLabel } from "@/components/status-badge";
import { formatDate, type AppointmentStatus, type PaymentStatus } from "@/lib/demo-data";
import { todayISO, formatLongDate } from "@/lib/date-utils";
import { DEMO_MODE_EVENT, demoAppointments, demoPatients, isDemoMode } from "@/lib/demoMode";
import { logAndOpenWhatsapp } from "@/lib/whatsapp";
import { appointmentsApi, type ApiAppointment, type AppointmentPayload } from "@/services/appointmentsApi";
import { patientsApi, toUiPatient, type PatientRecord } from "@/services/patientsApi";

type FollowUpStatus =
  | "none"
  | "to_contact"
  | "reminder_sent"
  | "waiting_response"
  | "confirmed_by_patient"
  | "needs_call"
  | "done";

type AppointmentRow = {
  id: string;
  date: string;
  time: string;
  endTime?: string;
  patientId: string;
  patient: string;
  phone: string;
  treatment: string;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  notes?: string;
  followUp: boolean;
  followUpStatus: FollowUpStatus;
  followUpNote?: string;
  followUpUpdatedAt?: string;
};

const followUpOptions: { value: FollowUpStatus; label: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }[] = [
  { value: "none", label: "Aucun suivi", tone: "neutral" },
  { value: "to_contact", label: "À recontacter", tone: "warning" },
  { value: "reminder_sent", label: "Rappel envoyé", tone: "info" },
  { value: "waiting_response", label: "En attente réponse", tone: "warning" },
  { value: "confirmed_by_patient", label: "Confirmé par patient", tone: "success" },
  { value: "needs_call", label: "Besoin appel", tone: "danger" },
  { value: "done", label: "Terminé", tone: "success" },
];

const statusesWithNote: FollowUpStatus[] = ["to_contact", "needs_call", "waiting_response"];

const getFollowUpOption = (status: FollowUpStatus) =>
  followUpOptions.find((option) => option.value === status) ?? followUpOptions[0];

const followUpLabel = (status: FollowUpStatus) => getFollowUpOption(status).label;

const toFollowUpStatus = (value?: string | null): FollowUpStatus => {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || normalized === "aucun suivi" || normalized === "none") return "none";
  return followUpOptions.find((option) => option.value === value || option.label.toLowerCase() === normalized)?.value ?? "none";
};

const toUiStatus = (status?: string | null): AppointmentStatus => {
  const normalized = status?.trim().toLowerCase();
  if (normalized === "confirmé" || normalized === "confirme" || normalized === "confirmed") return "confirmed";
  if (normalized === "en attente" || normalized === "waiting") return "waiting";
  if (normalized === "terminé" || normalized === "termine" || normalized === "completed") return "completed";
  if (normalized === "no-show" || normalized === "no_show" || normalized === "absent") return "no_show";
  return "cancelled";
};

const toUiPaymentStatus = (status?: string | null): PaymentStatus => {
  const normalized = status?.trim().toLowerCase();
  if (normalized === "payé" || normalized === "paye" || normalized === "paid") return "paid";
  if (normalized === "partiel" || normalized === "partial") return "partial";
  return "unpaid";
};

const treatmentCatalog = [
  { value: "Consultation + radio panoramique", label: "Consultation + radio panoramique", category: "Diagnostic", duration: "30" },
  { value: "Detartrage complet + polissage", label: "Detartrage complet + polissage", category: "Prevention", duration: "45" },
  { value: "Blanchiment dentaire", label: "Blanchiment dentaire", category: "Esthetique", duration: "60" },
  { value: "Composite esthetique", label: "Composite esthetique", category: "Soins", duration: "45" },
  { value: "Traitement de canal", label: "Traitement de canal", category: "Endodontie", duration: "90" },
  { value: "Extraction dent de sagesse", label: "Extraction dent de sagesse", category: "Chirurgie", duration: "60" },
  { value: "Couronne ceramique", label: "Couronne ceramique", category: "Prothese", duration: "75" },
  { value: "Bridge provisoire", label: "Bridge provisoire", category: "Prothese", duration: "60" },
  { value: "Implant dentaire - pose", label: "Implant dentaire - pose", category: "Implantologie", duration: "120" },
  { value: "Suivi implant", label: "Suivi implant", category: "Implantologie", duration: "30" },
  { value: "Controle orthodontie", label: "Controle orthodontie", category: "Orthodontie", duration: "30" },
  { value: "Urgence douleur", label: "Urgence douleur", category: "Urgence", duration: "30" },
];

export const Route = createFileRoute("/appointments")({
  head: () => ({
    meta: [
      { title: "Rendez-vous - DentalPilot" },
      { name: "description", content: "Vue quotidienne des rendez-vous du cabinet dentaire avec statuts et actions rapides." },
    ],
  }),
  component: AppointmentsPage,
});

function AppointmentsPage() {
  const [rows, setRows] = useState<AppointmentRow[]>([]);
  const [patientRows, setPatientRows] = useState<PatientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [demoMode, setDemoModeState] = useState(() => isDemoMode());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [noteDialog, setNoteDialog] = useState<{ appointmentId: string; status: FollowUpStatus; note: string } | null>(null);
  const [form, setForm] = useState({
    date: todayISO(),
    time: "",
    patientId: "",
    treatment: "",
    duration: "",
    practitioner: "Dr. Safaa M'gaassy",
    room: "Fauteuil 1",
    notes: "",
  });

  const patientsById = useMemo(() => new Map(patientRows.map((patient) => [patient.id, patient])), [patientRows]);

  const toAppointmentRow = (appointment: ApiAppointment): AppointmentRow => {
    const patient = patientsById.get(appointment.patient_id);
    const patientName = appointment.patients?.full_name || patient?.name || "Patient inconnu";
    const phone = appointment.patients?.phone || patient?.phone || "";
    const followUpStatus = toFollowUpStatus(appointment.follow_up_status);
    return {
      id: appointment.id,
      date: appointment.appointment_date,
      time: normalizeTime(appointment.start_time),
      endTime: appointment.end_time ? normalizeTime(appointment.end_time) : undefined,
      patientId: appointment.patient_id,
      patient: patientName,
      phone,
      treatment: appointment.treatment_type || "-",
      status: toUiStatus(appointment.status),
      paymentStatus: toUiPaymentStatus(appointment.payment_status),
      notes: appointment.notes || undefined,
      followUp: followUpStatus !== "none",
      followUpStatus,
      followUpNote: appointment.follow_up_note || undefined,
      followUpUpdatedAt: appointment.follow_up_updated_at || undefined,
    };
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (demoMode) {
        const uiPatients = demoPatients.map(toUiPatient);
        setPatientRows(uiPatients);
        const patientMap = new Map(uiPatients.map((patient) => [patient.id, patient]));
        const appointmentRows = demoAppointments.map((appointment) => {
          const patient = patientMap.get(appointment.patient_id);
          const followUpStatus = toFollowUpStatus(appointment.follow_up_status);
          return {
            id: appointment.id,
            date: appointment.appointment_date,
            time: normalizeTime(appointment.start_time),
            endTime: appointment.end_time ? normalizeTime(appointment.end_time) : undefined,
            patientId: appointment.patient_id,
            patient: appointment.patients?.full_name || patient?.name || "Patient inconnu",
            phone: appointment.patients?.phone || patient?.phone || "",
            treatment: appointment.treatment_type || "-",
            status: toUiStatus(appointment.status),
            paymentStatus: toUiPaymentStatus(appointment.payment_status),
            notes: appointment.notes || undefined,
            followUp: followUpStatus !== "none",
            followUpStatus,
            followUpNote: appointment.follow_up_note || undefined,
            followUpUpdatedAt: appointment.follow_up_updated_at || undefined,
          };
        });
        setRows(appointmentRows);
        return;
      }
      const patients = await patientsApi.list();
      const uiPatients = patients.map(toUiPatient);
      setPatientRows(uiPatients);
      const patientMap = new Map(uiPatients.map((patient) => [patient.id, patient]));
      const appointmentRows = (await appointmentsApi.getAppointments()).map((appointment) => {
        const patient = patientMap.get(appointment.patient_id);
        const followUpStatus = toFollowUpStatus(appointment.follow_up_status);
        return {
          id: appointment.id,
          date: appointment.appointment_date,
          time: normalizeTime(appointment.start_time),
          endTime: appointment.end_time ? normalizeTime(appointment.end_time) : undefined,
          patientId: appointment.patient_id,
          patient: appointment.patients?.full_name || patient?.name || "Patient inconnu",
          phone: appointment.patients?.phone || patient?.phone || "",
          treatment: appointment.treatment_type || "-",
          status: toUiStatus(appointment.status),
          paymentStatus: toUiPaymentStatus(appointment.payment_status),
          notes: appointment.notes || undefined,
          followUp: followUpStatus !== "none",
          followUpStatus,
          followUpNote: appointment.follow_up_note || undefined,
          followUpUpdatedAt: appointment.follow_up_updated_at || undefined,
        };
      });
      setRows(appointmentRows);
    } catch (error) {
      console.error(error);
      toast.error("Impossible de charger les rendez-vous.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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

  const filtered = rows.filter((a) => {
    const search = q.trim().toLowerCase();
    if (search) {
      const haystack = [a.patient, a.phone, a.treatment, apptLabel(a.status), paymentLabel(a.paymentStatus), followUpLabel(a.followUpStatus)]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (filter !== "all" && a.status !== filter) return false;
    return true;
  });

  const counts = {
    confirmed: rows.filter((a) => a.status === "confirmed").length,
    completed: rows.filter((a) => a.status === "completed").length,
    waiting: rows.filter((a) => a.status === "waiting").length,
    no_show: rows.filter((a) => a.status === "no_show").length,
  };

  const addAppointment = async () => {
    if (patientRows.length === 0) {
      toast.error("Ajoutez d’abord un patient avant de créer un rendez-vous.");
      return;
    }
    setIsSaving(true);
    try {
      const payload: AppointmentPayload = {
        patient_id: form.patientId,
        appointment_date: form.date,
        start_time: form.time,
        end_time: addMinutes(form.time, Number(form.duration)),
        treatment_type: `${form.treatment}${form.duration ? ` - ${form.duration} min` : ""}${form.practitioner ? ` - ${form.practitioner}` : ""}${form.room ? ` - ${form.room}` : ""}`,
        status: "Confirmé",
        payment_status: "Impayé",
        notes: form.notes.trim() || undefined,
        follow_up_status: "Aucun suivi",
      };
      if (demoMode) {
        const patient = patientRows.find((row) => row.id === form.patientId);
        const created = toAppointmentRow({
          id: `demo-appt-${Date.now()}`,
          patient_id: form.patientId,
          appointment_date: form.date,
          start_time: form.time,
          end_time: payload.end_time,
          treatment_type: payload.treatment_type,
          status: payload.status || "Confirmé",
          payment_status: payload.payment_status,
          notes: payload.notes,
          follow_up_status: payload.follow_up_status,
          patients: patient ? { id: patient.id, full_name: patient.name, phone: patient.phone } : null,
        });
        setRows((current) => [created, ...current]);
        setForm({
          date: todayISO(),
          time: "",
          patientId: "",
          treatment: "",
          duration: "",
          practitioner: "Dr. Safaa M'gaassy",
          room: "Fauteuil 1",
          notes: "",
        });
        setIsAddOpen(false);
        toast.success("RDV ajouté avec succès.");
        return;
      }
      const created = await appointmentsApi.createAppointment(payload);
      setRows((current) => [toAppointmentRow(created), ...current]);
      setForm({
        date: todayISO(),
        time: "",
        patientId: "",
        treatment: "",
        duration: "",
        practitioner: "Dr. Safaa M'gaassy",
        room: "Fauteuil 1",
        notes: "",
      });
      setIsAddOpen(false);
      toast.success("RDV ajouté avec succès.");
    } catch (error) {
      console.error(error);
      toast.error("Impossible d'ajouter le rendez-vous.");
    } finally {
      setIsSaving(false);
    }
  };

  const sendReminder = (appointment: AppointmentRow) => {
    if (!appointment.phone) {
      toast.error("Numéro WhatsApp du patient manquant.");
      return;
    }
    const message = `Bonjour ${appointment.patient}, nous vous rappelons votre rendez-vous au cabinet prévu le ${formatDate(appointment.date)} à ${appointment.time}. Merci de confirmer votre présence.`;
    logAndOpenWhatsapp({ patientId: appointment.patientId, type: "appointment_reminder", phone: appointment.phone, message });
  };

  const saveFollowUp = async (appointmentId: string, followUpStatus: FollowUpStatus, followUpNote?: string) => {
    try {
      const updatedAt = new Date().toISOString();
      if (demoMode) {
        setRows((current) =>
          current.map((appointment) =>
            appointment.id === appointmentId
              ? {
                  ...appointment,
                  followUpStatus,
                  followUpNote: followUpNote?.trim() || undefined,
                  followUp: followUpStatus !== "none",
                  followUpUpdatedAt: updatedAt,
                }
              : appointment,
          ),
        );
        toast.success("Suivi mis à jour avec succès.");
        return;
      }
      await appointmentsApi.updateAppointment(appointmentId, {
        follow_up_status: followUpLabel(followUpStatus),
        follow_up_note: followUpNote?.trim() || null,
        follow_up_updated_at: updatedAt,
      });
      setRows((current) =>
        current.map((appointment) =>
          appointment.id === appointmentId
            ? {
                ...appointment,
                followUpStatus,
                followUpNote: followUpNote?.trim() || undefined,
                followUp: followUpStatus !== "none",
                followUpUpdatedAt: updatedAt,
              }
            : appointment,
        ),
      );
      toast.success("Suivi mis à jour avec succès.");
    } catch (error) {
      console.error(error);
      toast.error("Impossible de mettre à jour le suivi.");
    }
  };

  const changeFollowUp = (appointment: AppointmentRow, followUpStatus: FollowUpStatus) => {
    if (statusesWithNote.includes(followUpStatus)) {
      setNoteDialog({ appointmentId: appointment.id, status: followUpStatus, note: appointment.followUpNote ?? "" });
      return;
    }
    saveFollowUp(appointment.id, followUpStatus, followUpStatus === "none" ? "" : appointment.followUpNote);
  };

  const saveFollowUpNote = async () => {
    if (!noteDialog) return;
    await saveFollowUp(noteDialog.appointmentId, noteDialog.status, noteDialog.note);
    setNoteDialog(null);
  };

  const sendFollowUpWhatsApp = (appointment: AppointmentRow) => {
    if (!appointment.phone) {
      toast.error("Numéro WhatsApp du patient manquant.");
      return;
    }
    const message = `Bonjour ${appointment.patient}, nous vous contactons concernant votre rendez-vous au Cabinet Atlas - Casablanca. Merci de nous confirmer votre disponibilité.`;
    logAndOpenWhatsapp({ patientId: appointment.patientId, type: "appointment_reminder", phone: appointment.phone, message });
  };

  const deleteAppointment = async (appointment: AppointmentRow) => {
    const confirmed = window.confirm("Êtes-vous sûr de vouloir supprimer ce rendez-vous ?");
    if (!confirmed) return;
    setDeletingId(appointment.id);
    try {
      if (demoMode) {
        setRows((current) => current.filter((row) => row.id !== appointment.id));
        toast.success("RDV supprimé avec succès.");
        return;
      }
      await appointmentsApi.deleteAppointment(appointment.id);
      setRows((current) => current.filter((row) => row.id !== appointment.id));
      toast.success("RDV supprimé avec succès.");
    } catch (error) {
      console.error(error);
      toast.error("Impossible de supprimer le rendez-vous.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rendez-vous"
        description={`Planning du jour - ${formatLongDate()}`}
        actions={
          <ActionDialog
            title="Nouveau rendez-vous"
            description="Ajoutez un rendez-vous visible dans le planning."
            open={isAddOpen}
            onOpenChange={setIsAddOpen}
            onSubmit={addAppointment}
            submitLabel={isSaving ? "Création..." : "Créer"}
            disabled={isSaving || patientRows.length === 0 || !form.date || !form.time || !form.patientId || !form.treatment.trim() || !form.duration}
            trigger={
              <Button size="sm">
                <CalendarPlus className="size-4" /> Nouveau RDV
              </Button>
            }
          >
            {patientRows.length === 0 ? (
              <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                Ajoutez d’abord un patient avant de créer un rendez-vous.
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="appt-date">Date</Label>
                <Input id="appt-date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="appt-time">Heure</Label>
                <Input id="appt-time" type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="appt-patient">Patient</Label>
              <Select value={form.patientId} onValueChange={(patientId) => setForm((f) => ({ ...f, patientId }))}>
                <SelectTrigger id="appt-patient">
                  <SelectValue placeholder="Choisir un patient" />
                </SelectTrigger>
                <SelectContent>
                  {patientRows.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name}{patient.phone ? ` - ${patient.phone}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Traitement</Label>
              <Select
                value={form.treatment}
                onValueChange={(value) => {
                  const selected = treatmentCatalog.find((t) => t.value === value);
                  setForm((f) => ({ ...f, treatment: value, duration: selected?.duration ?? f.duration }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un traitement" />
                </SelectTrigger>
                <SelectContent>
                  {treatmentCatalog.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.category} - {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Duree</Label>
                <Select value={form.duration} onValueChange={(duration) => setForm((f) => ({ ...f, duration }))}>
                  <SelectTrigger><SelectValue placeholder="Duree" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                    <SelectItem value="75">75 min</SelectItem>
                    <SelectItem value="90">90 min</SelectItem>
                    <SelectItem value="120">120 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Praticien</Label>
                <Select value={form.practitioner} onValueChange={(practitioner) => setForm((f) => ({ ...f, practitioner }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dr. Safaa M'gaassy">Dr. Safaa M'gaassy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Salle</Label>
                <Select value={form.room} onValueChange={(room) => setForm((f) => ({ ...f, room }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fauteuil 1">Fauteuil 1</SelectItem>
                    <SelectItem value="Fauteuil 2">Fauteuil 2</SelectItem>
                    <SelectItem value="Salle radio">Salle radio</SelectItem>
                    <SelectItem value="Bloc chirurgie">Bloc chirurgie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="appt-notes">Notes rapides</Label>
              <Textarea
                id="appt-notes"
                rows={3}
                placeholder="Ex: patient anxieux, venir 10 min avant, devis a preparer..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </ActionDialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Confirmes" value={String(counts.confirmed)} icon={<CalendarDays className="size-5" />} accent="info" />
        <StatCard label="Termines" value={String(counts.completed)} icon={<CheckCircle2 className="size-5" />} accent="success" />
        <StatCard label="En salle d'attente" value={String(counts.waiting)} icon={<Clock className="size-5" />} accent="warning" />
        <StatCard label="Absents" value={String(counts.no_show)} icon={<UserX className="size-5" />} accent="danger" />
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher un patient..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList>
                <TabsTrigger value="all">Tous</TabsTrigger>
                <TabsTrigger value="confirmed">Confirmes</TabsTrigger>
                <TabsTrigger value="waiting">En attente</TabsTrigger>
                <TabsTrigger value="completed">Termines</TabsTrigger>
                <TabsTrigger value="no_show">Absents</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Heure</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Traitement</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead>Suivi</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                      Chargement des rendez-vous...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                      Aucun rendez-vous trouvé.
                    </TableCell>
                  </TableRow>
                ) : filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(a.date)}</TableCell>
                    <TableCell className="font-mono text-sm font-medium">{a.time}</TableCell>
                    <TableCell className="font-medium">{a.patient}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.phone || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{a.treatment}</TableCell>
                    <TableCell><StatusBadge tone={apptTone(a.status)}>{apptLabel(a.status)}</StatusBadge></TableCell>
                    <TableCell><StatusBadge tone={paymentTone(a.paymentStatus)}>{paymentLabel(a.paymentStatus)}</StatusBadge></TableCell>
                    <TableCell>
                      <FollowUpControl
                        appointment={a}
                        onChange={changeFollowUp}
                        onSendWhatsApp={sendFollowUpWhatsApp}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" aria-label="Actions rendez-vous">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => sendReminder(a)}>
                            <MessageCircle className="size-4" /> WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => deleteAppointment(a)}
                            disabled={deletingId === a.id}
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                          >
                            <Trash2 className="size-4" /> Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!noteDialog} onOpenChange={(open) => !open && setNoteDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Note de suivi</DialogTitle>
            <DialogDescription>Ajoutez une note optionnelle pour ce suivi.</DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            placeholder="Ajouter une note de suivi..."
            value={noteDialog?.note ?? ""}
            onChange={(event) => setNoteDialog((current) => (current ? { ...current, note: event.target.value } : current))}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialog(null)}>Annuler</Button>
            <Button onClick={saveFollowUpNote}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FollowUpControl({
  appointment,
  onChange,
  onSendWhatsApp,
}: {
  appointment: AppointmentRow;
  onChange: (appointment: AppointmentRow, status: FollowUpStatus) => void;
  onSendWhatsApp: (appointment: AppointmentRow) => void;
}) {
  const option = getFollowUpOption(appointment.followUpStatus);
  const badge = <StatusBadge tone={option.tone}>{option.label}</StatusBadge>;

  return (
    <div className="flex items-center gap-1.5">
      {appointment.followUpNote ? (
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent className="max-w-64 leading-relaxed">{appointment.followUpNote}</TooltipContent>
        </Tooltip>
      ) : (
        badge
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
            Modifier
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {followUpOptions.map((followUpOption) => (
            <DropdownMenuItem key={followUpOption.value} onClick={() => onChange(appointment, followUpOption.value)}>
              <StatusBadge tone={followUpOption.tone} className="mr-1">{followUpOption.label}</StatusBadge>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onSendWhatsApp(appointment)}>
            <MessageCircle className="size-4" /> Envoyer WhatsApp
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="ghost" size="icon" className="size-7" onClick={() => onSendWhatsApp(appointment)} aria-label="Envoyer un message WhatsApp">
        <MessageCircle className="size-4" />
      </Button>
    </div>
  );
}

function normalizeTime(value: string) {
  return value.slice(0, 5);
}

function addMinutes(time: string, minutes: number) {
  const [hours, mins] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, mins + minutes, 0, 0);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
