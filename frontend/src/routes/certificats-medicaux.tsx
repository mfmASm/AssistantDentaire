import { createFileRoute } from "@tanstack/react-router";
import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";
import {
  Copy,
  Download,
  FileCheck2,
  FilePlus2,
  Library,
  MessageCircle,
  Pencil,
  Printer,
  Search,
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
import { addDays, currentMonthPrefix, formatShortDate, relativeISO, todayISO } from "@/lib/date-utils";
import { DEMO_MODE_EVENT, demoCertificates, demoPatients, isDemoMode } from "@/lib/demoMode";
import { canFinalizeMedicalDocuments, normalizeRole, type AppRole } from "@/lib/roles";
import { fillWhatsAppTemplate, logAndOpenWhatsapp, whatsappTemplates } from "@/lib/whatsapp";
import { authApi, type AuthMe } from "@/services/authApi";
import {
  createMedicalCertificate,
  duplicateMedicalCertificate,
  generateMedicalCertificatePdf,
  getMedicalCertificatePdfUrl,
  getMedicalCertificate,
  getMedicalCertificates,
  markMedicalCertificateSent,
  type ApiMedicalCertificate,
  type MedicalCertificatePayload,
  updateMedicalCertificate,
} from "@/services/medicalCertificatesApi";
import { patientsApi, type ApiPatient } from "@/services/patientsApi";

export const Route = createFileRoute("/certificats-medicaux")({
  head: () => ({
    meta: [
      { title: "Certificats médicaux - DentalPilot" },
      { name: "description", content: "Création, gestion, impression et envoi des certificats médicaux du cabinet." },
    ],
  }),
  component: MedicalCertificatesPage,
});

type CertificateStatus = "Brouillon" | "Finalisé" | "Envoyé" | "Imprimé";
type CertificateType =
  | "Certificat de repos"
  | "Certificat de présence"
  | "Certificat de soins"
  | "Certificat d'aptitude"
  | "Certificat post-intervention"
  | "Certificat enfant"
  | "Autre";

type MedicalCertificate = {
  id: string;
  patientId?: string;
  reference: string;
  date: string;
  patient: string;
  age: string;
  telephone: string;
  medecin: string;
  type: CertificateType;
  motif: string;
  dateDebut: string;
  dateFin: string;
  dureeRepos: string;
  observations: string;
  notesInternes: string;
  texte: string;
  statut: CertificateStatus;
  pdfUrl?: string | null;
};

type CertificateTemplate = {
  id: string;
  nom: string;
  description: string;
  type: CertificateType;
  motif: string;
  dureeRepos: string;
  observations: string;
  texte: string;
};

const doctors = ["Dr. Safaa M'gaassy"];
const certificateTypes: CertificateType[] = [
  "Certificat de repos",
  "Certificat de présence",
  "Certificat de soins",
  "Certificat d'aptitude",
  "Certificat post-intervention",
  "Certificat enfant",
  "Autre",
];

const certificateText = (patient = "[Nom du patient]", date = "[Date]", duration = "[Durée]", start = "[Date de début]") =>
  `Je soussignée, Dr. Safaa M'gaassy, certifie avoir examiné le/la patient(e) ${patient} le ${date}. Son état de santé nécessite un repos de ${duration} à compter du ${start}, sauf complications.`;

const initialCertificates: MedicalCertificate[] = [
  {
    id: "cert-001",
    reference: `CERT-${new Date().getFullYear()}-001`,
    date: todayISO(),
    patient: "Yasmine El Amrani",
    age: "34",
    telephone: "+212 6 12 45 78 90",
    medecin: "Dr. Safaa M'gaassy",
    type: "Certificat de repos",
    motif: "Douleur post-intervention",
    dateDebut: todayISO(),
    dateFin: relativeISO(2),
    dureeRepos: "2 jours",
    observations: "Repos conseillé après intervention dentaire, à valider selon évolution clinique.",
    notesInternes: "Patient informé des consignes post-opératoires.",
    texte: certificateText("Yasmine El Amrani", formatShortDate(), "2 jours", formatShortDate()),
    statut: "Finalisé",
  },
  {
    id: "cert-002",
    reference: `CERT-${new Date().getFullYear()}-002`,
    date: relativeISO(-1),
    patient: "Karim Bennani",
    age: "48",
    telephone: "+212 6 22 34 56 78",
    medecin: "Dr. Safaa M'gaassy",
    type: "Certificat de présence",
    motif: "Consultation implant",
    dateDebut: relativeISO(-1),
    dateFin: relativeISO(-1),
    dureeRepos: "1 jour",
    observations: "Présence au cabinet pour consultation implantologique.",
    notesInternes: "Envoyé par WhatsApp après validation.",
    texte: `Je soussignée, Dr. Safaa M'gaassy, certifie que le patient Karim Bennani s'est présenté au Cabinet Atlas - Casablanca pour une consultation implantologique le ${formatShortDate(addDays(new Date(), -1))}.`,
    statut: "Envoyé",
  },
  {
    id: "cert-003",
    reference: `CERT-${new Date().getFullYear()}-003`,
    date: relativeISO(-2),
    patient: "Nadia Chraibi",
    age: "41",
    telephone: "+212 6 45 67 89 10",
    medecin: "Dr. Safaa M'gaassy",
    type: "Certificat de soins",
    motif: "Traitement de canal",
    dateDebut: relativeISO(-2),
    dateFin: relativeISO(1),
    dureeRepos: "3 jours",
    observations: "Certificat à compléter après validation du médecin.",
    notesInternes: "Brouillon préparé après consultation.",
    texte: certificateText("Nadia Chraibi", "18/05/2026", "3 jours", "18/05/2026"),
    statut: "Brouillon",
  },
  {
    id: "cert-004",
    reference: `CERT-${new Date().getFullYear()}-004`,
    date: relativeISO(-3),
    patient: "Omar Benjelloun",
    age: "55",
    telephone: "+212 6 78 90 12 34",
    medecin: "Dr. Safaa M'gaassy",
    type: "Certificat d'aptitude",
    motif: "Contrôle dentaire",
    dateDebut: relativeISO(-3),
    dateFin: relativeISO(-3),
    dureeRepos: "Aucun repos",
    observations: "Contrôle dentaire réalisé au cabinet.",
    notesInternes: "Imprimé à la demande du patient.",
    texte: `Je soussignée, Dr. Safaa M'gaassy, certifie avoir examiné le patient Omar Benjelloun dans le cadre d'un contrôle dentaire le ${formatShortDate(addDays(new Date(), -3))}.`,
    statut: "Imprimé",
  },
  {
    id: "cert-005",
    reference: `CERT-${new Date().getFullYear()}-005`,
    date: relativeISO(-4),
    patient: "Salma Tazi",
    age: "29",
    telephone: "+212 6 10 20 30 40",
    medecin: "Dr. Safaa M'gaassy",
    type: "Certificat post-intervention",
    motif: "Extraction dentaire",
    dateDebut: relativeISO(-4),
    dateFin: relativeISO(-1),
    dureeRepos: "3 jours",
    observations: "Suite post-extraction à surveiller selon consignes remises.",
    notesInternes: "Envoyé au patient.",
    texte: certificateText("Salma Tazi", "16/05/2026", "3 jours", "16/05/2026"),
    statut: "Envoyé",
  },
  {
    id: "cert-006",
    reference: `CERT-${new Date().getFullYear()}-006`,
    date: relativeISO(-5),
    patient: "Mehdi Lahlou",
    age: "9",
    telephone: "+212 6 91 23 45 67",
    medecin: "Dr. Safaa M'gaassy",
    type: "Certificat enfant",
    motif: "Consultation pédiatrique",
    dateDebut: relativeISO(-5),
    dateFin: relativeISO(-4),
    dureeRepos: "1 jour",
    observations: "Certificat enfant à vérifier par le médecin avant finalisation.",
    notesInternes: "Accompagné par parent.",
    texte: certificateText("Mehdi Lahlou", "15/05/2026", "1 jour", "15/05/2026"),
    statut: "Brouillon",
  },
];

const certificateTemplates: CertificateTemplate[] = [
  {
    id: "tpl-cert-1",
    nom: "Certificat de repos après intervention dentaire",
    description: "Base de repos post-intervention à compléter par le médecin.",
    type: "Certificat de repos",
    motif: "Intervention dentaire",
    dureeRepos: "2 jours",
    observations: "Repos à adapter selon l'état clinique observé.",
    texte: certificateText("[Nom du patient]", "[Date]", "[Durée]", "[Date de début]"),
  },
  {
    id: "tpl-cert-2",
    nom: "Certificat de présence au cabinet",
    description: "Atteste la présence du patient pour une consultation.",
    type: "Certificat de présence",
    motif: "Présence au cabinet",
    dureeRepos: "Aucun repos",
    observations: "Présence au cabinet dentaire pour consultation.",
    texte: "Je soussignée, Dr. Safaa M'gaassy, certifie que le/la patient(e) [Nom du patient] s'est présenté(e) au Cabinet Atlas - Casablanca le [Date] pour une consultation dentaire.",
  },
  {
    id: "tpl-cert-3",
    nom: "Certificat de soins dentaires",
    description: "Certifie des soins réalisés ou en cours.",
    type: "Certificat de soins",
    motif: "Soins dentaires",
    dureeRepos: "À préciser",
    observations: "Soins dentaires réalisés ou en cours, selon dossier patient.",
    texte: "Je soussignée, Dr. Safaa M'gaassy, certifie avoir pris en charge le/la patient(e) [Nom du patient] pour des soins dentaires le [Date].",
  },
  {
    id: "tpl-cert-4",
    nom: "Certificat post-extraction",
    description: "Base de certificat après extraction dentaire.",
    type: "Certificat post-intervention",
    motif: "Extraction dentaire",
    dureeRepos: "3 jours",
    observations: "Suite post-extraction à vérifier avant impression ou envoi.",
    texte: certificateText("[Nom du patient]", "[Date]", "3 jours", "[Date de début]"),
  },
  {
    id: "tpl-cert-5",
    nom: "Certificat post-implant",
    description: "Certificat post-opératoire après pose d'implant.",
    type: "Certificat post-intervention",
    motif: "Pose implant",
    dureeRepos: "2 jours",
    observations: "Suite post-implantaire à adapter selon intervention.",
    texte: certificateText("[Nom du patient]", "[Date]", "2 jours", "[Date de début]"),
  },
  {
    id: "tpl-cert-6",
    nom: "Certificat de contrôle dentaire",
    description: "Attestation simple de contrôle dentaire.",
    type: "Certificat d'aptitude",
    motif: "Contrôle dentaire",
    dureeRepos: "Aucun repos",
    observations: "Contrôle dentaire réalisé au cabinet.",
    texte: "Je soussignée, Dr. Safaa M'gaassy, certifie avoir examiné le/la patient(e) [Nom du patient] dans le cadre d'un contrôle dentaire le [Date].",
  },
  {
    id: "tpl-cert-7",
    nom: "Certificat enfant",
    description: "Base de certificat pédiatrique à valider.",
    type: "Certificat enfant",
    motif: "Consultation pédiatrique",
    dureeRepos: "1 jour",
    observations: "Certificat enfant à vérifier avec le responsable légal.",
    texte: certificateText("[Nom du patient]", "[Date]", "1 jour", "[Date de début]"),
  },
];

const blankCertificate = (): MedicalCertificate => ({
  id: "",
  reference: "",
  date: todayISO(),
  patient: "",
  age: "",
  telephone: "",
  medecin: "Dr. Safaa M'gaassy",
  type: "Certificat de repos",
  motif: "",
  dateDebut: todayISO(),
  dateFin: todayISO(),
  dureeRepos: "",
  observations: "",
  notesInternes: "",
  texte: certificateText(),
  statut: "Brouillon",
});

const statusTone = (status: CertificateStatus) => {
  if (status === "Finalisé") return "success";
  if (status === "Envoyé") return "info";
  if (status === "Imprimé") return "neutral";
  return "warning";
};

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));

const normalizeStatus = (status?: string): CertificateStatus => {
  if (status === "Finalisé" || status === "Finalisee" || status === "Finalise" || status === "Validé" || status === "Valide") return "Finalisé";
  if (status === "Envoyé" || status === "Envoye") return "Envoyé";
  if (status === "Imprimé" || status === "Imprime") return "Imprimé";
  return "Brouillon";
};

const normalizeCertificateType = (type?: string | null): CertificateType => {
  if (type && certificateTypes.includes(type as CertificateType)) return type as CertificateType;
  if (type?.toLowerCase().includes("présence") || type?.toLowerCase().includes("presence")) return "Certificat de présence";
  if (type?.toLowerCase().includes("soins")) return "Certificat de soins";
  if (type?.toLowerCase().includes("repos")) return "Certificat de repos";
  return "Autre";
};

const toDemoCertificates = (): MedicalCertificate[] =>
  demoCertificates.map((certificate, index) => {
    const patient = demoPatients.find((item) => item.full_name === certificate.patient);
    const startDate = relativeISO(-index);
    const endDate = relativeISO(certificate.days - index - 1);
    return {
      id: certificate.id,
      patientId: patient?.id,
      reference: `CERT-DEMO-${String(index + 1).padStart(3, "0")}`,
      date: startDate,
      patient: certificate.patient,
      age: patient?.age ? String(patient.age) : "",
      telephone: patient?.phone || "",
      medecin: doctors[0],
      type: normalizeCertificateType(certificate.type),
      motif: "Certificat démo",
      dateDebut: startDate,
      dateFin: endDate,
      dureeRepos: `${certificate.days} jour${certificate.days > 1 ? "s" : ""}`,
      observations: "Certificat de démonstration à vérifier par le médecin.",
      notesInternes: "Donnée démo locale.",
      texte: certificateText(certificate.patient, formatShortDate(new Date(startDate)), `${certificate.days} jour${certificate.days > 1 ? "s" : ""}`, formatShortDate(new Date(startDate))),
      statut: "Brouillon",
    };
  });

const toMedicalCertificate = (certificate: ApiMedicalCertificate, patientsById: Record<string, ApiPatient>): MedicalCertificate => {
  const patient = patientsById[certificate.patient_id];
  return {
    id: certificate.id,
    patientId: certificate.patient_id,
    reference: certificate.reference || certificate.id,
    date: certificate.certificate_date || certificate.created_at?.slice(0, 10) || todayISO(),
    patient: patient?.full_name || "Patient inconnu",
    age: patient?.age ? String(patient.age) : "",
    telephone: patient?.phone || "",
    medecin: doctors[0],
    type: normalizeCertificateType(certificate.certificate_type),
    motif: certificate.motif || "",
    dateDebut: certificate.start_date || certificate.certificate_date || todayISO(),
    dateFin: certificate.end_date || certificate.start_date || certificate.certificate_date || todayISO(),
    dureeRepos: certificate.rest_duration || "",
    observations: certificate.observations || "",
    notesInternes: certificate.internal_notes || "",
    texte: certificate.certificate_text || "",
    statut: normalizeStatus(certificate.status),
    pdfUrl: certificate.pdf_url,
  };
};

function MedicalCertificatesPage() {
  const [demoMode, setDemoModeState] = useState(() => isDemoMode());
  const [rows, setRows] = useState<MedicalCertificate[]>(() => (isDemoMode() ? toDemoCertificates() : []));
  const [patients, setPatients] = useState<ApiPatient[]>(() => (isDemoMode() ? demoPatients : []));
  const [currentUser, setCurrentUser] = useState<AuthMe | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [preview, setPreview] = useState<MedicalCertificate | null>(null);
  const [form, setForm] = useState<MedicalCertificate>(blankCertificate());

  const loadRealData = async () => {
    const [certificatesResponse, patientsResponse] = await Promise.all([
      getMedicalCertificates(),
      patientsApi.list(),
    ]);
    const patientsById = Object.fromEntries(patientsResponse.map((patient) => [patient.id, patient]));
    setPatients(patientsResponse);
    setRows(certificatesResponse.map((certificate) => toMedicalCertificate(certificate, patientsById)));
  };

  useEffect(() => {
    let active = true;

    if (demoMode) {
      setLoading(false);
      setPatients(demoPatients);
      setRows(toDemoCertificates());
      return () => {
        active = false;
      };
    }

    setLoading(true);
    Promise.all([authApi.me().catch(() => null), loadRealData()])
      .then(([user]) => {
        if (!active) return;
        setCurrentUser(user);
      })
      .catch(() => {
        if (!active) return;
        setRows([]);
        toast.error("Impossible de charger les certificats médicaux.");
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

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const haystack = `${row.patient} ${row.motif} ${row.type} ${row.medecin}`.toLowerCase();
        if (query && !haystack.includes(query.toLowerCase())) return false;
        if (statusFilter !== "all" && row.statut !== statusFilter) return false;
        if (doctorFilter !== "all" && row.medecin !== doctorFilter) return false;
        if (typeFilter !== "all" && row.type !== typeFilter) return false;
        if (dateFilter === "today" && row.date !== todayISO()) return false;
        if (dateFilter === "week" && new Date(row.date) < new Date(relativeISO(-6))) return false;
        if (dateFilter === "month" && !row.date.startsWith(currentMonthPrefix())) return false;
        return true;
      }),
    [dateFilter, doctorFilter, query, rows, statusFilter, typeFilter],
  );

  const openNew = (seed?: Partial<MedicalCertificate>) => {
    if (!demoMode && patients.length === 0) {
      toast.error("Ajoutez d'abord un patient avant de créer un certificat.");
      return;
    }
    setForm({ ...blankCertificate(), ...seed, id: "", reference: "", statut: "Brouillon" });
    setFormOpen(true);
  };

  const makeCertificatePayload = (statut: CertificateStatus): MedicalCertificatePayload | null => {
    const patientId = form.patientId || patients.find((patient) => patient.full_name === form.patient)?.id;
    if (!patientId) return null;
    return {
      patient_id: patientId,
      certificate_date: form.date,
      certificate_type: form.type,
      motif: form.motif.trim() || null,
      start_date: form.dateDebut || null,
      end_date: form.dateFin || null,
      rest_duration: form.dureeRepos.trim() || null,
      observations: form.observations.trim() || null,
      internal_notes: form.notesInternes.trim() || null,
      certificate_text: form.texte.trim() || null,
      status: statut,
    };
  };

  const getCurrentUserRole = async () => {
    const role = normalizeRole(currentUser?.role as AppRole);
    if (role) return role;

    try {
      const user = await authApi.me();
      setCurrentUser(user);
      return normalizeRole(user.role as AppRole);
    } catch {
      return undefined;
    }
  };

  const editDraftCertificate = async (certificate: MedicalCertificate) => {
    if (certificate.statut !== "Brouillon") return;

    if (demoMode) {
      setForm(certificate);
      setFormOpen(true);
      return;
    }

    try {
      const response = await getMedicalCertificate(certificate.id);
      const patientsById = Object.fromEntries(patients.map((patient) => [patient.id, patient]));
      setForm(toMedicalCertificate(response, patientsById));
      setFormOpen(true);
    } catch (error) {
      console.error("Medical certificate fetch failed before edit", error);
      toast.error("Impossible d'ouvrir le brouillon.");
    }
  };

  const openPreview = async (certificate: MedicalCertificate) => {
    if (demoMode) {
      setPreview(certificate);
      return;
    }

    try {
      const response = await getMedicalCertificate(certificate.id);
      const patientsById = Object.fromEntries(patients.map((patient) => [patient.id, patient]));
      setPreview(toMedicalCertificate(response, patientsById));
    } catch (error) {
      console.error("Medical certificate fetch failed before preview", error);
      setPreview(certificate);
      toast.error("Impossible de charger le détail du certificat.");
    }
  };

  const saveCertificate = async (statut: CertificateStatus) => {
    if (!demoMode && statut === "Finalisé") {
      const role = await getCurrentUserRole();
      if (!role) {
        console.warn("Missing user role for medical document finalization");
        toast.error("Seul le docteur peut finaliser les documents médicaux.");
        return;
      }
      if (!canFinalizeMedicalDocuments(role)) {
        toast.error("Seul le docteur peut finaliser les documents médicaux.");
        return;
      }
    }

    if (!demoMode) {
      const payload = makeCertificatePayload(statut);
      if (!payload) {
        toast.error("Veuillez sélectionner un patient existant.");
        return;
      }
      setSaving(true);
      try {
        if (form.id) {
          await updateMedicalCertificate(form.id, payload);
          toast.success(statut === "Brouillon" ? "Brouillon mis à jour avec succès." : "Certificat finalisé avec succès.");
        } else {
          await createMedicalCertificate(payload);
          toast.success("Certificat enregistré avec succès.");
        }
        await loadRealData();
        setFormOpen(false);
      } catch (error) {
        console.error("Medical certificate save failed", error);
        toast.error(form.id ? "Impossible de modifier le brouillon." : "Impossible d'enregistrer le certificat.");
      } finally {
        setSaving(false);
      }
      return;
    }

    const id = form.id || `cert-${Date.now()}`;
    const reference = form.reference || `CERT-${new Date().getFullYear()}-${String(rows.length + 1).padStart(3, "0")}`;
    const certificate = { ...form, id, reference, statut };
    setRows((current) => (form.id ? current.map((row) => (row.id === form.id ? certificate : row)) : [certificate, ...current]));
    setForm(certificate);
    setFormOpen(false);
    toast.success(statut === "Brouillon" ? "Certificat enregistré en brouillon." : "Certificat finalisé.");
  };

  const duplicateCertificate = async (certificate: MedicalCertificate) => {
    if (!demoMode) {
      try {
        await duplicateMedicalCertificate(certificate.id);
        await loadRealData();
        toast.success("Certificat dupliqué avec succès.");
      } catch {
        toast.error("Impossible de dupliquer le certificat.");
      }
      return;
    }

    const copy = {
      ...certificate,
      id: `cert-${Date.now()}`,
      reference: `CERT-${new Date().getFullYear()}-${String(rows.length + 1).padStart(3, "0")}`,
      date: todayISO(),
      dateDebut: certificate.dateDebut ? todayISO() : "",
      dateFin: certificate.dateDebut ? addDays(new Date(), Math.max(parseInt(certificate.dureeRepos, 10) - 1 || 0, 0)).toISOString().slice(0, 10) : certificate.dateFin,
      statut: "Brouillon" as CertificateStatus,
      pdfUrl: null,
    };
    setRows((current) => [copy, ...current]);
    toast.success("Certificat dupliqué avec succès.");
  };

  const sendWhatsApp = async (certificate: MedicalCertificate) => {
    const id = certificate.id || `cert-${Date.now()}`;
    const reference = certificate.reference || `CERT-${new Date().getFullYear()}-${String(rows.length + 1).padStart(3, "0")}`;
    toast.info("WhatsApp Web va s’ouvrir avec le message pré-rempli. Pour envoyer un document, téléchargez le PDF puis joignez-le manuellement dans WhatsApp.");
    toast.info("Veuillez joindre le PDF téléchargé dans WhatsApp avant l’envoi.");
    const message = fillWhatsAppTemplate(whatsappTemplates.certificate, { Patient: certificate.patient });
    if (!logAndOpenWhatsapp({ patientId: certificate.patientId, type: "medical_certificate", phone: certificate.telephone, message })) return;
    if (!demoMode && certificate.id) {
      try {
        await markMedicalCertificateSent(certificate.id);
        await loadRealData();
      } catch {
        toast.error("Impossible de mettre à jour le statut du certificat.");
      }
      return;
    }
    const sentCertificate = { ...certificate, id, reference, statut: "Envoyé" as CertificateStatus };
    setRows((current) =>
      current.some((row) => row.id === id)
        ? current.map((row) => (row.id === id ? sentCertificate : row))
        : [sentCertificate, ...current],
    );
    if (form.id === certificate.id || !certificate.id) setForm(sentCertificate);
    toast.success("Certificat médical envoyé par WhatsApp avec succès.");
  };

  const printCertificate = (certificate: MedicalCertificate) => {
    const popup = window.open("", "_blank", "width=860,height=1100");
    if (!popup) {
      toast.error("Impossible d'ouvrir la fenêtre d'impression.");
      return;
    }
    popup.document.write(renderPrintableCertificate(certificate));
    popup.document.close();
    popup.focus();
    popup.print();
    if (!demoMode && certificate.patientId) {
      updateMedicalCertificate(certificate.id, { patient_id: certificate.patientId, status: "Imprimé" }).catch(() => undefined);
    }
    setRows((current) => current.map((row) => (row.id === certificate.id ? { ...row, statut: "Imprimé" } : row)));
  };

  const downloadCertificate = async (certificate: MedicalCertificate) => {
    if (!demoMode && certificate.id) {
      try {
        await generateMedicalCertificatePdf(certificate.id);
        const signed = await getMedicalCertificatePdfUrl(certificate.id);
        window.open(signed.url, "_blank", "noopener,noreferrer");
        toast.success("PDF téléchargé.");
      } catch {
        toast.error("Impossible de générer le PDF pour le moment.");
      }
      return;
    }
    const blob = createPdfBlob(certificate);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${certificate.reference || "certificat-medical"}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("PDF téléchargé.");
  };

  const useTemplate = (template: CertificateTemplate) => {
    setTemplatesOpen(false);
    openNew({
      type: template.type,
      motif: template.motif,
      dureeRepos: template.dureeRepos,
      observations: template.observations,
      texte: template.texte,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificats médicaux"
        description="Créez, gérez et envoyez les certificats médicaux de vos patients depuis DentalPilot."
        actions={
          <>
            <Button size="sm" onClick={() => openNew()}>
              <FilePlus2 className="size-4" /> Nouveau certificat
            </Button>
            <Button size="sm" variant="outline" onClick={() => setTemplatesOpen(true)}>
              <Library className="size-4" /> Modèles de certificats
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Certificats aujourd'hui" value="5" icon={<FileCheck2 className="size-5" />} accent="primary" />
        <StatCard label="Certificats ce mois" value="42" icon={<FilePlus2 className="size-5" />} accent="success" />
        <StatCard label="Envoyés par WhatsApp" value="16" icon={<MessageCircle className="size-5" />} accent="info" />
        <StatCard label="Brouillons" value={String(rows.filter((row) => row.statut === "Brouillon").length)} icon={<Pencil className="size-5" />} accent="warning" />
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(16rem,1fr)_12rem_12rem_14rem_15rem]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher patient, motif, type de certificat..."
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
                <SelectItem value="Finalisé">Finalisé</SelectItem>
                <SelectItem value="Envoyé">Envoyé</SelectItem>
                <SelectItem value="Imprimé">Imprimé</SelectItem>
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
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {certificateTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
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
                  <TableHead>Type</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Médecin</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">Chargement des certificats médicaux...</TableCell>
                  </TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">Aucun certificat à afficher.</TableCell>
                  </TableRow>
                )}
                {!loading && filtered.map((certificate) => (
                  <TableRow key={certificate.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(certificate.date)}</TableCell>
                    <TableCell className="font-medium">{certificate.patient}</TableCell>
                    <TableCell className="min-w-52 text-muted-foreground">{certificate.type}</TableCell>
                    <TableCell className="min-w-48 text-muted-foreground">{certificate.motif}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{certificate.dureeRepos}</TableCell>
                    <TableCell><StatusBadge tone={statusTone(certificate.statut)}>{certificate.statut}</StatusBadge></TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{certificate.medecin}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openPreview(certificate)}>Voir</Button>
                        {certificate.statut === "Brouillon" && (
                          <Button variant="ghost" size="sm" onClick={() => editDraftCertificate(certificate)}><Pencil className="size-4" /> Modifier</Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => duplicateCertificate(certificate)}><Copy className="size-4" /> Dupliquer</Button>
                        <Button variant="ghost" size="sm" onClick={() => printCertificate(certificate)}><Printer className="size-4" /> Imprimer</Button>
                        <Button variant="ghost" size="sm" onClick={() => downloadCertificate(certificate)}><Download className="size-4" /> Télécharger PDF</Button>
                        <Button variant="ghost" size="sm" onClick={() => sendWhatsApp(certificate)}><MessageCircle className="size-4" /> Envoyer WhatsApp</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CertificateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        form={form}
        setForm={setForm}
        patients={patients}
        demoMode={demoMode}
        saving={saving}
        saveDraft={() => saveCertificate("Brouillon")}
        finalize={() => saveCertificate("Finalisé")}
        download={() => downloadCertificate({ ...form, reference: form.reference || `CERT-${new Date().getFullYear()}-DEMO` })}
        print={() => printCertificate({ ...form, reference: form.reference || `CERT-${new Date().getFullYear()}-DEMO` })}
        sendWhatsApp={() => sendWhatsApp(form)}
      />
      <TemplatesDialog open={templatesOpen} onOpenChange={setTemplatesOpen} useTemplate={useTemplate} />
      <PreviewDialog certificate={preview} onOpenChange={(open) => !open && setPreview(null)} print={printCertificate} download={downloadCertificate} />
    </div>
  );
}

function CertificateFormDialog({
  open,
  onOpenChange,
  form,
  setForm,
  patients,
  demoMode,
  saving,
  saveDraft,
  finalize,
  download,
  print,
  sendWhatsApp,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: MedicalCertificate;
  setForm: Dispatch<SetStateAction<MedicalCertificate>>;
  patients: ApiPatient[];
  demoMode: boolean;
  saving: boolean;
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
          <DialogTitle>Nouveau certificat médical</DialogTitle>
          <DialogDescription>
            Le certificat doit être rempli, vérifié et validé par le médecin avant impression ou envoi.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="grid gap-4 rounded-2xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="grid gap-2 lg:col-span-2">
              <Label>Patient</Label>
              {demoMode ? (
                <Input value={form.patient} onChange={(event) => setForm((current) => ({ ...current, patient: event.target.value }))} />
              ) : (
                <Select
                  value={form.patientId || ""}
                  onValueChange={(patientId) => {
                    const patient = patients.find((item) => item.id === patientId);
                    setForm((current) => ({
                      ...current,
                      patientId,
                      patient: patient?.full_name || "",
                      age: patient?.age ? String(patient.age) : "",
                      telephone: patient?.phone || "",
                    }));
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Choisir un patient" /></SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>{patient.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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

          <section className="grid gap-4 rounded-2xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="grid gap-2">
              <Label>Type de certificat</Label>
              <Select value={form.type} onValueChange={(type) => setForm((current) => ({ ...current, type: type as CertificateType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {certificateTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Motif</Label>
              <Input value={form.motif} onChange={(event) => setForm((current) => ({ ...current, motif: event.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Durée de repos</Label>
              <Input value={form.dureeRepos} onChange={(event) => setForm((current) => ({ ...current, dureeRepos: event.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Date de début</Label>
              <Input type="date" value={form.dateDebut} onChange={(event) => setForm((current) => ({ ...current, dateDebut: event.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Date de fin</Label>
              <Input type="date" value={form.dateFin} onChange={(event) => setForm((current) => ({ ...current, dateFin: event.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Notes internes</Label>
              <Input value={form.notesInternes} onChange={(event) => setForm((current) => ({ ...current, notesInternes: event.target.value }))} />
            </div>
            <div className="grid gap-2 lg:col-span-3">
              <Label>Observations médicales</Label>
              <Textarea rows={3} value={form.observations} onChange={(event) => setForm((current) => ({ ...current, observations: event.target.value }))} />
            </div>
            <div className="grid gap-2 lg:col-span-3">
              <Label>Texte du certificat</Label>
              <Textarea rows={5} value={form.texte} onChange={(event) => setForm((current) => ({ ...current, texte: event.target.value }))} />
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
            <Button variant="outline" onClick={saveDraft} disabled={saving}>Enregistrer brouillon</Button>
            <Button onClick={finalize} disabled={saving}>Finaliser certificat</Button>
          </div>
        </DialogFooter>
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
  useTemplate: (template: CertificateTemplate) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Modèles de certificats</DialogTitle>
          <DialogDescription>
            Les modèles sont modifiables et doivent être vérifiés et validés par le médecin avant impression ou envoi.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          {certificateTemplates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base">{template.nom}</CardTitle>
                <p className="text-sm text-muted-foreground">{template.description}</p>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-0">
                <div className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{template.type}</p>
                  <p>{template.motif} - {template.dureeRepos}</p>
                  <p className="mt-2 line-clamp-3">{template.texte}</p>
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
  certificate,
  onOpenChange,
  print,
  download,
}: {
  certificate: MedicalCertificate | null;
  onOpenChange: (open: boolean) => void;
  print: (certificate: MedicalCertificate) => void;
  download: (certificate: MedicalCertificate) => void;
}) {
  return (
    <Dialog open={Boolean(certificate)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Voir certificat médical</DialogTitle>
          <DialogDescription>Aperçu professionnel avant impression ou téléchargement.</DialogDescription>
        </DialogHeader>
        {certificate && (
          <>
            <CertificatePreview certificate={certificate} />
            <DialogFooter>
              <Button variant="outline" onClick={() => download(certificate)}><Download className="size-4" /> Télécharger PDF</Button>
              <Button onClick={() => print(certificate)}><Printer className="size-4" /> Imprimer</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CertificatePreview({ certificate }: { certificate: MedicalCertificate }) {
  return (
    <div className="rounded-2xl border bg-white p-6 text-foreground shadow-sm">
      <div className="flex items-start justify-between gap-6 border-b pb-5">
        <div>
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileCheck2 className="size-6" />
          </div>
          <h2 className="mt-3 font-display text-xl font-semibold">Cabinet Atlas - Casablanca</h2>
          <p className="text-sm text-muted-foreground">Dr. Safaa M'gaassy</p>
          <p className="text-sm text-muted-foreground">Chirurgienne-dentiste</p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p>Adresse du cabinet: Boulevard principal, Casablanca</p>
          <p>Téléphone: +212 5 22 00 00 00</p>
          <p className="mt-3 font-medium text-foreground">Référence: {certificate.reference}</p>
        </div>
      </div>

      <div className="grid gap-4 border-b py-5 sm:grid-cols-3">
        <PreviewField label="Patient" value={certificate.patient} />
        <PreviewField label="Âge" value={`${certificate.age} ans`} />
        <PreviewField label="Date" value={formatDate(certificate.date)} />
      </div>

      <div className="space-y-5 py-5">
        <PreviewField label="Type de certificat" value={certificate.type} />
        <PreviewField label="Motif" value={certificate.motif} />
        <PreviewField label="Durée de repos" value={certificate.dureeRepos} />
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Texte du certificat</p>
          <p className="mt-2 leading-7">{certificate.texte}</p>
        </div>
        <PreviewField label="Observations médicales" value={certificate.observations || "-"} />
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

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function renderPlainCertificate(certificate: MedicalCertificate) {
  return [
    "Cabinet Atlas - Casablanca",
    "Dr. Safaa M'gaassy - Chirurgienne-dentiste",
    "Adresse du cabinet: Boulevard principal, Casablanca",
    "Téléphone: +212 5 22 00 00 00",
    "",
    `Référence: ${certificate.reference}`,
    `Patient: ${certificate.patient}`,
    `Âge: ${certificate.age} ans`,
    `Date: ${formatDate(certificate.date)}`,
    `Type: ${certificate.type}`,
    `Motif: ${certificate.motif}`,
    `Durée de repos: ${certificate.dureeRepos}`,
    "",
    "Texte du certificat:",
    certificate.texte,
    "",
    `Observations médicales: ${certificate.observations}`,
    "",
    "Signature du médecin:",
    "Cachet du cabinet:",
    "",
    "Cabinet Atlas - Casablanca - Adresse du cabinet - Téléphone: +212 5 22 00 00 00",
  ].join("\n");
}

function createPdfBlob(certificate: MedicalCertificate) {
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 48;
  const maxTextWidth = 84;
  const lines: { text: string; size?: number; bold?: boolean; gap?: number }[] = [
    { text: "Cabinet Atlas - Casablanca", size: 18, bold: true, gap: 18 },
    { text: "Dr. Safaa M'gaassy", size: 11 },
    { text: "Chirurgienne-dentiste", size: 11 },
    { text: "Adresse du cabinet: Boulevard principal, Casablanca", size: 10 },
    { text: "Téléphone: +212 5 22 00 00 00", size: 10, gap: 22 },
    { text: `Référence: ${certificate.reference}`, bold: true },
    { text: `Patient: ${certificate.patient}` },
    { text: `Âge: ${certificate.age} ans` },
    { text: `Date: ${formatDate(certificate.date)}` },
    { text: `Type: ${certificate.type}` },
    { text: `Motif: ${certificate.motif}` },
    { text: `Durée de repos: ${certificate.dureeRepos}`, gap: 18 },
    { text: "Texte du certificat", bold: true, gap: 12 },
    ...wrapPdfText(certificate.texte || "-", maxTextWidth).map((text) => ({ text })),
    { text: "Observations médicales", bold: true, gap: 18 },
    ...wrapPdfText(certificate.observations || "-", maxTextWidth).map((text) => ({ text })),
    { text: "Signature du médecin", gap: 48 },
    { text: "Cachet du cabinet", gap: 44 },
    { text: "Cabinet Atlas - Casablanca - Adresse du cabinet - Téléphone: +212 5 22 00 00 00", size: 9, gap: 30 },
  ];

  let y = pageHeight - margin;
  const content: string[] = [
    "0.12 w",
    `0.06 0.55 0.58 RG ${margin} ${pageHeight - 156} ${pageWidth - margin * 2} 1.5 re S`,
    `0.86 0.91 0.92 RG ${margin} 150 210 88 re S`,
    `0.86 0.91 0.92 RG ${pageWidth - margin - 210} 150 210 88 re S`,
    "BT",
  ];

  for (const line of lines) {
    if (line.gap) y -= line.gap;
    if (!line.text) continue;
    const size = line.size ?? 11;
    if (y < margin + 72) break;
    content.push(`/${line.bold ? "F2" : "F1"} ${size} Tf`);
    content.push(`${margin} ${y} Td (${escapePdfText(line.text)}) Tj`);
    content.push(`${-margin} ${-y} Td`);
    y -= size + 5;
  }

  content.push("ET");
  const stream = content.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
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

function renderPrintableCertificate(certificate: MedicalCertificate) {
  const certificateTextHtml = certificate.texte
    .split("\n")
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");

  return `
    <!doctype html>
    <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <title>${certificate.reference}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #1f2937; margin: 0; background: #f8fbfb; }
          .page { width: 760px; margin: 24px auto; background: white; padding: 48px; border: 1px solid #dce8ea; }
          .header { display: flex; justify-content: space-between; gap: 32px; border-bottom: 2px solid #0f9aa7; padding-bottom: 24px; }
          h1 { margin: 0; color: #0f766e; font-size: 26px; }
          h2 { margin: 28px 0 12px; font-size: 18px; color: #0f766e; }
          p { margin: 4px 0; line-height: 1.6; }
          .muted { color: #667085; font-size: 13px; }
          .patient { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 28px 0; padding: 16px; border: 1px solid #dce8ea; border-radius: 12px; }
          .label { text-transform: uppercase; font-size: 11px; color: #667085; letter-spacing: .08em; }
          .text { border: 1px solid #dce8ea; border-radius: 12px; padding: 18px; margin-top: 12px; }
          .signature { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 56px; }
          .box { height: 120px; border: 1px dashed #9fb6bb; border-radius: 12px; padding: 14px; color: #667085; }
          .footer { margin-top: 36px; border-top: 1px solid #dce8ea; padding-top: 16px; text-align: center; font-size: 12px; color: #667085; }
          @media print { body { background: white; } .page { width: auto; margin: 0; border: 0; } }
        </style>
      </head>
      <body>
        <main class="page">
          <section class="header">
            <div>
              <h1>Cabinet Atlas - Casablanca</h1>
              <p>Dr. Safaa M'gaassy</p>
              <p>Chirurgienne-dentiste</p>
            </div>
            <div class="muted">
              <p>Adresse du cabinet: Boulevard principal, Casablanca</p>
              <p>Téléphone: +212 5 22 00 00 00</p>
              <p><strong>Référence:</strong> ${escapeHtml(certificate.reference)}</p>
            </div>
          </section>
          <section class="patient">
            <div><p class="label">Patient</p><p><strong>${escapeHtml(certificate.patient)}</strong></p></div>
            <div><p class="label">Âge</p><p><strong>${escapeHtml(certificate.age)} ans</strong></p></div>
            <div><p class="label">Date</p><p><strong>${formatDate(certificate.date)}</strong></p></div>
          </section>
          <h2>Type de certificat</h2>
          <p>${escapeHtml(certificate.type)}</p>
          <h2>Motif</h2>
          <p>${escapeHtml(certificate.motif)}</p>
          <h2>Durée de repos</h2>
          <p>${escapeHtml(certificate.dureeRepos)}</p>
          <h2>Texte du certificat</h2>
          <div class="text">${certificateTextHtml}</div>
          <h2>Observations médicales</h2>
          <p>${escapeHtml(certificate.observations || "-")}</p>
          <section class="signature">
            <div class="box">Signature du médecin</div>
            <div class="box">Cachet du cabinet</div>
          </section>
          <p class="footer">Cabinet Atlas - Casablanca - Adresse du cabinet - Téléphone: +212 5 22 00 00 00</p>
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
