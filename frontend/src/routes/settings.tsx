import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { canManageCabinetSettings, canManageTeam, getRoleLabel } from "@/lib/roles";
import { isDemoMode, setDemoMode } from "@/lib/demoMode";
import { authApi, type AuthMe } from "@/services/authApi";
import { getCurrentCabinet, updateCurrentCabinet, type Cabinet } from "@/services/cabinetsApi";
import { getSettings, updateSetting, type SettingPayload } from "@/services/settingsApi";
import { teamApi, type TeamInvitePayload, type TeamMember } from "@/services/teamApi";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Parametres - AssistantDentaire" },
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

const DEMO_SETTINGS_STORAGE_KEY = "dentaflow_demo_settings";

const defaultClinic = {
  name: "Cabinet Dentaire Atlas",
  dentist: "Dr. Safaa M'gaassy",
  phone: "+212 522 45 67 89",
  whatsapp: "+212 661 23 45 67",
  reviewLink: "https://g.page/r/cabinet-mgassy-casablanca/review",
  address: "12 Rue Ibn Sina, Maarif - Casablanca",
  city: "Casablanca",
};

const blankClinic = {
  name: "Nouveau cabinet",
  dentist: "",
  phone: "",
  whatsapp: "",
  reviewLink: "",
  address: "",
  city: "",
};

const defaultMessages = {
  appointment: "Bonjour [Patient], nous vous rappelons votre rendez-vous au cabinet prévu le [Date] à [Heure]. Merci de confirmer votre présence.",
  payment: "Bonjour [Patient], nous vous rappelons qu’un solde de [Montant] MAD reste à régler pour votre traitement: [Traitement]. Merci de nous contacter si besoin.",
  review: "Bonjour [Patient], merci pour votre visite au cabinet. Votre avis nous aide beaucoup. Vous pouvez laisser un avis ici: [Google Review Link]. Merci beaucoup.",
  recall: "Bonjour [Patient], votre rappel de suivi dentaire est prévu pour [Type de rappel]. Nous vous invitons à contacter le cabinet pour planifier votre visite.",
  prescription: "Bonjour [Patient], votre ordonnance est prête. Veuillez joindre le PDF téléchargé avant l’envoi.",
  certificate: "Bonjour [Patient], votre certificat médical est prêt. Veuillez joindre le PDF téléchargé avant l’envoi.",
};

type ClinicSettings = typeof defaultClinic;
type MessageSettings = typeof defaultMessages;
type RecallRuleSettings = Record<string, string>;
type AutomationSettings = Record<string, boolean>;

type StoredSettings = {
  clinic?: Partial<ClinicSettings>;
  messages?: Partial<MessageSettings>;
  whatsappMode?: string;
  rules?: RecallRuleSettings;
  automations?: AutomationSettings;
};

const templateValue = (messages: MessageSettings) => ({
  appointment_reminder: messages.appointment,
  payment_reminder: messages.payment,
  review_request: messages.review,
  patient_recall: messages.recall,
  prescription: messages.prescription,
  medical_certificate: messages.certificate,
});

const messagesFromTemplateValue = (value: unknown): MessageSettings => {
  const data = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    appointment: String(data.appointment_reminder || defaultMessages.appointment),
    payment: String(data.payment_reminder || defaultMessages.payment),
    review: String(data.review_request || defaultMessages.review),
    recall: String(data.patient_recall || defaultMessages.recall),
    prescription: String(data.prescription || defaultMessages.prescription),
    certificate: String(data.medical_certificate || defaultMessages.certificate),
  };
};

const cabinetToClinic = (cabinet: Cabinet): ClinicSettings => ({
  name: cabinet.name || blankClinic.name,
  dentist: cabinet.dentist_name || blankClinic.dentist,
  phone: cabinet.phone || blankClinic.phone,
  whatsapp: cabinet.whatsapp_number || blankClinic.whatsapp,
  reviewLink: cabinet.google_review_link || blankClinic.reviewLink,
  address: cabinet.address || blankClinic.address,
  city: cabinet.city || blankClinic.city,
});

const getStoredSetting = <T,>(settings: SettingPayload[], key: string): T | undefined =>
  settings.find((setting) => setting.key === key)?.value as T | undefined;

function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<AuthMe | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isTeamLoading, setIsTeamLoading] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState<TeamInvitePayload>({
    full_name: "",
    email: "",
    role: "secretary",
  });
  const [clinic, setClinic] = useState<ClinicSettings>(blankClinic);
  const [cabinetSetupComplete, setCabinetSetupComplete] = useState(true);
  const [messages, setMessages] = useState<MessageSettings>(defaultMessages);
  const [whatsappMode, setWhatsappMode] = useState("manual");
  const [rules, setRules] = useState(Object.fromEntries(recallRules.map((r) => [r.key, r.default])));
  const [automations, setAutomations] = useState(Object.fromEntries(automationDefaults.map((a) => [a.key, a.on])));
  const [demoModeEnabled, setDemoModeEnabled] = useState(() => isDemoMode());
  const canCurrentUserManageTeam = !demoModeEnabled && canManageTeam(currentUser?.role);
  const canCurrentUserManageDemoMode = demoModeEnabled || canManageCabinetSettings(currentUser?.role);
  const canCurrentUserManageSettings = demoModeEnabled || canManageCabinetSettings(currentUser?.role);

  const loadTeam = async () => {
    setIsTeamLoading(true);
    try {
      const members = await teamApi.list();
      setTeamMembers(members);
    } catch {
      toast.error("Impossible de charger l'équipe du cabinet.");
    } finally {
      setIsTeamLoading(false);
    }
  };

  const loadDemoSettings = () => {
    const raw = window.localStorage.getItem(DEMO_SETTINGS_STORAGE_KEY);
    const stored: StoredSettings = raw ? JSON.parse(raw) : {};
    setClinic({ ...defaultClinic, ...stored.clinic });
    setMessages({ ...defaultMessages, ...stored.messages });
    setWhatsappMode(stored.whatsappMode || "manual");
    setRules({ ...Object.fromEntries(recallRules.map((r) => [r.key, r.default])), ...stored.rules });
    setAutomations({ ...Object.fromEntries(automationDefaults.map((a) => [a.key, a.on])), ...stored.automations });
    setTeamMembers([]);
    setCurrentUser(null);
    setCabinetSetupComplete(true);
  };

  const loadRealSettings = async () => {
    setIsSettingsLoading(true);
    try {
      const user = await authApi.me();
      setCurrentUser(user);
      setCabinetSetupComplete(Boolean(user.cabinet_setup_complete));

      const [cabinet, settings] = await Promise.all([
        getCurrentCabinet(),
        getSettings().catch(() => {
          toast.error("Impossible de charger les paramètres du cabinet.");
          return [];
        }),
      ]);

      setClinic(cabinetToClinic(cabinet));
      setCabinetSetupComplete(Boolean(cabinet.cabinet_setup_complete));
      setMessages(messagesFromTemplateValue(getStoredSetting(settings, "whatsapp_templates")));
      setRules({
        ...Object.fromEntries(recallRules.map((r) => [r.key, r.default])),
        ...getStoredSetting<RecallRuleSettings>(settings, "recall_rules"),
      });

      const preferences = getStoredSetting<Record<string, unknown>>(settings, "notification_preferences") || {};
      setWhatsappMode(String(preferences.whatsapp_mode || "manual"));
      setAutomations({
        ...Object.fromEntries(automationDefaults.map((a) => [a.key, a.on])),
        ...(preferences.automations as AutomationSettings | undefined),
      });

      if (canManageTeam(user.role)) loadTeam();
      else setTeamMembers([]);
    } catch {
      toast.error("Impossible de charger les paramètres du cabinet.");
    } finally {
      setIsSettingsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    if (demoModeEnabled) {
      try {
        loadDemoSettings();
      } catch {
        console.warn("Demo settings load failed");
      }
      return () => {
        active = false;
      };
    }

    loadRealSettings().then(() => {
      if (!active) return;
    });

    return () => {
      active = false;
    };
  }, [demoModeEnabled]);

  const saveSettings = async () => {
    if (!canCurrentUserManageSettings) {
      toast.error("Seul le docteur propriétaire peut modifier ces paramètres.");
      return;
    }

    if (demoModeEnabled) {
      window.localStorage.setItem(DEMO_SETTINGS_STORAGE_KEY, JSON.stringify({ clinic, messages, whatsappMode, rules, automations }));
      toast.success(`Paramètres enregistrés pour ${clinic.name}`);
      return;
    }

    setIsSavingSettings(true);
    try {
      await updateCurrentCabinet({
        name: clinic.name,
        dentist_name: clinic.dentist,
        phone: clinic.phone,
        whatsapp_number: clinic.whatsapp,
        google_review_link: clinic.reviewLink,
        address: clinic.address,
        city: clinic.city,
      });
      const refreshedUser = await authApi.me();
      setCurrentUser(refreshedUser);
      setCabinetSetupComplete(Boolean(refreshedUser.cabinet_setup_complete));
      window.dispatchEvent(new Event("assistantdentaire-cabinet-updated"));
      toast.success("Paramètres du cabinet enregistrés avec succès.");

      await updateSetting("whatsapp_templates", templateValue(messages));
      toast.success("Modèles WhatsApp enregistrés avec succès.");

      await updateSetting("recall_rules", rules);
      toast.success("Règles de rappel enregistrées avec succès.");

      await updateSetting("notification_preferences", {
        whatsapp_mode: whatsappMode,
        automations,
      });
      toast.success("Préférences enregistrées avec succès.");
    } catch {
      toast.error("Impossible d'enregistrer les paramètres.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const updateDemoMode = (enabled: boolean) => {
    setDemoMode(enabled);
    setDemoModeEnabled(enabled);
    toast.success(enabled ? "Mode démo activé." : "Mode réel activé.");
  };

  const inviteTeamMember = async () => {
    if (!inviteForm.full_name.trim() || !inviteForm.email.trim()) {
      toast.error("Nom et email sont requis.");
      return;
    }

    setIsInviting(true);
    try {
      const result = await teamApi.invite({
        full_name: inviteForm.full_name.trim(),
        email: inviteForm.email.trim(),
        role: inviteForm.role,
      });
      toast.info(result.message);
      setInviteForm({ full_name: "", email: "", role: "secretary" });
      setIsInviteOpen(false);
    } catch {
      toast.error("Invitation impossible.");
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parametres"
        description="Configurez votre cabinet et automatisez vos communications"
        actions={<Button size="sm" onClick={saveSettings} disabled={isSettingsLoading || isSavingSettings}>{isSavingSettings ? "Enregistrement..." : "Enregistrer"}</Button>}
      />

      {!demoModeEnabled && !cabinetSetupComplete && (
        <div className="rounded-md border bg-card px-4 py-3 text-sm text-muted-foreground">
          Complétez les informations de votre cabinet pour finaliser la configuration.
        </div>
      )}

      <div className="space-y-4 lg:columns-2 lg:gap-4 lg:space-y-0">
        {canCurrentUserManageDemoMode && (
          <Card className="mb-4 break-inside-avoid self-start">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle>Mode démo</CardTitle>
                  <CardDescription className="mt-1">
                    Activez ce mode pour afficher des données fictives destinées aux captures d’écran, présentations commerciales et démonstrations.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className={`shrink-0 px-2 py-0.5 text-[10px] ${demoModeEnabled ? "bg-warning/20 text-warning-foreground" : ""}`}>
                  {demoModeEnabled ? "Mode démo activé" : "Mode réel"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5">
                <Label htmlFor="demo-mode" className="font-normal">Activer le mode démo</Label>
                <Switch id="demo-mode" checked={demoModeEnabled} onCheckedChange={updateDemoMode} />
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                Les données du mode démo sont fictives et ne sont pas enregistrées dans votre compte réel.
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="mb-4 break-inside-avoid">
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
            <SettingInput label="Ville" value={clinic.city} onChange={(city) => setClinic((c) => ({ ...c, city }))} />
          </CardContent>
        </Card>

        <Card className="mb-4 break-inside-avoid">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Équipe du cabinet</CardTitle>
                <CardDescription>Gestion des docteurs et secrétaires du cabinet</CardDescription>
              </div>
              {canCurrentUserManageTeam && (
                <Button size="sm" onClick={() => setIsInviteOpen(true)}>
                  Inviter un membre
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!canCurrentUserManageTeam ? (
              <p className="text-sm text-muted-foreground">Seul le docteur propriétaire peut gérer l’équipe.</p>
            ) : isTeamLoading ? (
              <p className="text-sm text-muted-foreground">Chargement de l’équipe...</p>
            ) : teamMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun membre trouvé.</p>
            ) : (
              <div className="space-y-2">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{member.full_name || "Utilisateur"}</p>
                      <p className="truncate text-xs text-muted-foreground">{member.email || "-"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {member.created_at ? `Créé le ${new Date(member.created_at).toLocaleDateString("fr-FR")}` : "Date inconnue"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-medium">{getRoleLabel(member.role)}</p>
                      <p className="text-xs text-muted-foreground">{member.status || "Actif"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-4 break-inside-avoid">
          <CardHeader><CardTitle>Modeles de messages</CardTitle><CardDescription>Utilises pour WhatsApp et SMS</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <MessageInput label="Rappel de rendez-vous" value={messages.appointment} onChange={(appointment) => setMessages((m) => ({ ...m, appointment }))} />
            <MessageInput label="Rappel de paiement" value={messages.payment} onChange={(payment) => setMessages((m) => ({ ...m, payment }))} />
            <MessageInput label="Demande d'avis Google" value={messages.review} onChange={(review) => setMessages((m) => ({ ...m, review }))} />
            <MessageInput label="Rappel de visite" value={messages.recall} onChange={(recall) => setMessages((m) => ({ ...m, recall }))} />
          </CardContent>
        </Card>

        <Card className="mb-4 break-inside-avoid">
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

        <Card className="mb-4 break-inside-avoid">
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

        <Card className="mb-4 break-inside-avoid">
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

        <Card className="mb-4 break-inside-avoid">
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

      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Inviter un membre</DialogTitle>
            <DialogDescription>Préparez l'invitation d'un docteur ou d'une secrétaire médicale.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="invite-name">Nom complet</Label>
              <Input id="invite-name" value={inviteForm.full_name} onChange={(e) => setInviteForm((form) => ({ ...form, full_name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input id="invite-email" type="email" value={inviteForm.email} onChange={(e) => setInviteForm((form) => ({ ...form, email: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Rôle</Label>
              <Select value={inviteForm.role} onValueChange={(role) => setInviteForm((form) => ({ ...form, role: role as TeamInvitePayload["role"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="doctor">Docteur</SelectItem>
                  <SelectItem value="secretary">Secrétaire médicale</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteOpen(false)}>Annuler</Button>
            <Button onClick={inviteTeamMember} disabled={isInviting}>Inviter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
