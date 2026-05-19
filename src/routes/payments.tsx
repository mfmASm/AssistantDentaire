import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Plus, MessageCircle, Wallet, TrendingUp, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, StatCard } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge, paymentTone, paymentLabel } from "@/components/status-badge";
import { payments, formatMAD, formatDate } from "@/lib/demo-data";

export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [
      { title: "Paiements — DentalPilot" },
      { name: "description", content: "Suivi des paiements patients : impayés, partiels, plans de paiement et relances WhatsApp." },
    ],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = payments.filter((p) => {
    if (q && !p.patient.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter !== "all" && p.status !== filter) return false;
    return true;
  });

  const totalRevenue = payments.reduce((s, p) => s + p.paid, 0);
  const pending = payments.filter((p) => p.status !== "paid").reduce((s, p) => s + (p.total - p.paid), 0);
  const today = "2026-05-18";
  const todayCollected = payments.filter((p) => p.dueDate <= today && p.status === "paid").reduce((s, p) => s + p.paid, 0);
  const overdue = payments.filter((p) => p.status !== "paid" && p.dueDate < today).reduce((s, p) => s + (p.total - p.paid), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paiements"
        description="Suivi des encaissements et des balances patients"
        actions={
          <Button size="sm" onClick={() => toast.success("Paiement enregistré")}>
            <Plus className="size-4" /> Nouveau paiement
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenu du mois" value={formatMAD(totalRevenue)} trend="+18% vs avril" trendTone="up" icon={<TrendingUp className="size-5" />} accent="success" />
        <StatCard label="En attente" value={formatMAD(pending)} hint={`${payments.filter(p => p.status !== "paid").length} paiements`} icon={<Clock className="size-5" />} accent="warning" />
        <StatCard label="En retard" value={formatMAD(overdue)} icon={<AlertCircle className="size-5" />} accent="danger" />
        <StatCard label="Encaissé aujourd'hui" value={formatMAD(todayCollected)} icon={<Wallet className="size-5" />} accent="primary" />
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList>
                <TabsTrigger value="all">Tous</TabsTrigger>
                <TabsTrigger value="paid">Payés</TabsTrigger>
                <TabsTrigger value="partial">Partiels</TabsTrigger>
                <TabsTrigger value="unpaid">Impayés</TabsTrigger>
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
                  <TableHead className="hidden sm:table-cell">Échéance</TableHead>
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
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.treatment}</TableCell>
                      <TableCell className="font-medium">{formatMAD(p.total)}</TableCell>
                      <TableCell className="min-w-32">
                        <div className="space-y-1">
                          <Progress value={pct} className="h-1.5" />
                          <p className="text-xs text-muted-foreground">{formatMAD(p.paid)} · {pct}%</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{formatMAD(p.total - p.paid)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{formatDate(p.dueDate)}</TableCell>
                      <TableCell><StatusBadge tone={paymentTone(p.status)}>{paymentLabel(p.status)}</StatusBadge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => toast.success(`Rappel envoyé à ${p.patient}`)}>
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
