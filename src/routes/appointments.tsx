import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarPlus, MessageCircle, Search } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, StatCard } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge, apptTone, apptLabel, paymentTone, paymentLabel } from "@/components/status-badge";
import { appointments } from "@/lib/demo-data";
import { CalendarDays, CheckCircle2, Clock, UserX } from "lucide-react";

export const Route = createFileRoute("/appointments")({
  head: () => ({
    meta: [
      { title: "Rendez-vous — DentalPilot" },
      { name: "description", content: "Vue quotidienne des rendez-vous du cabinet dentaire avec statuts et actions rapides." },
    ],
  }),
  component: AppointmentsPage,
});

function AppointmentsPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const filtered = appointments.filter((a) => {
    if (q && !a.patient.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter !== "all" && a.status !== filter) return false;
    return true;
  });

  const counts = {
    confirmed: appointments.filter((a) => a.status === "confirmed").length,
    completed: appointments.filter((a) => a.status === "completed").length,
    waiting: appointments.filter((a) => a.status === "waiting").length,
    no_show: appointments.filter((a) => a.status === "no_show").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rendez-vous"
        description="Planning du jour — lundi 18 mai 2026"
        actions={
          <Button size="sm" onClick={() => toast.success("Nouveau RDV créé")}>
            <CalendarPlus className="size-4" /> Nouveau RDV
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Confirmés" value={String(counts.confirmed)} icon={<CalendarDays className="size-5" />} accent="info" />
        <StatCard label="Terminés" value={String(counts.completed)} icon={<CheckCircle2 className="size-5" />} accent="success" />
        <StatCard label="En salle d'attente" value={String(counts.waiting)} icon={<Clock className="size-5" />} accent="warning" />
        <StatCard label="Absents" value={String(counts.no_show)} icon={<UserX className="size-5" />} accent="danger" />
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher un patient…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList>
                <TabsTrigger value="all">Tous</TabsTrigger>
                <TabsTrigger value="confirmed">Confirmés</TabsTrigger>
                <TabsTrigger value="waiting">En attente</TabsTrigger>
                <TabsTrigger value="completed">Terminés</TabsTrigger>
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
                      {a.followUp ? <StatusBadge tone="warning">À recontacter</StatusBadge> : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => toast.success(`WhatsApp envoyé à ${a.patient}`)}>
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
