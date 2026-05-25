import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { StatusBadge, paymentTone, paymentLabel } from "@/components/status-badge";
import { payments, patients, formatMAD, formatDate, type Payment, type PaymentStatus } from "@/lib/demo-data";
import { todayISO, formatShortDate } from "@/lib/date-utils";
import { fillWhatsAppTemplate, openWhatsAppMessage, whatsappTemplates } from "@/lib/whatsapp";

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
  const [rows, setRows] = useState<Payment[]>(payments);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({
    patient: "",
    treatment: "",
    total: "",
    paid: "",
    paymentMethod: "Especes",
    status: "paid" as PaymentStatus,
    installments: "1",
    dueDate: todayISO(),
    notes: "",
  });

  const filtered = rows.filter((p) => {
    if (q && !p.patient.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter !== "all" && p.status !== filter) return false;
    return true;
  });

  const totalRevenue = rows.reduce((s, p) => s + p.paid, 0);
  const pending = rows.filter((p) => p.status !== "paid").reduce((s, p) => s + (p.total - p.paid), 0);
  const today = todayISO();
  const todayCollected = rows.filter((p) => p.dueDate <= today && p.status === "paid").reduce((s, p) => s + p.paid, 0);
  const overdue = rows.filter((p) => p.status !== "paid" && p.dueDate < today).reduce((s, p) => s + (p.total - p.paid), 0);

  const addPayment = () => {
    const total = Number(form.total);
    const paid = form.status === "unpaid" ? 0 : form.status === "paid" ? total : Math.min(Number(form.paid), total);
    const status: PaymentStatus = form.status === "paid" || form.status === "partial" || form.status === "unpaid" ? form.status : paid >= total ? "paid" : paid > 0 ? "partial" : "unpaid";
    const payment: Payment = {
      id: `pay${Date.now()}`,
      patientId: `p${Date.now()}`,
      patient: form.patient.trim(),
      treatment: form.treatment.trim(),
      total,
      paid,
      dueDate: form.dueDate,
      status,
      installments: Number(form.installments) > 1 ? Number(form.installments) : undefined,
      notes: [form.paymentMethod, form.notes.trim()].filter(Boolean).join(" - "),
    };
    setRows((current) => [payment, ...current]);
    setForm({
      patient: "",
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
    toast.success("Paiement enregistre");
  };

  const sendReminder = (id: string) => {
    const payment = rows.find((p) => p.id === id);
    const patient = patients.find((p) => p.id === payment?.patientId || p.name === payment?.patient);
    const remaining = payment ? payment.total - payment.paid : 0;
    const message = fillWhatsAppTemplate(whatsappTemplates.payment, {
      Patient: payment?.patient,
      Montant: remaining,
      Traitement: payment?.treatment,
    });
    if (!openWhatsAppMessage(patient?.phone, message)) return;
    setRows((current) => current.map((p) => (p.id === id ? { ...p, notes: `Relance envoyee le ${formatShortDate()}` } : p)));
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
            submitLabel="Enregistrer"
            disabled={!form.patient.trim() || !form.treatment.trim() || Number(form.total) <= 0 || Number(form.paid) < 0 || !form.dueDate}
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> Nouveau paiement
              </Button>
            }
          >
            <div className="grid gap-2">
              <Label htmlFor="payment-patient">Patient</Label>
              <Input id="payment-patient" value={form.patient} onChange={(e) => setForm((f) => ({ ...f, patient: e.target.value }))} />
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
                {filtered.map((p) => {
                  const pct = Math.round((p.paid / p.total) * 100);
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
                      <TableCell className="font-semibold">{formatMAD(p.total - p.paid)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{formatDate(p.dueDate)}</TableCell>
                      <TableCell><StatusBadge tone={paymentTone(p.status)}>{paymentLabel(p.status)}</StatusBadge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => sendReminder(p.id)}>
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
