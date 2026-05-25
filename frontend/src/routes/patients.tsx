import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, UserPlus, MessageCircle, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

import { ActionDialog } from "@/components/action-dialog";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge, patientTone, patientLabel } from "@/components/status-badge";
import { patients, formatDate, type Patient } from "@/lib/demo-data";
import { todayISO, formatShortDate } from "@/lib/date-utils";
import { fillWhatsAppTemplate, openWhatsAppMessage, whatsappTemplates } from "@/lib/whatsapp";

export const Route = createFileRoute("/patients")({
  head: () => ({
    meta: [
      { title: "Patients - DentalPilot" },
      { name: "description", content: "CRM patients du cabinet : profils, historique, suivi et statuts." },
    ],
  }),
  component: PatientsPage,
});

function PatientsPage() {
  const [rows, setRows] = useState<Patient[]>(patients);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: "",
    phone: "",
    email: "",
    status: "active" as Patient["status"],
    source: "Walk-in",
    notes: "",
  });

  const filtered = rows.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q.toLowerCase()) && !p.phone.includes(q)) return false;
    if (filter !== "all" && p.status !== filter) return false;
    return true;
  });

  const addPatient = () => {
    const patient: Patient = {
      id: `p${Date.now()}`,
      name: newPatient.name.trim(),
      phone: newPatient.phone.trim(),
      email: newPatient.email.trim(),
      status: newPatient.status,
      lastVisit: todayISO(),
      notes: [newPatient.notes.trim(), `Source: ${newPatient.source}`].filter(Boolean).join(" - ") || "Nouveau patient",
    };
    setRows((current) => [patient, ...current]);
    setNewPatient({ name: "", phone: "", email: "", status: "active", source: "Walk-in", notes: "" });
    setIsAddOpen(false);
    toast.success(`${patient.name} ajoute`);
  };

  const sendMessage = (id: string) => {
    const patient = rows.find((p) => p.id === id);
    const message = fillWhatsAppTemplate(whatsappTemplates.recall, {
      Patient: patient?.name,
      "Type de rappel": "votre suivi dentaire",
    });
    if (!openWhatsAppMessage(patient?.phone, message)) return;
    setRows((current) =>
      current.map((p) => (p.id === id ? { ...p, notes: `Message WhatsApp envoye le ${formatShortDate()}` } : p)),
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        description={`${rows.length} patients enregistres dans le cabinet`}
        actions={
          <ActionDialog
            title="Ajouter un patient"
            description="Le patient sera ajoute a la liste pour vos tests."
            open={isAddOpen}
            onOpenChange={setIsAddOpen}
            onSubmit={addPatient}
            submitLabel="Ajouter"
            disabled={!newPatient.name.trim() || !newPatient.phone.trim() || !newPatient.email.trim()}
            trigger={
              <Button size="sm">
                <UserPlus className="size-4" /> Ajouter un patient
              </Button>
            }
          >
            <div className="grid gap-2">
              <Label htmlFor="patient-name">Nom</Label>
              <Input id="patient-name" value={newPatient.name} onChange={(e) => setNewPatient((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="patient-phone">Telephone</Label>
              <Input id="patient-phone" value={newPatient.phone} onChange={(e) => setNewPatient((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="patient-email">Email</Label>
              <Input id="patient-email" type="email" value={newPatient.email} onChange={(e) => setNewPatient((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Statut initial</Label>
                <Select value={newPatient.status} onValueChange={(status) => setNewPatient((p) => ({ ...p, status: status as Patient["status"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="follow_up">Suivi</SelectItem>
                    <SelectItem value="payment_pending">Paiement du</SelectItem>
                    <SelectItem value="recall_due">Rappel du</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Source</Label>
                <Select value={newPatient.source} onValueChange={(source) => setNewPatient((p) => ({ ...p, source }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Walk-in">Walk-in</SelectItem>
                    <SelectItem value="Google">Google</SelectItem>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                    <SelectItem value="Recommandation">Recommandation</SelectItem>
                    <SelectItem value="Urgence">Urgence</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="patient-notes">Notes patient</Label>
              <Textarea
                id="patient-notes"
                rows={3}
                placeholder="Ex: allergie, preference WhatsApp, anxieux, devis demande..."
                value={newPatient.notes}
                onChange={(e) => setNewPatient((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </ActionDialog>
        }
      />

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Nom, telephone..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList>
                <TabsTrigger value="all">Tous</TabsTrigger>
                <TabsTrigger value="active">Actifs</TabsTrigger>
                <TabsTrigger value="payment_pending">Paiement du</TabsTrigger>
                <TabsTrigger value="recall_due">Rappel du</TabsTrigger>
                <TabsTrigger value="follow_up">Suivi</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead className="hidden sm:table-cell">Derniere visite</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden lg:table-cell">Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                          {p.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                        </div>
                        <div>
                          <p className="font-medium leading-tight">{p.name}</p>
                          <p className="text-xs text-muted-foreground md:hidden">{p.phone}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5"><Phone className="size-3" /> {p.phone}</div>
                      <div className="flex items-center gap-1.5"><Mail className="size-3" /> {p.email}</div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{formatDate(p.lastVisit)}</TableCell>
                    <TableCell><StatusBadge tone={patientTone(p.status)}>{patientLabel(p.status)}</StatusBadge></TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{p.notes ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => sendMessage(p.id)}>
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
    </div>
  );
}
