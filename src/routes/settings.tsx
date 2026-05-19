import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Paramètres — DentalPilot" },
      { name: "description", content: "Configurez votre cabinet, vos modèles de message et les règles de rappel." },
    ],
  }),
  component: SettingsPage,
});

const recallRules = [
  { key: "scaling", label: "Détartrage", default: "6" },
  { key: "checkup", label: "Contrôle annuel", default: "12" },
  { key: "ortho", label: "Contrôle orthodontie", default: "1" },
  { key: "implant", label: "Suivi implant", default: "3" },
  { key: "post", label: "Contrôle post-traitement", default: "0.5" },
];

function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Paramètres"
        description="Configurez votre cabinet et automatisez vos communications"
        actions={<Button size="sm" onClick={() => toast.success("Paramètres enregistrés")}>Enregistrer</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informations du cabinet</CardTitle>
            <CardDescription>Affichées sur les factures et messages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Nom du cabinet</Label>
              <Input defaultValue="Cabinet Dentaire Atlas" />
            </div>
            <div className="grid gap-2">
              <Label>Dentiste principal</Label>
              <Input defaultValue="Dr. Reda Bennani" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Téléphone cabinet</Label>
                <Input defaultValue="+212 522 45 67 89" />
              </div>
              <div className="grid gap-2">
                <Label>WhatsApp</Label>
                <Input defaultValue="+212 661 23 45 67" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Lien Google Reviews</Label>
              <Input defaultValue="https://g.page/r/cabinet-atlas-casablanca/review" />
            </div>
            <div className="grid gap-2">
              <Label>Adresse</Label>
              <Input defaultValue="12 Rue Ibn Sina, Maârif — Casablanca" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modèles de messages</CardTitle>
            <CardDescription>Utilisés pour WhatsApp et SMS</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Rappel de rendez-vous</Label>
              <Textarea rows={3} defaultValue="Bonjour [Nom], nous vous rappelons votre rendez-vous au Cabinet Atlas le [Date] à [Heure]. Merci de confirmer." />
            </div>
            <div className="grid gap-2">
              <Label>Rappel de paiement</Label>
              <Textarea rows={3} defaultValue="Bonjour [Nom], nous vous remercions de bien vouloir régler le solde de [Montant] MAD pour votre traitement. Cordialement, Cabinet Atlas." />
            </div>
            <div className="grid gap-2">
              <Label>Demande d'avis Google</Label>
              <Textarea rows={3} defaultValue="Bonjour [Nom], merci pour votre visite au cabinet. Votre avis nous aide beaucoup. Vous pouvez laisser un avis ici: [Lien]" />
            </div>
            <div className="grid gap-2">
              <Label>Rappel de visite</Label>
              <Textarea rows={3} defaultValue="Bonjour [Nom], il est temps de prendre rendez-vous pour votre [Type]. Contactez-nous au 0522 45 67 89." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Règles de rappel</CardTitle>
            <CardDescription>Intervalles automatiques par type de soin (mois)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recallRules.map((r) => (
              <div key={r.key} className="flex items-center justify-between gap-3">
                <Label className="flex-1">{r.label}</Label>
                <Select defaultValue={r.default}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.5">2 semaines</SelectItem>
                    <SelectItem value="1">1 mois</SelectItem>
                    <SelectItem value="3">3 mois</SelectItem>
                    <SelectItem value="6">6 mois</SelectItem>
                    <SelectItem value="12">12 mois</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Automatisations</CardTitle>
            <CardDescription>Activez les envois automatiques</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {[
              { label: "Rappel RDV la veille (WhatsApp)", on: true },
              { label: "Demande d'avis Google après visite", on: true },
              { label: "Rappel de paiement 7 jours après échéance", on: true },
              { label: "Rappel de visite (recall) 2 semaines avant", on: true },
              { label: "Notification SMS pour les no-show", on: false },
            ].map((a, i) => (
              <div key={a.label}>
                <div className="flex items-center justify-between py-2.5">
                  <Label className="font-normal">{a.label}</Label>
                  <Switch defaultChecked={a.on} />
                </div>
                {i < 4 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
