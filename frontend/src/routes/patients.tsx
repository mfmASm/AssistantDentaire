import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarPlus, Eye, Mail, MessageCircle, MoreHorizontal, Pencil, Phone, Search, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { ActionDialog } from "@/components/action-dialog";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge, patientTone, patientLabel } from "@/components/status-badge";
import { formatDate, type Patient } from "@/lib/demo-data";
import { formatShortDate } from "@/lib/date-utils";
import { DEMO_MODE_EVENT, demoPatients, isDemoMode } from "@/lib/demoMode";
import { logAndOpenWhatsapp } from "@/lib/whatsapp";
import { patientsApi, toUiPatient, type PatientPayload, type PatientRecord } from "@/services/patientsApi";

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
  const [rows, setRows] = useState<PatientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [demoMode, setDemoModeState] = useState(() => isDemoMode());
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: "",
    phone: "",
    email: "",
    age: "",
    gender: "",
    address: "",
    status: "active" as Patient["status"],
    source: "Walk-in",
    notes: "",
  });
  const [editPatient, setEditPatient] = useState({
    name: "",
    phone: "",
    email: "",
    age: "",
    gender: "",
    address: "",
    status: "active" as Patient["status"],
    notes: "",
  });

  const loadPatients = async () => {
    setIsLoading(true);
    try {
      if (demoMode) {
        setRows(demoPatients.map(toUiPatient));
        return;
      }
      const patients = await patientsApi.list();
      setRows(patients.map(toUiPatient));
    } catch {
      toast.error("Impossible de charger les patients.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
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

  const filtered = rows.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q.toLowerCase()) && !p.phone.includes(q)) return false;
    if (filter !== "all" && p.status !== filter) return false;
    return true;
  });

  const addPatient = async () => {
    setIsSaving(true);
    try {
      const payload: PatientPayload = {
        full_name: newPatient.name.trim(),
        phone: newPatient.phone.trim() || undefined,
        email: newPatient.email.trim() || undefined,
        age: newPatient.age ? Number(newPatient.age) : undefined,
        gender: newPatient.gender || undefined,
        address: newPatient.address.trim() || undefined,
        status: newPatient.status,
        notes: [newPatient.notes.trim(), `Source: ${newPatient.source}`].filter(Boolean).join(" - ") || "Nouveau patient",
      };
      if (demoMode) {
        const created = toUiPatient({ id: `demo-patient-${Date.now()}`, ...payload });
        setRows((current) => [created, ...current]);
        setNewPatient({ name: "", phone: "", email: "", age: "", gender: "", address: "", status: "active", source: "Walk-in", notes: "" });
        setIsAddOpen(false);
        toast.success("Patient ajouté avec succès.");
        return;
      }
      const created = await patientsApi.create(payload);
      setRows((current) => [toUiPatient(created), ...current]);
      setNewPatient({ name: "", phone: "", email: "", age: "", gender: "", address: "", status: "active", source: "Walk-in", notes: "" });
      setIsAddOpen(false);
      toast.success("Patient ajouté avec succès.");
    } catch {
      toast.error("Impossible d'ajouter le patient.");
    } finally {
      setIsSaving(false);
    }
  };

  const sendMessage = (id: string) => {
    const patient = rows.find((p) => p.id === id);
    if (!patient?.phone) {
      toast.error("Numéro WhatsApp du patient manquant.");
      return;
    }
    const message = `Bonjour ${patient.name}, nous vous contactons depuis le cabinet. Comment pouvons-nous vous aider ?`;
    if (!logAndOpenWhatsapp({ patientId: id, type: "patient_message", phone: patient.phone, message })) return;
    setRows((current) =>
      current.map((p) => (p.id === id ? { ...p, notes: `Message WhatsApp envoye le ${formatShortDate()}` } : p)),
    );
  };

  const openViewPatient = (patient: PatientRecord) => {
    setSelectedPatient(patient);
    setIsViewOpen(true);
  };

  const openEditPatient = (patient: PatientRecord) => {
    setSelectedPatient(patient);
    setEditPatient({
      name: patient.name,
      phone: patient.phone,
      email: patient.email,
      age: patient.age == null ? "" : String(patient.age),
      gender: patient.gender || "",
      address: patient.address || "",
      status: patient.status,
      notes: patient.notes || "",
    });
    setIsEditOpen(true);
  };

  const updatePatient = async () => {
    if (!selectedPatient) return;
    setIsSaving(true);
    try {
      const payload: PatientPayload = {
        full_name: editPatient.name.trim(),
        phone: editPatient.phone.trim() || undefined,
        email: editPatient.email.trim() || undefined,
        age: editPatient.age ? Number(editPatient.age) : undefined,
        gender: editPatient.gender || undefined,
        address: editPatient.address.trim() || undefined,
        status: editPatient.status,
        notes: editPatient.notes.trim() || undefined,
      };
      if (demoMode) {
        const uiPatient = toUiPatient({ id: selectedPatient.id, ...payload, created_at: selectedPatient.created_at, updated_at: new Date().toISOString() });
        setRows((current) => current.map((patient) => (patient.id === selectedPatient.id ? uiPatient : patient)));
        setSelectedPatient(uiPatient);
        setIsEditOpen(false);
        toast.success("Patient mis à jour avec succès.");
        return;
      }
      const updated = await patientsApi.update(selectedPatient.id, payload);
      const uiPatient = toUiPatient(updated);
      setRows((current) => current.map((patient) => (patient.id === selectedPatient.id ? uiPatient : patient)));
      setSelectedPatient(uiPatient);
      setIsEditOpen(false);
      toast.success("Patient mis à jour avec succès.");
    } catch {
      toast.error("Impossible de mettre à jour le patient.");
    } finally {
      setIsSaving(false);
    }
  };

  const deletePatient = async (patient: PatientRecord) => {
    const confirmed = window.confirm("Êtes-vous sûr de vouloir supprimer ce patient ? Cette action est irréversible.");
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      if (demoMode) {
        setRows((current) => current.filter((row) => row.id !== patient.id));
        if (selectedPatient?.id === patient.id) {
          setSelectedPatient(null);
          setIsViewOpen(false);
          setIsEditOpen(false);
        }
        toast.success("Patient supprimé avec succès.");
        return;
      }
      await patientsApi.remove(patient.id);
      setRows((current) => current.filter((row) => row.id !== patient.id));
      if (selectedPatient?.id === patient.id) {
        setSelectedPatient(null);
        setIsViewOpen(false);
        setIsEditOpen(false);
      }
      toast.success("Patient supprimé avec succès.");
    } catch {
      toast.error("Impossible de supprimer le patient.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        description={`${rows.length} patients enregistres dans le cabinet`}
        actions={
          <ActionDialog
            title="Ajouter un patient"
            description="Le patient sera ajoute a la liste du cabinet."
            open={isAddOpen}
            onOpenChange={setIsAddOpen}
            onSubmit={addPatient}
            submitLabel="Ajouter"
            disabled={isSaving || !newPatient.name.trim()}
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
                <Label htmlFor="patient-age">Age</Label>
                <Input id="patient-age" type="number" min="0" max="130" value={newPatient.age} onChange={(e) => setNewPatient((p) => ({ ...p, age: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Genre</Label>
                <Select value={newPatient.gender || "none"} onValueChange={(gender) => setNewPatient((p) => ({ ...p, gender: gender === "none" ? "" : gender }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Non renseigne</SelectItem>
                    <SelectItem value="F">F</SelectItem>
                    <SelectItem value="M">M</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="patient-address">Adresse</Label>
              <Input id="patient-address" value={newPatient.address} onChange={(e) => setNewPatient((p) => ({ ...p, address: e.target.value }))} />
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
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      Chargement des patients...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      Aucun patient trouve.
                    </TableCell>
                  </TableRow>
                ) : filtered.map((p) => (
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" aria-label="Actions patient">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openViewPatient(p)}>
                            <Eye className="size-4" /> Voir
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditPatient(p)}>
                            <Pencil className="size-4" /> Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => sendMessage(p.id)}>
                            <MessageCircle className="size-4" /> WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.info("Création de rendez-vous bientôt connectée.")}>
                            <CalendarPlus className="size-4" /> Nouveau rendez-vous
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => deletePatient(p)}
                            disabled={isDeleting}
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

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-h-[85vh] w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border bg-background p-0 shadow-xl sm:max-w-3xl">
          {selectedPatient && (
            <div className="flex max-h-[85vh] flex-col">
              <DialogHeader className="border-b px-5 py-4 text-left sm:px-6">
                <div className="flex items-start gap-3 pr-8">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {getPatientInitials(selectedPatient.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <DialogTitle className="truncate text-xl leading-tight">{selectedPatient.name}</DialogTitle>
                      <StatusBadge tone={patientTone(selectedPatient.status)}>{patientLabel(selectedPatient.status)}</StatusBadge>
                    </div>
                    <DialogDescription className="mt-1">
                      {selectedPatient.phone || "Non renseigné"}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                <div className="grid gap-4 lg:grid-cols-2">
                  <section className="rounded-lg border bg-card p-4">
                    <h3 className="text-sm font-semibold">Informations personnelles</h3>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <PatientDetail label="Nom complet" value={displayValue(selectedPatient.name)} />
                      <PatientDetail label="Âge" value={selectedPatient.age == null ? "Non renseigné" : String(selectedPatient.age)} />
                      <PatientDetail label="Genre" value={displayValue(selectedPatient.gender)} />
                      <PatientDetail label="Téléphone" value={displayValue(selectedPatient.phone)} />
                      <PatientDetail label="Email" value={displayValue(selectedPatient.email)} />
                      <PatientDetail label="Adresse" value={displayValue(selectedPatient.address)} className="sm:col-span-2" />
                    </div>
                  </section>

                  <section className="rounded-lg border bg-card p-4">
                    <h3 className="text-sm font-semibold">Informations cabinet</h3>
                    <div className="mt-4 grid gap-3">
                      <PatientDetail label="Statut" value={patientLabel(selectedPatient.status)} />
                      <PatientDetail label="Date de création" value={selectedPatient.created_at ? formatDate(selectedPatient.created_at) : "Non renseigné"} />
                      <PatientDetail label="Dernière mise à jour" value={selectedPatient.updated_at ? formatDate(selectedPatient.updated_at) : "Non renseigné"} />
                    </div>
                  </section>
                </div>

                <section className="mt-4 rounded-lg border bg-card p-4">
                  <h3 className="text-sm font-semibold">Notes</h3>
                  <div className="mt-3 rounded-md border bg-muted/30 p-3 text-sm leading-6 text-muted-foreground">
                    {selectedPatient.notes?.trim() || "Aucune note pour ce patient."}
                  </div>
                </section>
              </div>

              <DialogFooter className="border-t px-5 py-4 sm:px-6">
                <Button variant="outline" onClick={() => {
                  setIsViewOpen(false);
                  openEditPatient(selectedPatient);
                }}>Modifier</Button>
                <Button variant="outline" onClick={() => sendMessage(selectedPatient.id)}>
                  <MessageCircle className="size-4" /> WhatsApp
                </Button>
                <Button variant="outline" onClick={() => toast.info("Création de rendez-vous bientôt connectée.")}>
                  <CalendarPlus className="size-4" /> Nouveau rendez-vous
                </Button>
                <Button onClick={() => setIsViewOpen(false)}>Fermer</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier le patient</DialogTitle>
            <DialogDescription>Mettez à jour les informations du patient.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-patient-name">Nom</Label>
              <Input id="edit-patient-name" value={editPatient.name} onChange={(e) => setEditPatient((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-patient-phone">Telephone</Label>
              <Input id="edit-patient-phone" value={editPatient.phone} onChange={(e) => setEditPatient((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-patient-email">Email</Label>
              <Input id="edit-patient-email" type="email" value={editPatient.email} onChange={(e) => setEditPatient((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="edit-patient-age">Age</Label>
                <Input id="edit-patient-age" type="number" min="0" max="130" value={editPatient.age} onChange={(e) => setEditPatient((p) => ({ ...p, age: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Genre</Label>
                <Select value={editPatient.gender || "none"} onValueChange={(gender) => setEditPatient((p) => ({ ...p, gender: gender === "none" ? "" : gender }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Non renseigne</SelectItem>
                    <SelectItem value="F">F</SelectItem>
                    <SelectItem value="M">M</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-patient-address">Adresse</Label>
              <Input id="edit-patient-address" value={editPatient.address} onChange={(e) => setEditPatient((p) => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Statut</Label>
              <Select value={editPatient.status} onValueChange={(status) => setEditPatient((p) => ({ ...p, status: status as Patient["status"] }))}>
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
              <Label htmlFor="edit-patient-notes">Notes patient</Label>
              <Textarea id="edit-patient-notes" rows={3} value={editPatient.notes} onChange={(e) => setEditPatient((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Annuler</Button>
            <Button onClick={updatePatient} disabled={isSaving || !editPatient.name.trim()}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PatientDetail({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`grid gap-1 rounded-md border bg-background p-3 ${className}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function displayValue(value?: string | null) {
  return value?.trim() || "Non renseigné";
}

function getPatientInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "P";
}
