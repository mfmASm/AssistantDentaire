import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarPlus, MessageCircle, Search, CalendarDays, CheckCircle2, Clock, UserX } from "lucide-react";
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
import { appointments, patients, formatDate, type Appointment } from "@/lib/demo-data";
import { todayISO, formatLongDate } from "@/lib/date-utils";
import { fillWhatsAppTemplate, openWhatsAppMessage, whatsappTemplates } from "@/lib/whatsapp";

type FollowUpStatus =
  | "none"
  | "to_contact"
  | "reminder_sent"
  | "waiting_response"
  | "confirmed_by_patient"
  | "needs_call"
  | "done";

type AppointmentRow = Appointment & {
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

const initialFollowUpStatus = (appointment: Appointment): FollowUpStatus => (appointment.followUp ? "to_contact" : "none");

const getFollowUpOption = (status: FollowUpStatus) =>
  followUpOptions.find((option) => option.value === status) ?? followUpOptions[0];

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
  const [rows, setRows] = useState<AppointmentRow[]>(() =>
    appointments.map((appointment) => ({
      ...appointment,
      followUpStatus: initialFollowUpStatus(appointment),
    })),
  );
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [noteDialog, setNoteDialog] = useState<{ appointmentId: string; status: FollowUpStatus; note: string } | null>(null);
  const [form, setForm] = useState({
    date: todayISO(),
    time: "",
    patient: "",
    treatment: "",
    duration: "",
    practitioner: "Dr. Safaa M'gaassy",
    room: "Fauteuil 1",
    notes: "",
  });

  const filtered = rows.filter((a) => {
    if (q && !a.patient.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter !== "all" && a.status !== filter) return false;
    return true;
  });

  const counts = {
    confirmed: rows.filter((a) => a.status === "confirmed").length,
    completed: rows.filter((a) => a.status === "completed").length,
    waiting: rows.filter((a) => a.status === "waiting").length,
    no_show: rows.filter((a) => a.status === "no_show").length,
  };

  const addAppointment = () => {
    const appointment: AppointmentRow = {
      id: `a${Date.now()}`,
      time: form.time,
      patientId: `p${Date.now()}`,
      patient: form.patient.trim(),
      treatment: `${form.treatment}${form.duration ? ` - ${form.duration} min` : ""}${form.practitioner ? ` - ${form.practitioner}` : ""}${form.room ? ` - ${form.room}` : ""}`,
      status: "confirmed",
      paymentStatus: "unpaid",
      followUp: false,
      followUpStatus: "none",
    };
    setRows((current) => [appointment, ...current]);
    setForm({
      date: todayISO(),
      time: "",
      patient: "",
      treatment: "",
      duration: "",
      practitioner: "Dr. Safaa M'gaassy",
      room: "Fauteuil 1",
      notes: "",
    });
    setIsAddOpen(false);
    toast.success("Rendez-vous cree");
  };

  const sendReminder = (id: string) => {
    const appointment = rows.find((a) => a.id === id);
    const patient = patients.find((p) => p.id === appointment?.patientId || p.name === appointment?.patient);
    const message = fillWhatsAppTemplate(whatsappTemplates.appointment, {
      Patient: appointment?.patient,
      Date: formatDate(todayISO()),
      Heure: appointment?.time,
    });
    if (!openWhatsAppMessage(patient?.phone, message)) return;
    setRows((current) => current.map((a) => (a.id === id ? { ...a, status: "confirmed" } : a)));
  };

  const saveFollowUp = (appointmentId: string, followUpStatus: FollowUpStatus, followUpNote?: string) => {
    const payload = { followUpStatus, followUpNote: followUpNote?.trim() || undefined };
    setRows((current) =>
      current.map((appointment) =>
        appointment.id === appointmentId
          ? {
              ...appointment,
              ...payload,
              followUp: followUpStatus !== "none",
              followUpUpdatedAt: new Date().toISOString(),
            }
          : appointment,
      ),
    );
    toast.success("Suivi mis à jour avec succès.");
  };

  const changeFollowUp = (appointment: AppointmentRow, followUpStatus: FollowUpStatus) => {
    if (statusesWithNote.includes(followUpStatus)) {
      setNoteDialog({ appointmentId: appointment.id, status: followUpStatus, note: appointment.followUpNote ?? "" });
      return;
    }
    saveFollowUp(appointment.id, followUpStatus, followUpStatus === "none" ? "" : appointment.followUpNote);
  };

  const saveFollowUpNote = () => {
    if (!noteDialog) return;
    saveFollowUp(noteDialog.appointmentId, noteDialog.status, noteDialog.note);
    setNoteDialog(null);
  };

  const sendFollowUpWhatsApp = (appointment: AppointmentRow) => {
    const patient = patients.find((p) => p.id === appointment.patientId || p.name === appointment.patient);
    if (!patient?.phone) {
      toast.error("Numéro WhatsApp du patient manquant.");
      return;
    }
    openWhatsAppMessage(
      patient.phone,
      `Bonjour ${appointment.patient}, nous vous contactons concernant votre rendez-vous au Cabinet Atlas — Casablanca. Merci de nous confirmer votre disponibilité.`,
    );
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
            submitLabel="Creer"
            disabled={!form.date || !form.time || !form.patient.trim() || !form.treatment.trim() || !form.duration}
            trigger={
              <Button size="sm">
                <CalendarPlus className="size-4" /> Nouveau RDV
              </Button>
            }
          >
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
              <Input id="appt-patient" value={form.patient} onChange={(e) => setForm((f) => ({ ...f, patient: e.target.value }))} />
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
                  <TableHead>Heure</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Traitement</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead>Suivi</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-sm font-medium">{a.time}</TableCell>
                    <TableCell className="font-medium">{a.patient}</TableCell>
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
                      <Button variant="ghost" size="sm" onClick={() => sendReminder(a.id)}>
                        <MessageCircle className="size-4" />
                      </Button>
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
            placeholder="Ajouter une note de suivi…"
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
