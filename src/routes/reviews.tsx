import { createFileRoute } from "@tanstack/react-router";
import { Star, Send, Link2, MessageCircle, TrendingUp, Copy } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, StatCard } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge, reviewTone, reviewLabel } from "@/components/status-badge";
import { reviews, formatDate } from "@/lib/demo-data";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Avis Google — DentalPilot" },
      { name: "description", content: "Automatisez vos demandes d'avis Google et suivez votre réputation en ligne." },
    ],
  }),
  component: ReviewsPage,
});

function ReviewsPage() {
  const sent = reviews.filter((r) => r.status !== "not_sent").length;
  const received = reviews.filter((r) => r.status === "reviewed").length;
  const rate = sent > 0 ? Math.round((received / sent) * 100) : 0;
  const reviewLink = "https://g.page/r/cabinet-atlas-casablanca/review";
  const template = `Bonjour [Nom], merci pour votre visite au cabinet. Votre avis nous aide beaucoup. Vous pouvez laisser un avis ici: ${reviewLink}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Avis Google"
        description="Automatisez vos demandes d'avis et boostez votre visibilité"
        actions={
          <Button size="sm" onClick={() => toast.success("Demande envoyée à tous les patients du jour")}>
            <Send className="size-4" /> Envoyer en masse
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Demandes envoyées" value={String(sent)} icon={<Send className="size-5" />} accent="info" />
        <StatCard label="Avis reçus" value={String(received)} icon={<Star className="size-5" />} accent="warning" />
        <StatCard label="Taux de conversion" value={`${rate}%`} trend="+8% ce mois" trendTone="up" icon={<TrendingUp className="size-5" />} accent="success" />
        <StatCard label="Note moyenne" value="4.9 ★" hint="sur 87 avis Google" icon={<Star className="size-5" />} accent="primary" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Demandes d'avis</CardTitle>
            <CardDescription>Patients récents et statut des demandes</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden sm:table-cell">Visite</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.patient}</div>
                      <div className="text-xs text-muted-foreground">{r.phone}</div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{formatDate(r.visitDate)}</TableCell>
                    <TableCell><StatusBadge tone={reviewTone(r.status)}>{reviewLabel(r.status)}</StatusBadge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => toast.success(`Lien d'avis envoyé à ${r.patient}`)}>
                        <MessageCircle className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lien Google Reviews</CardTitle>
              <CardDescription>Utilisé dans toutes les demandes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input defaultValue={reviewLink} className="pl-9 text-xs" />
                </div>
                <Button size="icon" variant="outline" onClick={() => { navigator.clipboard?.writeText(reviewLink); toast.success("Lien copié"); }}>
                  <Copy className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Modèle de message</CardTitle>
              <CardDescription>Personnalisez le message envoyé</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label className="text-xs text-muted-foreground">WhatsApp</Label>
              <Textarea defaultValue={template} rows={5} className="text-xs" />
              <Button size="sm" className="w-full" onClick={() => toast.success("Modèle enregistré")}>Enregistrer</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
