import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, BellRing, MessageCircle, CalendarPlus, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

import { ActionDialog } from "@/components/action-dialog";
import { PageHeader, StatCard } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge, recallTone, recallLabel } from "@/components/status-badge";
import { recalls, formatDate, type Recall } from "@/lib/demo-data";
import { todayISO } from "@/lib/date-utils";
import { fillWhatsAppTemplate, openWhatsAppMessage, whatsappTemplates } from "@/lib/whatsapp";

export const Route = createFileRoute("/recalls")({
  head: () => ({
    meta: [
      { title: "Rappels patients - DentalPilot" },
      { name: "description", content: "Systeme de rappels intelligent : detartrages, controles, suivis orthodontiques et implants." },
    ],
  }),
  component: RecallsPage,
});

const rules = [
  { label: "Detartrage", interval: "Tous les 6 mois" },
  { label: "Controle annuel", interval: "Tous les 12 mois" },
  { label: "Controle orthodontie", interval: "Tous les mois" },
  { label: "Suivi implant", interval: "1, 3 et 6 mois" },
  { label: "Controle post-traitement", interval: "2 semaines apres" },
  { label: "Controle enfant", interval: "Tous les 6 mois" },
];

const recallTypes = [
  { value: "Detartrage", intervalDays: 180, template: "Controle hygiene et detartrage semestriel" },
  { value: "Controle annuel", intervalDays: 365, template: "Bilan annuel avec radio si necessaire" },
  { value: "Controle orthodontie", intervalDays: 30, template: "Activation et controle orthodontique" },
  { value: "Suivi implant", intervalDays: 90, template: "Controle cicatrisation et stabilite implant" },
  { value: "Controle post-traitement", intervalDays: 14, template: "Verifier douleur, occlusion et sensibilite" },
  { value: "Controle enfant", intervalDays: 180, template: "Prevention caries et controle croissance" },
  { value: "Relance devis", intervalDays: 7, template: "Recontacter pour decision sur le devis" },
  { value: "Urgence a rappeler", intervalDays: 1, template: "Appel prioritaire apres urgence" },
];

const addDays = (iso: string, days: number) => {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

function RecallsPage() {
  const [rows, setRows] = useState<Recall[]>(recalls);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({
    patient: "",
    phone: "",
    type: "",
    lastVisit: todayISO(),
    nextRecall: "",
    priority: "Normale",
    channel: "WhatsApp",
    owner: "Assistante",
    notes: "",
  });

  const filtered = rows.filter((r) => {
    if (q && !r.patient.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter !== "all" && r.status !== filter) return false;
    return true;
  });

  const addRecall = () => {
    const recall: Recall = {
      id: `r${Date.now()}`,
      patientId: `p${Date.now()}`,
      patient: form.patient.trim(),
      phone: form.phone.trim(),
      type: form.type.trim(),
      lastVisit: form.lastVisit,
      nextRecall: form.nextRecall,
      status: form.priority === "Urgente" ? "due_soon" : "scheduled",
    };
    setRows((current) => [recall, ...current]);
    setForm({
      patient: "",
      phone: "",
      type: "",
      lastVisit: todayISO(),
      nextRecall: "",
      priority: "Normale",
      channel: "WhatsApp",
      owner: "Assistante",
      notes: "",
    });
    setIsAddOpen(false);
    toast.success("Rappel cree");
  };

  const sendRecall = (id: string) => {
    const recall = rows.find((r) => r.id === id);
    const message = fillWhatsAppTemplate(whatsappTemplates.recall, {
      Patient: recall?.patient,
      "Type de rappel": recall?.type,
    });
    if (!openWhatsAppMessage(recall?.phone, message)) return;
    setRows((current) => current.map((r) => (r.id === id ? { ...r, status: "sent" } : r)));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rappels patients"
        description="Faites revenir vos patients automatiquement"
        actions={
          <ActionDialog
            title="Nouveau rappel"
            description="Ajoutez un rappel visible dans la table."
            open={isAddOpen}
            onOpenChange={setIsAddOpen}
            onSubmit={addRecall}
            submitLabel="Creer"
            disabled={!form.patient.trim() || !form.phone.trim() || !form.type.trim() || !form.lastVisit || !form.nextRecall}
            trigger={
              <Button size="sm">
                <CalendarPlus className="size-4" /> Nouveau rappel
              </Button>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2"><Label htmlFor="recall-patient">Patient</Label><Input id="recall-patient" value={form.patient} onChange={(e) => setForm((f) => ({ ...f, patient: e.target.value }))} /></div>
              <div className="grid gap-2"><Label htmlFor="recall-phone">Telephone</Label><Input id="recall-phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div className="grid gap-2">
              <Label>Type de rappel</Label>
              <Select
                value={form.type}
                onValueChange={(type) => {
                  const selected = recallTypes.find((r) => r.value === type);
                  setForm((f) => ({
                    ...f,
                    type,
                    nextRecall: selected ? addDays(f.lastVisit, selected.intervalDays) : f.nextRecall,
                    notes: selected?.template ?? f.notes,
                  }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Choisir une regle de rappel" /></SelectTrigger>
                <SelectContent>
                  {recallTypes.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.value} - J+{r.intervalDays}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2"><Label htmlFor="recall-last">Derniere visite</Label><Input id="recall-last" type="date" value={form.lastVisit} onChange={(e) => {
                const selected = recallTypes.find((r) => r.value === form.type);
                setForm((f) => ({ ...f, lastVisit: e.target.value, nextRecall: selected ? addDays(e.target.value, selected.intervalDays) : f.nextRecall }));
              }} /></div>
              <div className="grid gap-2"><Label htmlFor="recall-date">Prochain rappel</Label><Input id="recall-date" type="date" value={form.nextRecall} onChange={(e) => setForm((f) => ({ ...f, nextRecall: e.target.value }))} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Priorite</Label>
                <Select value={form.priority} onValueChange={(priority) => setForm((f) => ({ ...f, priority }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normale">Normale</SelectItem>
                    <SelectItem value="Elevee">Elevee</SelectItem>
                    <SelectItem value="Urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Canal</Label>
                <Select value={form.channel} onValueChange={(channel) => setForm((f) => ({ ...f, channel }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    <SelectItem value="SMS">SMS</SelectItem>
                    <SelectItem value="Appel">Appel</SelectItem>
                    <SelectItem value="Email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Responsable</Label>
                <Select value={form.owner} onValueChange={(owner) => setForm((f) => ({ ...f, owner }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Assistante">Assistante</SelectItem>
                    <SelectItem value="Dr. Safaa M'gaassy">Dr. Safaa M'gaassy</SelectItem>
                    <SelectItem value="Accueil">Accueil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="recall-notes">Script / notes</Label>
              <Textarea
                id="recall-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Message ou consigne pour la relance..."
              />
            </div>
          </ActionDialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Planifies" value={String(rows.filter((r) => r.status === "scheduled").length)} icon={<BellRing className="size-5" />} accent="info" />
        <StatCard label="Bientot dus" value={String(rows.filter((r) => r.status === "due_soon").length)} icon={<Clock className="size-5" />} accent="warning" />
        <StatCard label="En retard" value={String(rows.filter((r) => r.status === "overdue").length)} icon={<AlertTriangle className="size-5" />} accent="danger" />
        <StatCard label="Termines ce mois" value="14" icon={<CheckCircle2 className="size-5" />} accent="success" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Rechercher..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
              </div>
              <Tabs value={filter} onValueChange={setFilter}>
                <TabsList>
                  <TabsTrigger value="all">Tous</TabsTrigger>
                  <TabsTrigger value="overdue">En retard</TabsTrigger>
                  <TabsTrigger value="due_soon">Bientot</TabsTrigger>
                  <TabsTrigger value="scheduled">Planifies</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Type</TableHead><TableHead className="hidden md:table-cell">Derniere visite</TableHead><TableHead>Prochain rappel</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell><div className="font-medium">{r.patient}</div><div className="text-xs text-muted-foreground">{r.phone}</div></TableCell>
                      <TableCell className="text-sm">{r.type}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDate(r.lastVisit)}</TableCell>
                      <TableCell className="text-sm font-medium">{formatDate(r.nextRecall)}</TableCell>
                      <TableCell><StatusBadge tone={recallTone(r.status)}>{recallLabel(r.status)}</StatusBadge></TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => sendRecall(r.id)}><MessageCircle className="size-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Regles de rappel</CardTitle><CardDescription>Modeles intelligents actives</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {rules.map((r) => (
              <div key={r.label} className="flex items-center justify-between rounded-xl border bg-background/50 p-3">
                <div><p className="text-sm font-medium">{r.label}</p><p className="text-xs text-muted-foreground">{r.interval}</p></div>
                <div className="size-2 rounded-full bg-success" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
