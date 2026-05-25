import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { reviews, formatDate, type ReviewRequest } from "@/lib/demo-data";
import { todayISO } from "@/lib/date-utils";
import { fillWhatsAppTemplate, openWhatsAppMessage, whatsappTemplates } from "@/lib/whatsapp";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Avis Google - DentalPilot" },
      { name: "description", content: "Automatisez vos demandes d'avis Google et suivez votre reputation en ligne." },
    ],
  }),
  component: ReviewsPage,
});

function ReviewsPage() {
  const [rows, setRows] = useState<ReviewRequest[]>(reviews);
  const [reviewLink, setReviewLink] = useState("https://g.page/r/cabinet-atlas-casablanca/review");
  const [template, setTemplate] = useState(whatsappTemplates.review);
  const sent = rows.filter((r) => r.status !== "not_sent").length;
  const received = rows.filter((r) => r.status === "reviewed").length;
  const rate = sent > 0 ? Math.round((received / sent) * 100) : 0;

  const sendReview = (id: string) => {
    const request = rows.find((r) => r.id === id);
    const message = fillWhatsAppTemplate(template, {
      Patient: request?.patient,
      "Google Review Link": reviewLink,
      Nom: request?.patient,
      Lien: reviewLink,
    });
    if (!openWhatsAppMessage(request?.phone, message)) return;
    setRows((current) =>
      current.map((r) => (r.id === id && r.status === "not_sent" ? { ...r, status: "sent", sentAt: todayISO() } : r)),
    );
  };

  const sendAll = () => {
    const pendingRows = rows.filter((r) => r.status === "not_sent");
    pendingRows.forEach((request) => {
      const message = fillWhatsAppTemplate(template, {
        Patient: request.patient,
        "Google Review Link": reviewLink,
        Nom: request.patient,
        Lien: reviewLink,
      });
      openWhatsAppMessage(request.phone, message);
    });
    setRows((current) => current.map((r) => (r.status === "not_sent" ? { ...r, status: "sent", sentAt: todayISO() } : r)));
    toast.success(`${pendingRows.length} demandes préparées`);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard?.writeText(reviewLink);
      toast.success("Lien copie");
    } catch {
      toast.error("Copie indisponible dans ce navigateur");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Avis Google"
        description="Automatisez vos demandes d'avis et boostez votre visibilite"
        actions={
          <Button size="sm" onClick={sendAll}>
            <Send className="size-4" /> Envoyer en masse
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Demandes envoyees" value={String(sent)} icon={<Send className="size-5" />} accent="info" />
        <StatCard label="Avis recus" value={String(received)} icon={<Star className="size-5" />} accent="warning" />
        <StatCard label="Taux de conversion" value={`${rate}%`} trend="+8% ce mois" trendTone="up" icon={<TrendingUp className="size-5" />} accent="success" />
        <StatCard label="Note moyenne" value="4.9 etoiles" hint="sur 87 avis Google" icon={<Star className="size-5" />} accent="primary" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Demandes d'avis</CardTitle>
            <CardDescription>Patients recents et statut des demandes</CardDescription>
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
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.patient}</div>
                      <div className="text-xs text-muted-foreground">{r.phone}</div>
                      {r.sentAt && <div className="text-xs text-muted-foreground">Envoye le {formatDate(r.sentAt)}</div>}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{formatDate(r.visitDate)}</TableCell>
                    <TableCell><StatusBadge tone={reviewTone(r.status)}>{reviewLabel(r.status)}</StatusBadge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => sendReview(r.id)}>
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
              <CardDescription>Utilise dans toutes les demandes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={reviewLink} onChange={(e) => setReviewLink(e.target.value)} className="pl-9 text-xs" />
                </div>
                <Button size="icon" variant="outline" onClick={copyLink}>
                  <Copy className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Modele de message</CardTitle>
              <CardDescription>Personnalisez le message envoye</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label className="text-xs text-muted-foreground">WhatsApp</Label>
              <Textarea value={template} onChange={(e) => setTemplate(e.target.value)} rows={5} className="text-xs" />
              <Button size="sm" className="w-full" onClick={() => toast.success("Modele enregistre")}>Enregistrer</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
