import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, UserPlus, MessageCircle, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge, patientTone, patientLabel } from "@/components/status-badge";
import { patients, formatDate } from "@/lib/demo-data";

export const Route = createFileRoute("/patients")({
  head: () => ({
    meta: [
      { title: "Patients — DentalPilot" },
      { name: "description", content: "CRM patients du cabinet : profils, historique, suivi et statuts." },
    ],
  }),
  component: PatientsPage,
});

function PatientsPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = patients.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q.toLowerCase()) && !p.phone.includes(q)) return false;
    if (filter !== "all" && p.status !== filter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        description={`${patients.length} patients enregistrés dans le cabinet`}
        actions={
          <Button size="sm" onClick={() => toast.success("Nouveau patient ajouté")}>
            <UserPlus className="size-4" /> Ajouter un patient
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Nom, téléphone…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList>
                <TabsTrigger value="all">Tous</TabsTrigger>
                <TabsTrigger value="active">Actifs</TabsTrigger>
                <TabsTrigger value="payment_pending">Paiement dû</TabsTrigger>
                <TabsTrigger value="recall_due">Rappel dû</TabsTrigger>
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
                  <TableHead className="hidden sm:table-cell">Dernière visite</TableHead>
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
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{p.notes ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => toast.success(`Message envoyé à ${p.name}`)}>
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
