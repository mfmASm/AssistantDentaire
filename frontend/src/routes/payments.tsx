import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Plus, MessageCircle, Wallet, TrendingUp, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";

import { ActionDialog } from "@/components/action-dialog";
import { PageHeader, StatCard } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import { formatMAD, formatDate } from "@/lib/demo-data";
import { todayISO, formatShortDate } from "@/lib/date-utils";
import { DEMO_MODE_EVENT, demoPatients, demoPayments, isDemoMode } from "@/lib/demoMode";
import { fillWhatsAppTemplate, logAndOpenWhatsapp, whatsappTemplates } from "@/lib/whatsapp";
import { patientsApi, toUiPatient, type PatientRecord } from "@/services/patientsApi";
import { paymentsApi, type ApiPayment, type PaymentPayload } from "@/services/paymentsApi";

type PaymentStatus = "paid" | "partial" | "unpaid" | "overdue";

type PaymentRow = {
  id: string;
  patientId: string;
  patient: string;
  phone: string;
  treatment: string;
  total: number;
  paid: number;
  remaining: number;
  dueDate: string;
  status: PaymentStatus;
  installments?: number;
  notes?: string;
};

const treatmentPrices = [
  { value: "Consultation + radio", price: 400 },
  { value: "Detartrage complet", price: 600 },
  { value: "Composite esthetique", price: 900 },
  { value: "Blanchiment dentaire", price: 1800 },
  { value: "Traitement de canal", price: 2200 },
  { value: "Extraction dent de sagesse", price: 1500 },
  { value: "Couronne ceramique", price: 3000 },
  { value: "Bridge provisoire", price: 4500 },
  { value: "Implant dentaire", price: 8500 },
  { value: "Orthodontie mensualite", price: 1200 },
];

export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [
      { title: "Paiements - DentalPilot" },
      { name: "description", content: "Suivi des paiements patients : impayes, partiels, plans de paiement et relances WhatsApp." },
    ],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [patientRows, setPatientRows] = useState<PatientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [demoMode, setDemoModeState] = useState(() => isDemoMode());
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({
    patientId: "",
    treatment: "",
    total: "",
    paid: "",
    paymentMethod: "Especes",
    status: "paid" as PaymentStatus,
    installments: "1",
    dueDate: todayISO(),
    notes: "",
  });

  const patientsById = useMemo(() => new Map(patientRows.map((patient) => [patient.id, patient])), [patientRows]);

  const toPaymentRow = (payment: ApiPayment): PaymentRow => {
    const patient = patientsById.get(payment.patient_id);
    const total = toAmount(payment.total_amount);
    const paid = toAmount(payment.paid_amount);
    const remaining = payment.remaining_amount == null ? Math.max(total - paid, 0) : toAmount(payment.remaining_amount);
    const dueDate = payment.due_date || todayISO();
    const status = toUiPaymentStatus(payment.status, dueDate);
    return {
      id: payment.id,
      patientId: payment.patient_id,
      patient: payment.patients?.full_name || patient?.name || "Patient inconnu",
      phone: payment.patients?.phone || patient?.phone || "",
      treatment: payment.treatment || "-",
      total,
      paid,
      remaining,
      dueDate,
      status,
      installments: extractInstallments(payment.notes),
      notes: payment.notes || undefined,
    };
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (demoMode) {
        const uiPatients = demoPatients.map(toUiPatient);
        setPatientRows(uiPatients);
        const patientMap = new Map(uiPatients.map((patient) => [patient.id, patient]));
        const paymentRows = demoPayments.map((payment) => {
          const patient = patientMap.get(payment.patient_id);
          const total = toAmount(payment.total_amount);
          const paid = toAmount(payment.paid_amount);
          const remaining = payment.remaining_amount == null ? Math.max(total - paid, 0) : toAmount(payment.remaining_amount);
          const dueDate = payment.due_date || todayISO();
          return {
            id: payment.id,
            patientId: payment.patient_id,
            patient: payment.patients?.full_name || patient?.name || "Patient inconnu",
            phone: payment.patients?.phone || patient?.phone || "",
            treatment: payment.treatment || "-",
            total,
            paid,
            remaining,
            dueDate,
            status: toUiPaymentStatus(payment.status, dueDate),
            installments: extractInstallments(payment.notes),
            notes: payment.notes || undefined,
          };
        });
        setRows(paymentRows);
        return;
      }
      const patients = await patientsApi.list();
      const uiPatients = patients.map(toUiPatient);
      setPatientRows(uiPatients);
      const patientMap = new Map(uiPatients.map((patient) => [patient.id, patient]));
      const paymentRows = (await paymentsApi.getPayments()).map((payment) => {
        const patient = patientMap.get(payment.patient_id);
        const total = toAmount(payment.total_amount);
        const paid = toAmount(payment.paid_amount);
        const remaining = payment.remaining_amount == null ? Math.max(total - paid, 0) : toAmount(payment.remaining_amount);
        const dueDate = payment.due_date || todayISO();
        return {
          id: payment.id,
          patientId: payment.patient_id,
          patient: payment.patients?.full_name || patient?.name || "Patient inconnu",
          phone: payment.patients?.phone || patient?.phone || "",
          treatment: payment.treatment || "-",
          total,
          paid,
          remaining,
          dueDate,
          status: toUiPaymentStatus(payment.status, dueDate),
          installments: extractInstallments(payment.notes),
          notes: payment.notes || undefined,
        };
      });
      setRows(paymentRows);
    } catch {
      toast.error("Impossible de charger les paiements.");
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

  const filtered = rows.filter((p) => {
    const search = q.trim().toLowerCase();
    if (search) {
      const haystack = [p.patient, p.phone, p.treatment, paymentStatusLabel(p.status), p.notes].join(" ").toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (filter !== "all" && p.status !== filter) return false;
    return true;
  });

  const totalRevenue = rows.reduce((s, p) => s + p.paid, 0);
  const pending = rows.filter((p) => p.status !== "paid").reduce((s, p) => s + p.remaining, 0);
  const today = todayISO();
  const todayCollected = rows.filter((p) => p.dueDate <= today && p.status === "paid").reduce((s, p) => s + p.paid, 0);
  const overdue = rows.filter((p) => p.status !== "paid" && p.dueDate < today).reduce((s, p) => s + p.remaining, 0);

  const addPayment = async () => {
    if (patientRows.length === 0) {
      toast.error("Ajoutez d'abord un patient avant d'enregistrer un paiement.");
      return;
    }

    const total = Number(form.total);
    const paid = form.status === "unpaid" ? 0 : form.status === "paid" ? total : Math.min(Number(form.paid), total);
    const remaining = Math.max(total - paid, 0);
    const status = toApiPaymentStatus(form.status === "paid" || form.status === "partial" || form.status === "unpaid" || form.status === "overdue"
      ? form.status
      : paid >= total ? "paid" : paid > 0 ? "partial" : "unpaid");
    const payload: PaymentPayload = {
      patient_id: form.patientId,
      treatment: form.treatment.trim(),
      total_amount: total,
      paid_amount: paid,
      remaining_amount: remaining,
      status,
      due_date: form.dueDate,
      notes: form.notes.trim() || undefined,
    };
    setIsSaving(true);
    try {
      if (demoMode) {
        const patient = patientRows.find((row) => row.id === form.patientId);
        const created = toPaymentRow({
          id: `demo-payment-${Date.now()}`,
          patient_id: form.patientId,
          treatment: payload.treatment,
          total_amount: total,
          paid_amount: paid,
          remaining_amount: remaining,
          status,
          due_date: form.dueDate,
          notes: payload.notes,
          patients: patient ? { id: patient.id, full_name: patient.name, phone: patient.phone } : null,
        });
        setRows((current) => [created, ...current]);
        setForm({
          patientId: "",
          treatment: "",
          total: "",
          paid: "",
          paymentMethod: "Especes",
          status: "paid",
          installments: "1",
          dueDate: todayISO(),
          notes: "",
        });
        setIsAddOpen(false);
        toast.success("Paiement enregistré avec succès.");
        return;
      }
      const created = await paymentsApi.createPayment(payload);
      await loadData();
      setForm({
        patientId: "",
        treatment: "",
        total: "",
        paid: "",
        paymentMethod: "Especes",
        status: "paid",
        installments: "1",
        dueDate: todayISO(),
        notes: "",
      });
      setIsAddOpen(false);
      toast.success("Paiement enregistré avec succès.");
    } catch {
      console.warn("Payment creation failed");
      toast.error("Impossible d'enregistrer le paiement. Vérifiez les montants et réessayez.");
    } finally {
      setIsSaving(false);
    }
  };

  const sendReminder = (payment: PaymentRow) => {
    if (!payment.phone) {
      toast.error("Numéro WhatsApp du patient manquant.");
      return;
    }
    const message = fillWhatsAppTemplate(whatsappTemplates.payment, {
      Patient: payment.patient,
      Montant: payment.remaining,
      Traitement: payment.treatment,
    });
    if (!logAndOpenWhatsapp({ patientId: payment.patientId, type: "payment_reminder", phone: payment.phone, message })) return;
    if (demoMode) {
      setRows((current) => current.map((p) => (p.id === payment.id ? { ...p, notes: `Relance envoyee le ${formatShortDate()}` } : p)));
      return;
    }
    setRows((current) => current.map((p) => (p.id === payment.id ? { ...p, notes: `Relance envoyee le ${formatShortDate()}` } : p)));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paiements"
        description="Suivi des encaissements et des balances patients"
        actions={
          <ActionDialog
            title="Nouveau paiement"
            description="Ajoutez un encaissement visible dans la table et les statistiques."
            open={isAddOpen}
            onOpenChange={setIsAddOpen}
            onSubmit={addPayment}
            submitLabel={isSaving ? "Enregistrement..." : "Enregistrer"}
            disabled={isSaving || patientRows.length === 0 || !form.patientId || !form.treatment.trim() || Number(form.total) <= 0 || Number(form.paid) < 0 || !form.dueDate}
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> Nouveau paiement
              </Button>
            }
          >
            {patientRows.length === 0 ? (
              <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                Ajoutez d'abord un patient avant d'enregistrer un paiement.
              </p>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="payment-patient">Patient</Label>
              <Select value={form.patientId} onValueChange={(patientId) => setForm((f) => ({ ...f, patientId }))}>
                <SelectTrigger id="payment-patient"><SelectValue placeholder="Choisir un patient" /></SelectTrigger>
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
              <Label>Traitement facture</Label>
              <Select
                value={form.treatment}
                onValueChange={(treatment) => {
                  const selected = treatmentPrices.find((item) => item.value === treatment);
                  setForm((f) => ({ ...f, treatment, total: selected ? String(selected.price) : f.total, paid: selected ? String(selected.price) : f.paid }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Choisir un traitement" /></SelectTrigger>
                <SelectContent>
                  {treatmentPrices.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.value} - {formatMAD(t.price)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="payment-total">Total MAD</Label>
                <Input id="payment-total" type="number" min="1" value={form.total} onChange={(e) => setForm((f) => ({ ...f, total: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="payment-paid">Montant paye MAD</Label>
                <Input id="payment-paid" type="number" min="0" value={form.paid} onChange={(e) => setForm((f) => ({ ...f, paid: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={(status) => setForm((f) => ({ ...f, status: status as PaymentStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paye</SelectItem>
                    <SelectItem value="partial">Partiel</SelectItem>
                    <SelectItem value="unpaid">Impaye</SelectItem>
                    <SelectItem value="overdue">En retard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Methode</Label>
                <Select value={form.paymentMethod} onValueChange={(paymentMethod) => setForm((f) => ({ ...f, paymentMethod }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Especes">Especes</SelectItem>
                    <SelectItem value="Carte bancaire">Carte bancaire</SelectItem>
                    <SelectItem value="Virement">Virement</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="Assurance">Assurance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Plan</Label>
                <Select value={form.installments} onValueChange={(installments) => setForm((f) => ({ ...f, installments }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Paiement direct</SelectItem>
                    <SelectItem value="2">2 fois</SelectItem>
                    <SelectItem value="3">3 fois</SelectItem>
                    <SelectItem value="4">4 fois</SelectItem>
                    <SelectItem value="6">6 fois</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="payment-due">Echeance</Label>
                <Input id="payment-due" type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment-notes">Note caisse</Label>
              <Textarea
                id="payment-notes"
                rows={3}
                placeholder="Ex: acompte recu, promesse de paiement vendredi, prise en charge assurance..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </ActionDialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenu du mois" value={formatMAD(totalRevenue)} trend="+18% vs avril" trendTone="up" icon={<TrendingUp className="size-5" />} accent="success" />
        <StatCard label="En attente" value={formatMAD(pending)} hint={`${rows.filter((p) => p.status !== "paid").length} paiements`} icon={<Clock className="size-5" />} accent="warning" />
        <StatCard label="En retard" value={formatMAD(overdue)} icon={<AlertCircle className="size-5" />} accent="danger" />
        <StatCard label="Encaisse aujourd'hui" value={formatMAD(todayCollected)} icon={<Wallet className="size-5" />} accent="primary" />
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList>
                <TabsTrigger value="all">Tous</TabsTrigger>
                <TabsTrigger value="paid">Payes</TabsTrigger>
                <TabsTrigger value="partial">Partiels</TabsTrigger>
                <TabsTrigger value="unpaid">Impayes</TabsTrigger>
                <TabsTrigger value="overdue">En retard</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden md:table-cell">Traitement</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Progression</TableHead>
                  <TableHead>Reste</TableHead>
                  <TableHead className="hidden sm:table-cell">Echeance</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      Chargement des paiements...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      Aucun paiement trouvé.
                    </TableCell>
                  </TableRow>
                ) : filtered.map((p) => {
                  const pct = p.total > 0 ? Math.round((p.paid / p.total) * 100) : 0;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium">{p.patient}</div>
                        {p.installments && <div className="text-xs text-muted-foreground">Plan {p.installments}x</div>}
                        {p.notes && <div className="text-xs text-muted-foreground">{p.notes}</div>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.treatment}</TableCell>
                      <TableCell className="font-medium">{formatMAD(p.total)}</TableCell>
                      <TableCell className="min-w-32">
                        <div className="space-y-1">
                          <Progress value={pct} className="h-1.5" />
                          <p className="text-xs text-muted-foreground">{formatMAD(p.paid)} - {pct}%</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{formatMAD(p.remaining)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{formatDate(p.dueDate)}</TableCell>
                      <TableCell><StatusBadge tone={paymentStatusTone(p.status)}>{paymentStatusLabel(p.status)}</StatusBadge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => sendReminder(p)}>
                          <MessageCircle className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function toAmount(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function toUiPaymentStatus(status?: string | null, dueDate?: string): PaymentStatus {
  const normalized = status?.trim().toLowerCase();
  if (normalized === "payé" || normalized === "paye" || normalized === "paid") return "paid";
  if (normalized === "partiel" || normalized === "partial") return dueDate && dueDate < todayISO() ? "overdue" : "partial";
  if (normalized === "en retard" || normalized === "overdue") return "overdue";
  return dueDate && dueDate < todayISO() ? "overdue" : "unpaid";
}

function toApiPaymentStatus(status: PaymentStatus) {
  if (status === "paid") return "Payé";
  if (status === "partial") return "Partiel";
  if (status === "overdue") return "En retard";
  return "Impayé";
}

function paymentStatusTone(status: PaymentStatus) {
  if (status === "paid") return "success";
  if (status === "partial") return "warning";
  if (status === "overdue") return "danger";
  return "danger";
}

function paymentStatusLabel(status: PaymentStatus) {
  if (status === "paid") return "Payé";
  if (status === "partial") return "Partiel";
  if (status === "overdue") return "En retard";
  return "Impayé";
}

function extractInstallments(notes?: string | null) {
  const match = notes?.match(/Plan\s+(\d+)x/i);
  const installments = match ? Number(match[1]) : undefined;
  return installments && installments > 1 ? installments : undefined;
}
