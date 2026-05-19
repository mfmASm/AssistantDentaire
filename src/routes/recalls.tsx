import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, BellRing, MessageCircle, CalendarPlus, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, StatCard } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge, recallTone, recallLabel } from "@/components/status-badge";
import { recalls, formatDate } from "@/lib/demo-data";

export const Route = createFileRoute("/recalls")({
  head: () => ({
    meta: [
      { title: "Rappels patients — DentalPilot" },
      { name: "description", content: "Système de rappels intelligent : détartrages, contrôles, suivis orthodontiques et implants." },
    ],
  }),
  component: RecallsPage,
});

const rules = [
  { label: "Détartrage", interval: "Tous les 6 mois" },
  { label: "Contrôle annuel", interval: "Tous les 12 mois" },
  { label: "Contrôle orthodontie", interval: "Tous les mois" },
  { label: "Suivi implant", interval: "1, 3 et 6 mois" },
  { label: "Contrôle post-traitement", interval: "2 semaines après" },
  { label: "Contrôle enfant", interval: "Tous les 6 mois" },
];

function RecallsPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = recalls.filter((r) => {
    if (q && !r.patient.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter !== "all" && r.status !== filter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rappels patients"
        description="Faites revenir vos patients automatiquement"
        actions={
          <Button size="sm" onClick={() => toast.success("Rappel créé")}>
            <CalendarPlus className="size-4" /> Nouveau rappel
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Planifiés" value={String(recalls.filter(r => r.status === "scheduled").length)} icon={<BellRing className="size-5" />} accent="info" />
        <StatCard label="Bientôt dus" value={String(recalls.filter(r => r.status === "due_soon").length)} icon={<Clock className="size-5" />} accent="warning" />
        <StatCard label="En retard" value={String(recalls.filter(r => r.status === "overdue").length)} icon={<AlertTriangle className="size-5" />} accent="danger" />
        <StatCard label="Terminés ce mois" value="14" icon={<CheckCircle2 className="size-5" />} accent="success" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
              </div>
              <Tabs value={filter} onValueChange={setFilter}>
                <TabsList>
                  <TabsTrigger value="all">Tous</TabsTrigger>
                  <TabsTrigger value="overdue">En retard</TabsTrigger>
                  <TabsTrigger value="due_soon">Bientôt</TabsTrigger>
                  <TabsTrigger value="scheduled">Planifiés</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden md:table-cell">Dernière visite</TableHead>
                    <TableHead>Prochain rappel</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.patient}</div>
                        <div className="text-xs text-muted-foreground">{r.phone}</div>
                      </TableCell>
                      <TableCell className="text-sm">{r.type}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDate(r.lastVisit)}</TableCell>
                      <TableCell className="text-sm font-medium">{formatDate(r.nextRecall)}</TableCell>
                      <TableCell><StatusBadge tone={recallTone(r.status)}>{recallLabel(r.status)}</StatusBadge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => toast.success(`Rappel WhatsApp envoyé à ${r.patient}`)}>
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

        <Card>
          <CardHeader>
            <CardTitle>Règles de rappel</CardTitle>
            <CardDescription>Modèles intelligents activés</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {rules.map((r) => (
              <div key={r.label} className="flex items-center justify-between rounded-xl border bg-background/50 p-3">
                <div>
                  <p className="text-sm font-medium">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.interval}</p>
                </div>
                <div className="size-2 rounded-full bg-success" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
