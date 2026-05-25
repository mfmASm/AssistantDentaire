import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { whatsappTemplates } from "@/lib/whatsapp";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Parametres - DentalPilot" },
      { name: "description", content: "Configurez votre cabinet, vos modeles de message et les regles de rappel." },
    ],
  }),
  component: SettingsPage,
});

const recallRules = [
  { key: "scaling", label: "Detartrage", default: "6" },
  { key: "checkup", label: "Controle annuel", default: "12" },
  { key: "ortho", label: "Controle orthodontie", default: "1" },
  { key: "implant", label: "Suivi implant", default: "3" },
  { key: "post", label: "Controle post-traitement", default: "0.5" },
];

const automationDefaults = [
  { key: "appointment", label: "Rappel RDV la veille (WhatsApp)", on: true },
  { key: "review", label: "Demande d'avis Google apres visite", on: true },
  { key: "payment", label: "Rappel de paiement 7 jours apres echeance", on: true },
  { key: "recall", label: "Rappel de visite (recall) 2 semaines avant", on: true },
  { key: "noshow", label: "Notification SMS pour les no-show", on: false },
];

function SettingsPage() {
  const [clinic, setClinic] = useState({
    name: "Cabinet Dentaire Atlas",
    dentist: "Dr. Safaa M'gaassy",
    phone: "+212 522 45 67 89",
    whatsapp: "+212 661 23 45 67",
    reviewLink: "https://g.page/r/cabinet-mgassy-casablanca/review",
    address: "12 Rue Ibn Sina, Maarif - Casablanca",
  });
  const [messages, setMessages] = useState({
    appointment: whatsappTemplates.appointment,
    payment: whatsappTemplates.payment,
    review: whatsappTemplates.review,
    recall: whatsappTemplates.recall,
    prescription: whatsappTemplates.prescription,
    certificate: whatsappTemplates.certificate,
  });
  const [whatsappMode, setWhatsappMode] = useState("manual");
  const [rules, setRules] = useState(Object.fromEntries(recallRules.map((r) => [r.key, r.default])));
  const [automations, setAutomations] = useState(Object.fromEntries(automationDefaults.map((a) => [a.key, a.on])));

  const saveSettings = () => {
    toast.success(`Parametres enregistres pour ${clinic.name}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parametres"
        description="Configurez votre cabinet et automatisez vos communications"
        actions={<Button size="sm" onClick={saveSettings}>Enregistrer</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Informations du cabinet</CardTitle><CardDescription>Affichees sur les factures et messages</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <SettingInput label="Nom du cabinet" value={clinic.name} onChange={(name) => setClinic((c) => ({ ...c, name }))} />
            <SettingInput label="Dentiste principal" value={clinic.dentist} onChange={(dentist) => setClinic((c) => ({ ...c, dentist }))} />
            <div className="grid gap-4 sm:grid-cols-2">
              <SettingInput label="Telephone cabinet" value={clinic.phone} onChange={(phone) => setClinic((c) => ({ ...c, phone }))} />
              <SettingInput label="WhatsApp" value={clinic.whatsapp} onChange={(whatsapp) => setClinic((c) => ({ ...c, whatsapp }))} />
            </div>
            <SettingInput label="Lien Google Reviews" value={clinic.reviewLink} onChange={(reviewLink) => setClinic((c) => ({ ...c, reviewLink }))} />
            <SettingInput label="Adresse" value={clinic.address} onChange={(address) => setClinic((c) => ({ ...c, address }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Modeles de messages</CardTitle><CardDescription>Utilises pour WhatsApp et SMS</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <MessageInput label="Rappel de rendez-vous" value={messages.appointment} onChange={(appointment) => setMessages((m) => ({ ...m, appointment }))} />
            <MessageInput label="Rappel de paiement" value={messages.payment} onChange={(payment) => setMessages((m) => ({ ...m, payment }))} />
            <MessageInput label="Demande d'avis Google" value={messages.review} onChange={(review) => setMessages((m) => ({ ...m, review }))} />
            <MessageInput label="Rappel de visite" value={messages.recall} onChange={(recall) => setMessages((m) => ({ ...m, recall }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>WhatsApp</CardTitle>
            <CardDescription>Configurez le mode d’envoi WhatsApp du cabinet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingInput label="Numéro WhatsApp du cabinet" value={clinic.whatsapp} onChange={(whatsapp) => setClinic((c) => ({ ...c, whatsapp }))} />
            <div className="grid gap-2">
              <Label>Mode d’envoi WhatsApp</Label>
              <Select value={whatsappMode} onValueChange={setWhatsappMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manuel via WhatsApp Web</SelectItem>
                  <SelectItem value="cloud" disabled>Automatique via WhatsApp Cloud API bientôt disponible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <MessageInput label="Rappel rendez-vous" value={messages.appointment} onChange={(appointment) => setMessages((m) => ({ ...m, appointment }))} />
            <MessageInput label="Relance paiement" value={messages.payment} onChange={(payment) => setMessages((m) => ({ ...m, payment }))} />
            <MessageInput label="Demande avis Google" value={messages.review} onChange={(review) => setMessages((m) => ({ ...m, review }))} />
            <MessageInput label="Rappel patient" value={messages.recall} onChange={(recall) => setMessages((m) => ({ ...m, recall }))} />
            <MessageInput label="Ordonnance" value={messages.prescription} onChange={(prescription) => setMessages((m) => ({ ...m, prescription }))} />
            <MessageInput label="Certificat médical" value={messages.certificate} onChange={(certificate) => setMessages((m) => ({ ...m, certificate }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Automatisation WhatsApp Cloud API</CardTitle>
            <CardDescription>
              L’envoi automatique des messages, des PDFs, le suivi livré/lu et la réception des réponses patients seront disponibles via WhatsApp Cloud API dans une prochaine version.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingInput label="Phone Number ID" value="Bientôt disponible" onChange={() => undefined} disabled />
            <SettingInput label="Access Token" value="Bientôt disponible" onChange={() => undefined} disabled />
            <SettingInput label="Webhook URL" value="Bientôt disponible" onChange={() => undefined} disabled />
            <SettingInput label="Verify Token" value="Bientôt disponible" onChange={() => undefined} disabled />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Regles de rappel</CardTitle><CardDescription>Intervalles automatiques par type de soin (mois)</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {recallRules.map((r) => (
              <div key={r.key} className="flex items-center justify-between gap-3">
                <Label className="flex-1">{r.label}</Label>
                <Select value={rules[r.key]} onValueChange={(value) => setRules((current) => ({ ...current, [r.key]: value }))}>
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
          <CardHeader><CardTitle>Automatisations</CardTitle><CardDescription>Activez les envois automatiques</CardDescription></CardHeader>
          <CardContent className="space-y-1">
            {automationDefaults.map((a, i) => (
              <div key={a.key}>
                <div className="flex items-center justify-between py-2.5">
                  <Label className="font-normal">{a.label}</Label>
                  <Switch checked={automations[a.key]} onCheckedChange={(checked) => setAutomations((current) => ({ ...current, [a.key]: checked }))} />
                </div>
                {i < automationDefaults.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SettingInput({ label, value, onChange, disabled }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
    </div>
  );
}

function MessageInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
