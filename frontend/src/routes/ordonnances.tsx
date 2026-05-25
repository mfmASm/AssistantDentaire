import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ClipboardList,
  Copy,
  Download,
  FilePlus2,
  Library,
  MessageCircle,
  Pencil,
  Plus,
  Printer,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader, StatCard } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { currentMonthPrefix, relativeISO, todayISO } from "@/lib/date-utils";
import { fillWhatsAppTemplate, openWhatsAppMessage, whatsappTemplates } from "@/lib/whatsapp";

export const Route = createFileRoute("/ordonnances")({
  head: () => ({
    meta: [
      { title: "Ordonnances - DentalPilot" },
      { name: "description", content: "Création, gestion, impression et envoi des ordonnances du cabinet." },
    ],
  }),
  component: OrdonnancesPage,
});

type PrescriptionStatus = "Brouillon" | "Finalisée" | "Envoyée" | "Imprimée";
type MedicationCategory =
  | "Antibiotique"
  | "Antalgique"
  | "Anti-inflammatoire"
  | "Bain de bouche"
  | "Antiseptique"
  | "Prescription enfant"
  | "Autre";

type MedicationLine = {
  id: string;
  medicament: string;
  dosage: string;
  frequence: string;
  duree: string;
  instructions: string;
};

type Ordonnance = {
  id: string;
  reference: string;
  date: string;
  patient: string;
  age: string;
  telephone: string;
  medecin: string;
  motif: string;
  diagnostic: string;
  medicaments: MedicationLine[];
  statut: PrescriptionStatus;
};

type FavoriteMedication = {
  id: string;
  nom: string;
  categorie: MedicationCategory;
  dosage: string;
  frequence: string;
  duree: string;
  instructions: string;
  notes: string;
};

type Template = {
  id: string;
  nom: string;
  description: string;
  motif: string;
  medicaments: Omit<MedicationLine, "id">[];
};

const doctors = ["Dr. Safaa M'gaassy"];
const categories: MedicationCategory[] = [
  "Antibiotique",
  "Antalgique",
  "Anti-inflammatoire",
  "Bain de bouche",
  "Antiseptique",
  "Prescription enfant",
  "Autre",
];

const emptyMedication = (): MedicationLine => ({
  id: `med-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  medicament: "",
  dosage: "",
  frequence: "",
  duree: "",
  instructions: "",
});

const initialRows: Ordonnance[] = [
  {
    id: "ord-001",
    reference: `ORD-${new Date().getFullYear()}-001`,
    date: todayISO(),
    patient: "Yasmine El Amrani",
    age: "34",
    telephone: "+212 6 12 45 78 90",
    motif: "Douleur post-couronne",
    diagnostic: "Sensibilité post-prothétique à surveiller.",
    medicaments: [
      {
        id: "m1",
        medicament: "Paracétamol",
        dosage: "1 g",
        frequence: "Toutes les 8 h si douleur",
        duree: "3 jours",
        instructions: "Respecter la dose maximale quotidienne.",
      },
    ],
    statut: "Finalisée",
    medecin: "Dr. Safaa M'gaassy",
  },
  {
    id: "ord-002",
    reference: `ORD-${new Date().getFullYear()}-002`,
    date: relativeISO(-1),
    patient: "Karim Bennani",
    age: "48",
    telephone: "+212 6 22 34 56 78",
    motif: "Suivi implant secteur 2",
    diagnostic: "Contrôle post-opératoire sans complication visible.",
    medicaments: [
      {
        id: "m2",
        medicament: "Bain de bouche",
        dosage: "15 ml",
        frequence: "2 fois par jour",
        duree: "7 jours",
        instructions: "Ne pas avaler. Utiliser après le brossage.",
      },
    ],
    statut: "Envoyée",
    medecin: "Dr. Safaa M'gaassy",
  },
  {
    id: "ord-003",
    reference: `ORD-${new Date().getFullYear()}-003`,
    date: relativeISO(-2),
    patient: "Nadia Chraibi",
    age: "41",
    telephone: "+212 6 45 67 89 10",
    motif: "Traitement de canal",
    diagnostic: "Ordonnance à valider après contrôle clinique.",
    medicaments: [
      {
        id: "m3",
        medicament: "Ibuprofène",
        dosage: "400 mg",
        frequence: "2 fois par jour",
        duree: "2 jours",
        instructions: "À prendre au cours du repas si validé par le médecin.",
      },
    ],
    statut: "Brouillon",
    medecin: "Dr. Safaa M'gaassy",
  },
  {
    id: "ord-004",
    reference: `ORD-${new Date().getFullYear()}-004`,
    date: relativeISO(-3),
    patient: "Omar Benjelloun",
    age: "55",
    telephone: "+212 6 78 90 12 34",
    motif: "Contrôle post-extraction",
    diagnostic: "Cicatrisation favorable.",
    medicaments: [
      {
        id: "m4",
        medicament: "Antiseptique local",
        dosage: "Selon notice",
        frequence: "2 fois par jour",
        duree: "5 jours",
        instructions: "Appliquer localement selon les indications du médecin.",
      },
    ],
    statut: "Imprimée",
    medecin: "Dr. Safaa M'gaassy",
  },
  {
    id: "ord-005",
    reference: `ORD-${new Date().getFullYear()}-005`,
    date: relativeISO(-4),
    patient: "Mehdi Lahlou",
    age: "9",
    telephone: "+212 6 91 23 45 67",
    motif: "Consultation enfant",
    diagnostic: "Douleur légère, prescription enfant à confirmer.",
    medicaments: [
      {
        id: "m5",
        medicament: "Paracétamol enfant",
        dosage: "Selon poids",
        frequence: "Si douleur",
        duree: "2 jours",
        instructions: "Posologie à vérifier et valider par le médecin.",
      },
    ],
    statut: "Brouillon",
    medecin: "Dr. Safaa M'gaassy",
  },
  {
    id: "ord-006",
    reference: `ORD-${new Date().getFullYear()}-006`,
    date: relativeISO(-5),
    patient: "Salma Tazi",
    age: "29",
    telephone: "+212 6 10 20 30 40",
    motif: "Détartrage et contrôle",
    diagnostic: "Inflammation gingivale légère.",
    medicaments: [
      {
        id: "m6",
        medicament: "Bain de bouche",
        dosage: "15 ml",
        frequence: "2 fois par jour",
        duree: "5 jours",
        instructions: "À utiliser après le brossage.",
      },
    ],
    statut: "Envoyée",
    medecin: "Dr. Safaa M'gaassy",
  },
];

const initialFavorites: FavoriteMedication[] = [
  {
    id: "fav-1",
    nom: "Amoxicilline",
    categorie: "Antibiotique",
    dosage: "1 g",
    frequence: "2 fois par jour",
    duree: "6 jours",
    instructions: "À prendre selon validation médicale.",
    notes: "Vérifier allergies et contre-indications.",
  },
  {
    id: "fav-2",
    nom: "Paracétamol",
    categorie: "Antalgique",
    dosage: "1 g",
    frequence: "Toutes les 8 h si douleur",
    duree: "3 jours",
    instructions: "Respecter la dose maximale quotidienne.",
    notes: "Adapter selon âge, poids et antécédents.",
  },
  {
    id: "fav-3",
    nom: "Ibuprofène",
    categorie: "Anti-inflammatoire",
    dosage: "400 mg",
    frequence: "2 fois par jour",
    duree: "2 jours",
    instructions: "À prendre au cours du repas si validé par le médecin.",
    notes: "Vérifier contre-indications.",
  },
  {
    id: "fav-4",
    nom: "Bain de bouche",
    categorie: "Bain de bouche",
    dosage: "15 ml",
    frequence: "2 fois par jour",
    duree: "7 jours",
    instructions: "Ne pas avaler. Utiliser après le brossage.",
    notes: "Usage court selon indication clinique.",
  },
  {
    id: "fav-5",
    nom: "Antibiotique",
    categorie: "Antibiotique",
    dosage: "À préciser",
    frequence: "À préciser",
    duree: "À préciser",
    instructions: "Préréglage personnalisable à compléter par le médecin.",
    notes: "Modèle générique.",
  },
  {
    id: "fav-6",
    nom: "Anti-inflammatoire",
    categorie: "Anti-inflammatoire",
    dosage: "À préciser",
    frequence: "À préciser",
    duree: "À préciser",
    instructions: "Préréglage personnalisable à compléter par le médecin.",
    notes: "Modèle générique.",
  },
  {
    id: "fav-7",
    nom: "Antalgique",
    categorie: "Antalgique",
    dosage: "À préciser",
    frequence: "À préciser",
    duree: "À préciser",
    instructions: "Préréglage personnalisable à compléter par le médecin.",
    notes: "Modèle générique.",
  },
];

const templates: Template[] = [
  {
    id: "tpl-1",
    nom: "Post-extraction",
    description: "Suite d'extraction avec consignes post-opératoires éditables.",
    motif: "Contrôle post-extraction",
    medicaments: [
      {
        medicament: "Antalgique",
        dosage: "À préciser",
        frequence: "Si douleur",
        duree: "3 jours",
        instructions: "Compléter selon le profil du patient.",
      },
      {
        medicament: "Bain de bouche",
        dosage: "15 ml",
        frequence: "2 fois par jour",
        duree: "5 jours",
        instructions: "Débuter selon indication du médecin.",
      },
    ],
  },
  {
    id: "tpl-2",
    nom: "Douleur dentaire",
    description: "Ordonnance de confort à adapter après diagnostic.",
    motif: "Douleur dentaire",
    medicaments: [
      {
        medicament: "Antalgique",
        dosage: "À préciser",
        frequence: "Si douleur",
        duree: "À préciser",
        instructions: "Vérifier le dossier médical avant validation.",
      },
    ],
  },
  {
    id: "tpl-3",
    nom: "Infection / abcès",
    description: "Champs de prise en charge infectieuse à valider.",
    motif: "Infection / abcès",
    medicaments: [
      {
        medicament: "Antibiotique",
        dosage: "À préciser",
        frequence: "À préciser",
        duree: "À préciser",
        instructions: "Vérifier allergies, antécédents et indication.",
      },
    ],
  },
  {
    id: "tpl-4",
    nom: "Après traitement de canal",
    description: "Suivi endodontique avec consignes de douleur.",
    motif: "Après traitement de canal",
    medicaments: [
      {
        medicament: "Antalgique",
        dosage: "À préciser",
        frequence: "Si douleur",
        duree: "2 à 3 jours",
        instructions: "Adapter selon douleur et dossier patient.",
      },
    ],
  },
  {
    id: "tpl-5",
    nom: "Après pose implant",
    description: "Suite chirurgicale après implant, entièrement modifiable.",
    motif: "Après pose implant",
    medicaments: [
      {
        medicament: "Bain de bouche",
        dosage: "15 ml",
        frequence: "2 fois par jour",
        duree: "7 jours",
        instructions: "Utiliser selon consigne post-opératoire.",
      },
    ],
  },
  {
    id: "tpl-6",
    nom: "Bain de bouche",
    description: "Prescription courte d'hygiène buccale.",
    motif: "Bain de bouche",
    medicaments: [
      {
        medicament: "Bain de bouche",
        dosage: "15 ml",
        frequence: "2 fois par jour",
        duree: "7 jours",
        instructions: "Ne pas avaler.",
      },
    ],
  },
  {
    id: "tpl-7",
    nom: "Contrôle orthodontique",
    description: "Confort après contrôle orthodontique.",
    motif: "Contrôle orthodontique",
    medicaments: [
      {
        medicament: "Antalgique",
        dosage: "À préciser",
        frequence: "Si douleur",
        duree: "2 jours",
        instructions: "Adapter selon âge et dossier médical.",
      },
    ],
  },
  {
    id: "tpl-8",
    nom: "Prescription enfant",
    description: "Base enfant avec champs de posologie à compléter.",
    motif: "Prescription enfant",
    medicaments: [
      {
        medicament: "Antalgique enfant",
        dosage: "Selon poids",
        frequence: "À préciser",
        duree: "À préciser",
        instructions: "La posologie finale doit être vérifiée par le médecin.",
      },
    ],
  },
];

const blankFavorite: FavoriteMedication = {
  id: "",
  nom: "",
  categorie: "Autre",
  dosage: "",
  frequence: "",
  duree: "",
  instructions: "",
  notes: "",
};

const blankOrdonnance = (): Ordonnance => ({
  id: "",
  reference: "",
  date: todayISO(),
  patient: "",
  age: "",
  telephone: "",
  medecin: "Dr. Safaa M'gaassy",
  motif: "",
  diagnostic: "",
  medicaments: [emptyMedication()],
  statut: "Brouillon",
});

const statusTone = (status: PrescriptionStatus) => {
  if (status === "Finalisée") return "success";
  if (status === "Envoyée") return "info";
  if (status === "Imprimée") return "neutral";
  return "warning";
};

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));

const medicationSummary = (medications: MedicationLine[]) =>
  medications.map((medication) => medication.medicament || "Médicament à compléter").join(", ");

function OrdonnancesPage() {
  const [rows, setRows] = useState<Ordonnance[]>(initialRows);
  const [favorites, setFavorites] = useState<FavoriteMedication[]>(initialFavorites);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [preview, setPreview] = useState<Ordonnance | null>(null);
  const [form, setForm] = useState<Ordonnance>(blankOrdonnance());
  const [favoriteQuery, setFavoriteQuery] = useState("");
  const [favoriteDraft, setFavoriteDraft] = useState<FavoriteMedication>(blankFavorite);
  const [editingFavoriteId, setEditingFavoriteId] = useState<string | null>(null);
  const [selectedMedicationLine, setSelectedMedicationLine] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const haystack = `${row.patient} ${row.motif} ${row.medecin} ${medicationSummary(row.medicaments)}`.toLowerCase();
        if (query && !haystack.includes(query.toLowerCase())) return false;
        if (statusFilter !== "all" && row.statut !== statusFilter) return false;
        if (doctorFilter !== "all" && row.medecin !== doctorFilter) return false;
        if (dateFilter === "today" && row.date !== todayISO()) return false;
        if (dateFilter === "week" && new Date(row.date) < new Date(relativeISO(-6))) return false;
        if (dateFilter === "month" && !row.date.startsWith(currentMonthPrefix())) return false;
        return true;
      }),
    [dateFilter, doctorFilter, query, rows, statusFilter],
  );

  const favoriteMatches = favorites.filter((favorite) => {
    const haystack = `${favorite.nom} ${favorite.categorie} ${favorite.dosage} ${favorite.notes}`.toLowerCase();
    return !favoriteQuery || haystack.includes(favoriteQuery.toLowerCase());
  });

  const openNew = (seed?: Partial<Ordonnance>) => {
    setForm({
      ...blankOrdonnance(),
      ...seed,
      id: "",
      reference: "",
      medicaments: seed?.medicaments?.length ? seed.medicaments : [emptyMedication()],
      statut: "Brouillon",
    });
    setFormOpen(true);
  };

  const saveOrdonnance = (statut: PrescriptionStatus) => {
    const id = form.id || `ord-${Date.now()}`;
    const reference = form.reference || `ORD-${new Date().getFullYear()}-${String(rows.length + 1).padStart(3, "0")}`;
    const ordonnance = { ...form, id, reference, statut };
    setRows((current) => (form.id ? current.map((row) => (row.id === form.id ? ordonnance : row)) : [ordonnance, ...current]));
    setForm(ordonnance);
    setFormOpen(false);
    toast.success(statut === "Brouillon" ? "Ordonnance enregistrée en brouillon." : "Ordonnance finalisée.");
  };

  const duplicateOrdonnance = (ordonnance: Ordonnance) => {
    const copy = {
      ...ordonnance,
      id: `ord-${Date.now()}`,
      reference: `ORD-${new Date().getFullYear()}-${String(rows.length + 1).padStart(3, "0")}`,
      date: todayISO(),
      statut: "Brouillon" as PrescriptionStatus,
      medicaments: ordonnance.medicaments.map((medication) => ({ ...medication, id: `med-${Date.now()}-${medication.id}` })),
    };
    setRows((current) => [copy, ...current]);
    toast.success("Ordonnance dupliquée.");
  };

  const sendWhatsApp = (ordonnance: Ordonnance) => {
    const id = ordonnance.id || `ord-${Date.now()}`;
    const reference = ordonnance.reference || `ORD-${new Date().getFullYear()}-${String(rows.length + 1).padStart(3, "0")}`;
    toast.info("WhatsApp Web va s’ouvrir avec le message pré-rempli. Pour envoyer un document, téléchargez le PDF puis joignez-le manuellement dans WhatsApp.");
    toast.info("Veuillez joindre le PDF téléchargé dans WhatsApp avant l’envoi.");
    const message = fillWhatsAppTemplate(whatsappTemplates.prescription, { Patient: ordonnance.patient });
    if (!openWhatsAppMessage(ordonnance.telephone, message)) return;
    const sentOrdonnance = { ...ordonnance, id, reference, statut: "Envoyée" as PrescriptionStatus };
    setRows((current) =>
      current.some((row) => row.id === id)
        ? current.map((row) => (row.id === id ? sentOrdonnance : row))
        : [sentOrdonnance, ...current],
    );
    if (form.id === ordonnance.id || !ordonnance.id) setForm(sentOrdonnance);
    toast.success("Ordonnance envoyée par WhatsApp avec succès.");
  };

  const addMedicationLine = () => setForm((current) => ({ ...current, medicaments: [...current.medicaments, emptyMedication()] }));

  const updateMedicationLine = (id: string, patch: Partial<MedicationLine>) => {
    setForm((current) => ({
      ...current,
      medicaments: current.medicaments.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    }));
  };

  const removeMedicationLine = (id: string) => {
    setForm((current) => ({
      ...current,
      medicaments: current.medicaments.length === 1 ? current.medicaments : current.medicaments.filter((line) => line.id !== id),
    }));
  };

  const chooseFavoriteForLine = (favorite: FavoriteMedication) => {
    const targetId = selectedMedicationLine || form.medicaments[0]?.id;
    if (!targetId) return;
    updateMedicationLine(targetId, {
      medicament: favorite.nom,
      dosage: favorite.dosage,
      frequence: favorite.frequence,
      duree: favorite.duree,
      instructions: favorite.instructions,
    });
    setSelectedMedicationLine(null);
    setFavoritesOpen(false);
    toast.success("Médicament favori inséré.");
  };

  const saveFavorite = () => {
    if (!favoriteDraft.nom.trim()) return;
    if (editingFavoriteId) {
      setFavorites((current) => current.map((favorite) => (favorite.id === editingFavoriteId ? { ...favoriteDraft, id: editingFavoriteId } : favorite)));
      toast.success("Médicament favori modifié.");
    } else {
      setFavorites((current) => [{ ...favoriteDraft, id: `fav-${Date.now()}` }, ...current]);
      toast.success("Médicament favori ajouté.");
    }
    setFavoriteDraft(blankFavorite);
    setEditingFavoriteId(null);
  };

  const editFavorite = (favorite: FavoriteMedication) => {
    setFavoriteDraft(favorite);
    setEditingFavoriteId(favorite.id);
  };

  const deleteFavorite = (id: string) => {
    setFavorites((current) => current.filter((favorite) => favorite.id !== id));
    if (editingFavoriteId === id) {
      setFavoriteDraft(blankFavorite);
      setEditingFavoriteId(null);
    }
    toast.success("Médicament favori supprimé.");
  };

  const useTemplate = (template: Template) => {
    setTemplatesOpen(false);
    openNew({
      motif: template.motif,
      diagnostic: "Modèle chargé. À modifier et valider par le médecin avant envoi.",
      medicaments: template.medicaments.map((medication) => ({ ...medication, id: `med-${Date.now()}-${Math.random()}` })),
    });
  };

  const printOrdonnance = (ordonnance: Ordonnance) => {
    const popup = window.open("", "_blank", "width=860,height=1100");
    if (!popup) {
      toast.error("Impossible d'ouvrir la fenêtre d'impression.");
      return;
    }
    popup.document.write(renderPrintableOrdonnance(ordonnance));
    popup.document.close();
    popup.focus();
    popup.print();
    setRows((current) => current.map((row) => (row.id === ordonnance.id ? { ...row, statut: "Imprimée" } : row)));
  };

  const downloadOrdonnance = (ordonnance: Ordonnance) => {
    const blob = createPdfBlob(ordonnance);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${ordonnance.reference || "ordonnance"}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("PDF téléchargé.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ordonnances"
        description="Créez, gérez et envoyez les ordonnances de vos patients depuis DentalPilot."
        actions={
          <>
            <Button size="sm" onClick={() => openNew()}>
              <FilePlus2 className="size-4" /> Nouvelle ordonnance
            </Button>
            <Button size="sm" variant="outline" onClick={() => setTemplatesOpen(true)}>
              <Library className="size-4" /> Modèles
            </Button>
            <Button size="sm" variant="outline" onClick={() => setFavoritesOpen(true)}>
              <Star className="size-4" /> Médicaments favoris
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Ordonnances aujourd'hui" value="7" icon={<ClipboardList className="size-5" />} accent="primary" />
        <StatCard label="Envoyées par WhatsApp" value="18" icon={<MessageCircle className="size-5" />} accent="info" />
        <StatCard label="Brouillons" value={String(rows.filter((row) => row.statut === "Brouillon").length)} icon={<Pencil className="size-5" />} accent="warning" />
        <StatCard label="Ordonnances ce mois" value="64" icon={<FilePlus2 className="size-5" />} accent="success" />
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_12rem_12rem_14rem]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher patient, médicament, motif..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="Brouillon">Brouillon</SelectItem>
                <SelectItem value="Finalisée">Finalisée</SelectItem>
                <SelectItem value="Envoyée">Envoyée</SelectItem>
                <SelectItem value="Imprimée">Imprimée</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger><SelectValue placeholder="Date" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les dates</SelectItem>
                <SelectItem value="today">Aujourd'hui</SelectItem>
                <SelectItem value="week">Cette semaine</SelectItem>
                <SelectItem value="month">Ce mois</SelectItem>
              </SelectContent>
            </Select>
            <Select value={doctorFilter} onValueChange={setDoctorFilter}>
              <SelectTrigger><SelectValue placeholder="Médecin" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les médecins</SelectItem>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor} value={doctor}>{doctor}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead>Médicaments</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Médecin</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((ordonnance) => (
                  <TableRow key={ordonnance.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(ordonnance.date)}</TableCell>
                    <TableCell className="font-medium">{ordonnance.patient}</TableCell>
                    <TableCell className="min-w-48 text-muted-foreground">{ordonnance.motif}</TableCell>
                    <TableCell className="min-w-56 text-sm text-muted-foreground">{medicationSummary(ordonnance.medicaments)}</TableCell>
                    <TableCell><StatusBadge tone={statusTone(ordonnance.statut)}>{ordonnance.statut}</StatusBadge></TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{ordonnance.medecin}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setPreview(ordonnance)}>Voir</Button>
                        <Button variant="ghost" size="sm" onClick={() => duplicateOrdonnance(ordonnance)}><Copy className="size-4" /> Dupliquer</Button>
                        <Button variant="ghost" size="sm" onClick={() => printOrdonnance(ordonnance)}><Printer className="size-4" /> Imprimer</Button>
                        <Button variant="ghost" size="sm" onClick={() => sendWhatsApp(ordonnance)}><MessageCircle className="size-4" /> Envoyer WhatsApp</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <OrdonnanceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        form={form}
        setForm={setForm}
        addMedicationLine={addMedicationLine}
        updateMedicationLine={updateMedicationLine}
        removeMedicationLine={removeMedicationLine}
        openFavoritesForLine={(lineId) => {
          setSelectedMedicationLine(lineId);
          setFavoritesOpen(true);
        }}
        saveDraft={() => saveOrdonnance("Brouillon")}
        finalize={() => saveOrdonnance("Finalisée")}
        download={() => downloadOrdonnance({ ...form, reference: form.reference || `ORD-${new Date().getFullYear()}-DEMO` })}
        print={() => printOrdonnance({ ...form, reference: form.reference || `ORD-${new Date().getFullYear()}-DEMO` })}
        sendWhatsApp={() => sendWhatsApp(form)}
      />

      <FavoritesDialog
        open={favoritesOpen}
        onOpenChange={(open) => {
          setFavoritesOpen(open);
          if (!open) setSelectedMedicationLine(null);
        }}
        favorites={favoriteMatches}
        query={favoriteQuery}
        setQuery={setFavoriteQuery}
        draft={favoriteDraft}
        setDraft={setFavoriteDraft}
        editingId={editingFavoriteId}
        saveFavorite={saveFavorite}
        editFavorite={editFavorite}
        deleteFavorite={deleteFavorite}
        chooseFavorite={selectedMedicationLine ? chooseFavoriteForLine : undefined}
        resetDraft={() => {
          setFavoriteDraft(blankFavorite);
          setEditingFavoriteId(null);
        }}
      />

      <TemplatesDialog open={templatesOpen} onOpenChange={setTemplatesOpen} useTemplate={useTemplate} />
      <PreviewDialog ordonnance={preview} onOpenChange={(open) => !open && setPreview(null)} print={printOrdonnance} download={downloadOrdonnance} />
    </div>
  );
}

function OrdonnanceFormDialog({
  open,
  onOpenChange,
  form,
  setForm,
  addMedicationLine,
  updateMedicationLine,
  removeMedicationLine,
  openFavoritesForLine,
  saveDraft,
  finalize,
  download,
  print,
  sendWhatsApp,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: Ordonnance;
  setForm: React.Dispatch<React.SetStateAction<Ordonnance>>;
  addMedicationLine: () => void;
  updateMedicationLine: (id: string, patch: Partial<MedicationLine>) => void;
  removeMedicationLine: (id: string) => void;
  openFavoritesForLine: (id: string) => void;
  saveDraft: () => void;
  finalize: () => void;
  download: () => void;
  print: () => void;
  sendWhatsApp: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Nouvelle ordonnance</DialogTitle>
          <DialogDescription>Les champs sont modifiables avant enregistrement, impression ou envoi.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="grid gap-4 rounded-2xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="grid gap-2 lg:col-span-2">
              <Label>Patient</Label>
              <Input value={form.patient} onChange={(event) => setForm((current) => ({ ...current, patient: event.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Âge</Label>
              <Input value={form.age} onChange={(event) => setForm((current) => ({ ...current, age: event.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Téléphone</Label>
              <Input value={form.telephone} onChange={(event) => setForm((current) => ({ ...current, telephone: event.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
            </div>
            <div className="grid gap-2 sm:col-span-2 lg:col-span-5">
              <Label>Médecin</Label>
              <Select value={form.medecin} onValueChange={(medecin) => setForm((current) => ({ ...current, medecin }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor} value={doctor}>{doctor}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>

          <section className="grid gap-4 rounded-2xl border bg-card p-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Motif de consultation</Label>
              <Input value={form.motif} onChange={(event) => setForm((current) => ({ ...current, motif: event.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Diagnostic / notes médicales</Label>
              <Textarea rows={3} value={form.diagnostic} onChange={(event) => setForm((current) => ({ ...current, diagnostic: event.target.value }))} />
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Détails de la prescription</h3>
                <p className="text-xs text-muted-foreground">Ajouter manuellement ou choisir depuis les favoris.</p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addMedicationLine}>
                <Plus className="size-4" /> Ajouter un médicament
              </Button>
            </div>
            <div className="space-y-3">
              {form.medicaments.map((line, index) => (
                <div key={line.id} className="grid gap-3 rounded-xl border bg-background p-3 lg:grid-cols-5">
                  <div className="grid gap-2">
                    <Label>Médicament</Label>
                    <Input value={line.medicament} onChange={(event) => updateMedicationLine(line.id, { medicament: event.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Posologie</Label>
                    <Input value={line.dosage} onChange={(event) => updateMedicationLine(line.id, { dosage: event.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Fréquence</Label>
                    <Input value={line.frequence} onChange={(event) => updateMedicationLine(line.id, { frequence: event.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Durée</Label>
                    <Input value={line.duree} onChange={(event) => updateMedicationLine(line.id, { duree: event.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Actions ligne {index + 1}</Label>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => openFavoritesForLine(line.id)}>
                        Choisir depuis les favoris
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeMedicationLine(line.id)} aria-label="Supprimer ligne">
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2 lg:col-span-5">
                    <Label>Instructions</Label>
                    <Textarea rows={2} value={line.instructions} onChange={(event) => updateMedicationLine(line.id, { instructions: event.target.value })} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={download}><Download className="size-4" /> Télécharger PDF</Button>
            <Button variant="outline" onClick={print}><Printer className="size-4" /> Imprimer</Button>
            <Button variant="outline" onClick={sendWhatsApp}><MessageCircle className="size-4" /> Envoyer WhatsApp</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={saveDraft}>Enregistrer brouillon</Button>
            <Button onClick={finalize}>Finaliser ordonnance</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FavoritesDialog({
  open,
  onOpenChange,
  favorites,
  query,
  setQuery,
  draft,
  setDraft,
  editingId,
  saveFavorite,
  editFavorite,
  deleteFavorite,
  chooseFavorite,
  resetDraft,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  favorites: FavoriteMedication[];
  query: string;
  setQuery: (query: string) => void;
  draft: FavoriteMedication;
  setDraft: React.Dispatch<React.SetStateAction<FavoriteMedication>>;
  editingId: string | null;
  saveFavorite: () => void;
  editFavorite: (favorite: FavoriteMedication) => void;
  deleteFavorite: (id: string) => void;
  chooseFavorite?: (favorite: FavoriteMedication) => void;
  resetDraft: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Médicaments favoris</DialogTitle>
          <DialogDescription>
            Les médicaments favoris sont des raccourcis personnalisables. La prescription finale doit toujours être vérifiée et validée par le médecin.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher un médicament favori..." value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {favorites.map((favorite) => (
                <Card key={favorite.id}>
                  <CardHeader className="space-y-1 p-4 pb-2">
                    <CardTitle className="text-base">{favorite.nom}</CardTitle>
                    <p className="text-xs text-muted-foreground">{favorite.categorie}</p>
                  </CardHeader>
                  <CardContent className="space-y-3 p-4 pt-0 text-sm">
                    <div className="grid gap-1 text-muted-foreground">
                      <span>{favorite.dosage} - {favorite.frequence}</span>
                      <span>{favorite.duree}</span>
                      <span>{favorite.instructions}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {chooseFavorite && <Button size="sm" onClick={() => chooseFavorite(favorite)}>Insérer</Button>}
                      <Button size="sm" variant="outline" onClick={() => editFavorite(favorite)}><Pencil className="size-4" /> Modifier</Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteFavorite(favorite.id)}><Trash2 className="size-4" /> Supprimer</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">{editingId ? "Modifier le favori" : "Ajouter un favori"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              <div className="grid gap-2">
                <Label>Nom du médicament</Label>
                <Input value={draft.nom} onChange={(event) => setDraft((current) => ({ ...current, nom: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Catégorie</Label>
                <Select value={draft.categorie} onValueChange={(categorie) => setDraft((current) => ({ ...current, categorie: categorie as MedicationCategory }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Posologie par défaut</Label>
                <Input value={draft.dosage} onChange={(event) => setDraft((current) => ({ ...current, dosage: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Fréquence par défaut</Label>
                <Input value={draft.frequence} onChange={(event) => setDraft((current) => ({ ...current, frequence: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Durée par défaut</Label>
                <Input value={draft.duree} onChange={(event) => setDraft((current) => ({ ...current, duree: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Instructions par défaut</Label>
                <Textarea rows={2} value={draft.instructions} onChange={(event) => setDraft((current) => ({ ...current, instructions: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Notes internes</Label>
                <Textarea rows={2} value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveFavorite} disabled={!draft.nom.trim()}>{editingId ? "Enregistrer" : "Ajouter"}</Button>
                <Button variant="outline" onClick={resetDraft}>Réinitialiser</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TemplatesDialog({
  open,
  onOpenChange,
  useTemplate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  useTemplate: (template: Template) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Modèles d'ordonnances</DialogTitle>
          <DialogDescription>Les modèles sont modifiables et doivent être validés par le médecin avant envoi.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base">{template.nom}</CardTitle>
                <p className="text-sm text-muted-foreground">{template.description}</p>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-0">
                <div className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                  {template.medicaments.map((medication) => (
                    <p key={`${template.id}-${medication.medicament}`}>{medication.medicament} - {medication.dosage} - {medication.duree}</p>
                  ))}
                </div>
                <Button size="sm" onClick={() => useTemplate(template)}>Utiliser ce modèle</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewDialog({
  ordonnance,
  onOpenChange,
  print,
  download,
}: {
  ordonnance: Ordonnance | null;
  onOpenChange: (open: boolean) => void;
  print: (ordonnance: Ordonnance) => void;
  download: (ordonnance: Ordonnance) => void;
}) {
  return (
    <Dialog open={Boolean(ordonnance)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Voir ordonnance</DialogTitle>
          <DialogDescription>Aperçu professionnel avant impression ou téléchargement.</DialogDescription>
        </DialogHeader>
        {ordonnance && (
          <>
            <PrescriptionPreview ordonnance={ordonnance} />
            <DialogFooter>
              <Button variant="outline" onClick={() => download(ordonnance)}><Download className="size-4" /> Télécharger PDF</Button>
              <Button onClick={() => print(ordonnance)}><Printer className="size-4" /> Imprimer</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PrescriptionPreview({ ordonnance }: { ordonnance: Ordonnance }) {
  return (
    <div className="rounded-2xl border bg-white p-6 text-foreground shadow-sm">
      <div className="flex items-start justify-between gap-6 border-b pb-5">
        <div>
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ClipboardList className="size-6" />
          </div>
          <h2 className="mt-3 font-display text-xl font-semibold">Cabinet Atlas - Casablanca</h2>
          <p className="text-sm text-muted-foreground">Dr. Safaa M'gaassy</p>
          <p className="text-sm text-muted-foreground">Chirurgienne-dentiste</p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p>Adresse du cabinet: Boulevard principal, Casablanca</p>
          <p>Téléphone: +212 5 22 00 00 00</p>
          <p className="mt-3 font-medium text-foreground">Référence: {ordonnance.reference}</p>
        </div>
      </div>

      <div className="grid gap-4 border-b py-5 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Patient</p>
          <p className="font-medium">{ordonnance.patient}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Âge</p>
          <p className="font-medium">{ordonnance.age} ans</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Date</p>
          <p className="font-medium">{formatDate(ordonnance.date)}</p>
        </div>
      </div>

      <div className="space-y-5 py-5">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Motif</p>
          <p className="mt-1">{ordonnance.motif}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Médicaments</p>
          <div className="mt-2 space-y-3">
            {ordonnance.medicaments.map((medication, index) => (
              <div key={medication.id} className="rounded-xl border p-3">
                <p className="font-medium">{index + 1}. {medication.medicament}</p>
                <p className="text-sm text-muted-foreground">{medication.dosage} - {medication.frequence} - {medication.duree}</p>
                <p className="mt-1 text-sm">{medication.instructions}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Instructions</p>
          <p className="mt-1 text-sm">{ordonnance.diagnostic || "Instructions à compléter par le médecin."}</p>
        </div>
      </div>

      <div className="grid gap-4 border-t pt-8 sm:grid-cols-2">
        <div className="h-28 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Signature du médecin</div>
        <div className="h-28 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Cachet du cabinet</div>
      </div>
      <p className="mt-6 border-t pt-4 text-center text-xs text-muted-foreground">
        Cabinet Atlas - Casablanca - Adresse du cabinet - Téléphone: +212 5 22 00 00 00
      </p>
    </div>
  );
}

function renderPlainOrdonnance(ordonnance: Ordonnance) {
  return [
    "Cabinet Atlas - Casablanca",
    "Dr. Safaa M'gaassy - Chirurgienne-dentiste",
    "Adresse du cabinet: Boulevard principal, Casablanca",
    "Téléphone: +212 5 22 00 00 00",
    "",
    `Référence: ${ordonnance.reference}`,
    `Patient: ${ordonnance.patient}`,
    `Âge: ${ordonnance.age} ans`,
    `Date: ${formatDate(ordonnance.date)}`,
    `Motif: ${ordonnance.motif}`,
    "",
    "Médicaments:",
    ...ordonnance.medicaments.map(
      (medication, index) =>
        `${index + 1}. ${medication.medicament} - ${medication.dosage} - ${medication.frequence} - ${medication.duree}\nInstructions: ${medication.instructions}`,
    ),
    "",
    `Instructions: ${ordonnance.diagnostic}`,
    "",
    "Signature du médecin:",
    "Cachet du cabinet:",
    "",
    "Cabinet Atlas - Casablanca - Adresse du cabinet - Téléphone: +212 5 22 00 00 00",
  ].join("\n");
}

function createPdfBlob(ordonnance: Ordonnance) {
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 62;
  const contentWidth = pageWidth - margin * 2;
  const teal = "0.02 0.48 0.52";
  const border = "0.82 0.88 0.89";
  const light = "0.96 0.98 0.98";
  const text = "0.12 0.16 0.20";
  const muted = "0.39 0.45 0.52";
  const footerY = 42;
  const content: string[] = [
    "0.8 w",
    `${text} rg`,
    `${border} RG`,
  ];

  const addText = (value: string, x: number, y: number, size = 10, bold = false, color = text) => {
    content.push("BT", `${color} rg`, `/${bold ? "F2" : "F1"} ${size} Tf`, `${x} ${y} Td (${escapePdfText(value)}) Tj`, "ET");
  };
  const addWrapped = (value: string, x: number, y: number, maxLength: number, size = 10, bold = false, color = text, lineGap = 14) => {
    let currentY = y;
    wrapPdfText(value || "-", maxLength).forEach((line) => {
      addText(line, x, currentY, size, bold, color);
      currentY -= lineGap;
    });
    return currentY;
  };
  const rect = (x: number, y: number, width: number, height: number, strokeColor = border, fillColor?: string) => {
    if (fillColor) content.push(`${fillColor} rg`, `${x} ${y} ${width} ${height} re f`);
    content.push(`${strokeColor} RG`, `${x} ${y} ${width} ${height} re S`);
  };
  const line = (x1: number, y1: number, x2: number, y2: number, strokeColor = border, width = 0.8) => {
    content.push(`${width} w`, `${strokeColor} RG`, `${x1} ${y1} m ${x2} ${y2} l S`);
  };

  addText("Cabinet Atlas - Casablanca", margin, 780, 20, true, teal);
  addText("Dr. Safaa M'gaassy", margin, 758, 11, true);
  addText("Chirurgienne-dentiste", margin, 742, 10, false, muted);
  addText("Adresse du cabinet: Boulevard principal, Casablanca", margin, 724, 9, false, muted);
  addText("Téléphone: +212 5 22 00 00 00", margin, 711, 9, false, muted);
  addText("ORDONNANCE", 410, 765, 18, true, teal);
  addText(`Référence: ${ordonnance.reference}`, 410, 742, 9, true);
  addText(`Date: ${formatDate(ordonnance.date)}`, 410, 728, 9, false, muted);
  rect(524, 765, 28, 28, teal);
  addText("+", 533, 773, 18, true, teal);
  line(margin, 690, pageWidth - margin, 690, teal, 1.4);

  rect(margin, 595, contentWidth, 72, border, light);
  addText("Informations patient", margin + 16, 648, 12, true, teal);
  addText("Patient", margin + 16, 626, 8, true, muted);
  addText(ordonnance.patient || "-", margin + 16, 612, 10, true);
  addText("Âge", margin + 174, 626, 8, true, muted);
  addText(`${ordonnance.age || "-"} ans`, margin + 174, 612, 10);
  addText("Téléphone", margin + 248, 626, 8, true, muted);
  addText(ordonnance.telephone || "-", margin + 248, 612, 10);
  addText("Motif", margin + 360, 626, 8, true, muted);
  addWrapped(ordonnance.motif || "-", margin + 360, 612, 25, 10, false, text, 12);

  addText("Prescription", margin, 558, 13, true, teal);
  const tableTop = 538;
  const rowHeight = 46;
  const columns = [margin, margin + 100, margin + 166, margin + 282, margin + 342, pageWidth - margin];
  rect(margin, tableTop, contentWidth, 24, border, light);
  ["Médicament", "Dosage", "Fréquence", "Durée", "Instructions"].forEach((heading, index) => {
    addText(heading, columns[index] + 7, tableTop + 8, 8, true, muted);
  });
  let rowY = tableTop - rowHeight;
  ordonnance.medicaments.slice(0, 5).forEach((medication) => {
    rect(margin, rowY, contentWidth, rowHeight, border);
    addWrapped(medication.medicament || "-", columns[0] + 7, rowY + 30, 15, 9, true, text, 11);
    addWrapped(medication.dosage || "-", columns[1] + 7, rowY + 30, 10, 9, false, text, 11);
    addWrapped(medication.frequence || "-", columns[2] + 7, rowY + 30, 18, 9, false, text, 11);
    addWrapped(medication.duree || "-", columns[3] + 7, rowY + 30, 9, 9, false, text, 11);
    addWrapped(medication.instructions || "-", columns[4] + 7, rowY + 30, 25, 9, false, text, 11);
    for (let index = 1; index < columns.length - 1; index += 1) line(columns[index], rowY, columns[index], rowY + rowHeight, border, 0.5);
    rowY -= rowHeight;
  });

  const instructionY = Math.max(rowY - 70, 258);
  addText("Instructions complémentaires", margin, instructionY + 48, 13, true, teal);
  rect(margin, instructionY, contentWidth, 38, border, light);
  addWrapped(ordonnance.diagnostic || "Instructions à compléter par le médecin.", margin + 14, instructionY + 22, 78, 10, false, text, 13);

  rect(margin, 122, 205, 76, border);
  rect(pageWidth - margin - 205, 122, 205, 76, border);
  addText("Signature du médecin", margin + 14, 178, 10, true, muted);
  addText("Cachet du cabinet", pageWidth - margin - 191, 178, 10, true, muted);

  line(margin, footerY + 20, pageWidth - margin, footerY + 20, border, 0.8);
  addText("Cabinet Atlas - Casablanca · Boulevard principal, Casablanca · Téléphone: +212 5 22 00 00 00", 112, footerY, 8, false, muted);

  const stream = content.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${pdfByteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdfByteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdfByteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdfToBytes(pdf)], { type: "application/pdf" });
}

function wrapPdfText(text: string, maxLength: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function escapePdfText(text: string) {
  return text
    .replace(/[—–]/g, "-")
    .replace(/[’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function pdfToBytes(text: string) {
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) {
    bytes[index] = text.charCodeAt(index) & 0xff;
  }
  return bytes;
}

function pdfByteLength(text: string) {
  return text.length;
}

function renderPrintableOrdonnance(ordonnance: Ordonnance) {
  const medicationHtml = ordonnance.medicaments
    .map(
      (medication, index) => `
        <tr>
          <td>${index + 1}. ${escapeHtml(medication.medicament || "-")}</td>
          <td>${escapeHtml(medication.dosage || "-")}</td>
          <td>${escapeHtml(medication.frequence || "-")}</td>
          <td>${escapeHtml(medication.duree || "-")}</td>
          <td>${escapeHtml(medication.instructions || "-")}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <!doctype html>
    <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <title>${ordonnance.reference}</title>
        <style>
          :root { --teal: #0f8f95; --ink: #1f2937; --muted: #667085; --line: #d8e5e7; --soft: #f6fafb; }
          @page { size: A4; margin: 0; }
          * { box-sizing: border-box; }
          body { margin: 0; background: #eef6f7; color: var(--ink); font-family: Inter, Arial, system-ui, sans-serif; }
          .pdf-page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 24mm 22mm;
            background: #fff;
            display: flex;
            flex-direction: column;
          }
          .header { display: grid; grid-template-columns: 1fr 58mm; gap: 18mm; padding-bottom: 9mm; border-bottom: 1.5px solid var(--teal); }
          .cabinet-name { margin: 0 0 4mm; color: var(--teal); font-size: 23px; line-height: 1.15; font-weight: 750; }
          .doctor { margin: 0 0 1mm; font-size: 12px; font-weight: 700; }
          .muted, .meta, .footer { color: var(--muted); }
          .muted { margin: 0; font-size: 10px; line-height: 1.5; }
          .doc-meta { text-align: right; }
          .logo { display: inline-flex; align-items: center; justify-content: center; width: 13mm; height: 13mm; margin-bottom: 4mm; border: 1px solid var(--line); border-radius: 4mm; color: var(--teal); font-size: 18px; font-weight: 700; }
          .doc-title { margin: 0 0 3mm; color: var(--teal); font-size: 18px; font-weight: 800; letter-spacing: .08em; }
          .meta { margin: 1mm 0; font-size: 10px; line-height: 1.45; }
          .section { margin-top: 9mm; }
          .section-title { margin: 0 0 3mm; color: var(--teal); font-size: 14px; font-weight: 800; }
          .patient-card { border: 1px solid var(--line); border-radius: 4mm; background: var(--soft); padding: 5mm; }
          .patient-grid { display: grid; grid-template-columns: 1.15fr .45fr .8fr 1.25fr; gap: 5mm; }
          .label { margin: 0 0 1.5mm; color: var(--muted); font-size: 8px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
          .value { margin: 0; font-size: 11px; line-height: 1.45; font-weight: 650; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1px solid var(--line); border-radius: 3mm; overflow: hidden; }
          th { background: var(--soft); color: var(--muted); font-size: 8.5px; letter-spacing: .06em; text-align: left; text-transform: uppercase; }
          th, td { border-bottom: 1px solid var(--line); border-right: 1px solid var(--line); padding: 3.2mm; vertical-align: top; }
          td { font-size: 10px; line-height: 1.45; }
          th:last-child, td:last-child { border-right: 0; }
          tr:last-child td { border-bottom: 0; }
          .med-name { width: 21%; }
          .med-dose { width: 14%; }
          .med-frequency { width: 24%; }
          .med-duration { width: 12%; }
          .instructions { width: 29%; }
          .note-box { min-height: 20mm; border: 1px solid var(--line); border-radius: 4mm; background: var(--soft); padding: 5mm; font-size: 11px; line-height: 1.65; }
          .spacer { flex: 1; min-height: 10mm; }
          .signature { display: grid; grid-template-columns: 1fr 1fr; gap: 12mm; margin-top: 10mm; }
          .signature-box { height: 31mm; border: 1px dashed #a9bec2; border-radius: 4mm; padding: 4mm; color: var(--muted); font-size: 10px; font-weight: 700; }
          .footer { margin-top: 10mm; padding-top: 4mm; border-top: 1px solid var(--line); text-align: center; font-size: 9px; line-height: 1.4; }
          .no-print { display: none; }
          @media print {
            body { background: white; }
            .pdf-page {
              width: 210mm;
              min-height: 297mm;
              margin: 0;
              padding: 24mm 22mm;
              box-shadow: none;
              page-break-after: always;
            }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <main class="pdf-page">
          <section class="header">
            <div>
              <h1 class="cabinet-name">Cabinet Atlas — Casablanca</h1>
              <p class="doctor">Dr. Safaa M'gaassy</p>
              <p class="muted">Chirurgienne-dentiste</p>
              <p class="muted">Adresse du cabinet: Boulevard principal, Casablanca</p>
              <p class="muted">Téléphone: +212 5 22 00 00 00</p>
            </div>
            <div class="doc-meta">
              <div class="logo">+</div>
              <p class="doc-title">ORDONNANCE</p>
              <p class="meta"><strong>Référence:</strong> ${escapeHtml(ordonnance.reference)}</p>
              <p class="meta"><strong>Date:</strong> ${formatDate(ordonnance.date)}</p>
            </div>
          </section>

          <section class="section patient-card">
            <h2 class="section-title">Informations patient</h2>
            <div class="patient-grid">
              <div><p class="label">Patient</p><p class="value">${escapeHtml(ordonnance.patient || "-")}</p></div>
              <div><p class="label">Âge</p><p class="value">${escapeHtml(ordonnance.age || "-")} ans</p></div>
              <div><p class="label">Téléphone</p><p class="value">${escapeHtml(ordonnance.telephone || "-")}</p></div>
              <div><p class="label">Motif</p><p class="value">${escapeHtml(ordonnance.motif || "-")}</p></div>
            </div>
          </section>

          <section class="section">
            <h2 class="section-title">Prescription</h2>
            <table>
              <thead>
                <tr>
                  <th class="med-name">Médicament</th>
                  <th class="med-dose">Dosage</th>
                  <th class="med-frequency">Fréquence</th>
                  <th class="med-duration">Durée</th>
                  <th class="instructions">Instructions</th>
                </tr>
              </thead>
              <tbody>${medicationHtml}</tbody>
            </table>
          </section>

          <section class="section">
            <h2 class="section-title">Instructions complémentaires</h2>
            <div class="note-box">${escapeHtml(ordonnance.diagnostic || "Instructions à compléter par le médecin.")}</div>
          </section>

          <div class="spacer"></div>
          <section class="signature">
            <div class="signature-box">Signature du médecin</div>
            <div class="signature-box">Cachet du cabinet</div>
          </section>
          <footer class="footer">Cabinet Atlas — Casablanca · Boulevard principal, Casablanca · Téléphone: +212 5 22 00 00 00</footer>
        </main>
      </body>
    </html>
  `;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
