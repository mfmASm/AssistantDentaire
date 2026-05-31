import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Eye, EyeOff, ShieldCheck, Wallet, Star } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isDemoMode } from "@/lib/demoMode";
import { REMEMBER_SESSION_KEY, SAVED_EMAIL_KEY, SupabaseAuthError } from "@/lib/supabase";
import { authApi, type AuthMe } from "@/services/authApi";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Connexion - AssistantDentaire" },
      { name: "description", content: "Accedez a votre tableau de bord AssistantDentaire pour piloter votre cabinet dentaire." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberSession, setRememberSession] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const loginButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    const savedEmail = window.localStorage.getItem(SAVED_EMAIL_KEY);
    const savedRememberPreference = window.localStorage.getItem(REMEMBER_SESSION_KEY) === "true";

    if (savedEmail) setEmail(savedEmail);
    setRememberSession(savedRememberPreference);

    authApi.session()
      .then(async (session) => {
        if (!session?.access_token) return;
        try {
          const user = await authApi.ensureOnboarded();
          if (active) navigateAfterAuth(user);
        } catch {
          await authApi.logout();
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateCredentials()) return;
    setIsSubmitting(true);
    try {
      saveRememberPreference();
      await authApi.signIn(email, password);
      const user = await authApi.me();
      saveEmailPreference();
      toast.success("Connexion reussie");
      navigateAfterAuth(user);
    } catch (error) {
      toast.error(getFriendlyAuthError(error, "login"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSignUp = async () => {
    if (!validateCredentials({ requireStrongPassword: true })) return;
    setIsSubmitting(true);
    try {
      saveRememberPreference();
      const session = await authApi.signUp(email, password);
      saveEmailPreference();
      if (session.access_token) {
        const user = await authApi.me();
        toast.success("Essai gratuit cree. Vous pouvez continuer.");
        navigateAfterAuth(user);
      } else {
        toast.success("Compte cree. Verifiez votre email avant de vous connecter.");
      }
    } catch (error) {
      const message = getFriendlyAuthError(error, "signup");
      toast.error(message);
      if (isExistingUserError(error)) {
        window.setTimeout(() => loginButtonRef.current?.focus(), 0);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateCredentials = (options: { requireStrongPassword?: boolean } = {}) => {
    if (!email.trim()) {
      toast.error("Veuillez saisir votre email.");
      return false;
    }

    if (!password) {
      toast.error("Veuillez saisir votre mot de passe.");
      return false;
    }

    if (options.requireStrongPassword && password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères.");
      return false;
    }

    return true;
  };

  const saveRememberPreference = () => {
    window.localStorage.setItem(REMEMBER_SESSION_KEY, rememberSession ? "true" : "false");
    if (!rememberSession) {
      window.localStorage.removeItem(SAVED_EMAIL_KEY);
    }
  };

  const saveEmailPreference = () => {
    if (rememberSession) {
      window.localStorage.setItem(SAVED_EMAIL_KEY, email.trim());
    } else {
      window.localStorage.removeItem(SAVED_EMAIL_KEY);
    }
  };

  const navigateAfterAuth = (user: AuthMe) => {
    navigate({ to: !isDemoMode() && !user.cabinet_setup_complete ? "/settings" : "/" });
  };

  return (
    <div className="grid min-h-screen overflow-x-hidden lg:grid-cols-2">
      <div className="flex min-w-0 flex-col justify-between gap-8 p-4 sm:p-10">
        <Link to="/" className="flex items-center gap-2.5">
          <BrandMark />
          <span className="font-display text-lg font-semibold">AssistantDentaire</span>
        </Link>

        <div className="mx-auto w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-semibold tracking-tight">Bon retour</h1>
            <p className="text-sm text-muted-foreground">Connectez-vous pour piloter votre cabinet dentaire.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                <button type="button" className="text-xs text-primary hover:underline" onClick={() => toast.info("Lien de reinitialisation envoye a votre email")}>
                  Mot de passe oublie ?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Votre mot de passe"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
              <Checkbox
                id="remember-session"
                checked={rememberSession}
                onCheckedChange={(checked) => setRememberSession(checked === true)}
                className="mt-0.5"
              />
              <div className="space-y-0.5 leading-none">
                <Label htmlFor="remember-session" className="text-sm font-medium">
                  Garder ma session ouverte
                </Label>
                <p className="text-xs text-muted-foreground">Recommandé sur votre ordinateur personnel uniquement.</p>
              </div>
            </div>
            <Button ref={loginButtonRef} type="submit" className="w-full" disabled={isSubmitting}>Se connecter</Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Nouveau cabinet ?{" "}
            <button type="button" className="font-medium text-primary hover:underline" onClick={onSignUp} disabled={isSubmitting}>
              Commencer l'essai gratuit
            </button>
          </p>
        </div>

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>© 2026 AssistantDentaire - Solution pour cabinets dentaires. Tous droits réservés.</span>
        </p>
      </div>

      <div className="relative hidden overflow-hidden bg-[image:var(--gradient-soft)] lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.7_0.12_185/0.25),transparent_50%),radial-gradient(circle_at_70%_80%,oklch(0.7_0.15_220/0.18),transparent_50%)]" />
        <div className="relative flex h-full flex-col justify-center gap-8 p-12">
          <div className="max-w-md space-y-4">
            <h2 className="font-display text-4xl font-semibold leading-tight tracking-tight">
              Pilotez votre cabinet, fidelisez vos patients.
            </h2>
            <p className="text-sm text-muted-foreground">
              AssistantDentaire vous aide a recouvrer les impayes, faire revenir les patients, et collecter plus d'avis Google depuis un seul tableau de bord.
            </p>
          </div>

          <div className="grid max-w-md gap-3">
            {[
              { icon: Wallet, t: "Recuperez 30% d'impayes en plus", d: "Relances WhatsApp automatiques" },
              { icon: Star, t: "Multipliez vos avis Google par 3", d: "Demande envoyee apres chaque visite" },
              { icon: ShieldCheck, t: "Conformite RGPD & medicale", d: "Vos donnees securisees au Maroc" },
            ].map((f) => (
              <div key={f.t} className="flex items-start gap-3 rounded-2xl border bg-card/60 p-4 backdrop-blur">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{f.t}</p>
                  <p className="text-xs text-muted-foreground">{f.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getFriendlyAuthError(error: unknown, mode: "login" | "signup") {
  if (isMissingSupabaseEnvError(error)) return "Configuration Supabase manquante.";
  if (isInvalidEmailError(error)) return "Veuillez saisir une adresse email valide.";
  if (isWeakPasswordError(error)) return "Le mot de passe doit contenir au moins 6 caractères.";
  if (isExistingUserError(error)) return "Un compte existe déjà avec cet email. Veuillez vous connecter.";
  if (isEmailConfirmationRequired(error)) return "Compte créé. Veuillez confirmer votre email avant de vous connecter.";
  return mode === "signup" ? "Creation du compte impossible." : "Connexion impossible. Verifiez vos identifiants.";
}

function getAuthErrorText(error: unknown) {
  if (error instanceof SupabaseAuthError) {
    return `${error.errorCode || ""} ${error.message}`.toLowerCase();
  }
  if (error instanceof Error) return error.message.toLowerCase();
  return String(error || "").toLowerCase();
}

function isMissingSupabaseEnvError(error: unknown) {
  return error instanceof SupabaseAuthError && error.errorCode === "missing_supabase_env";
}

function isExistingUserError(error: unknown) {
  const text = getAuthErrorText(error);
  return text.includes("user_already_exists") || text.includes("user already registered");
}

function isWeakPasswordError(error: unknown) {
  const text = getAuthErrorText(error);
  return text.includes("weak_password") || text.includes("password") && text.includes("6");
}

function isInvalidEmailError(error: unknown) {
  const text = getAuthErrorText(error);
  return text.includes("invalid_email") || text.includes("invalid email") || text.includes("email address is invalid");
}

function isEmailConfirmationRequired(error: unknown) {
  const text = getAuthErrorText(error);
  return text.includes("email not confirmed") || text.includes("email confirmation") || text.includes("confirm your email");
}
