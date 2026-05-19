import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Stethoscope, ShieldCheck, Wallet, Star } from "lucide-react";
import { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Connexion — DentalPilot" },
      { name: "description", content: "Accédez à votre tableau de bord DentalPilot pour piloter votre cabinet dentaire." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigate({ to: "/" });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-between p-6 sm:p-10">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground">
            <Stethoscope className="size-5" />
          </div>
          <span className="font-display text-lg font-semibold">DentalPilot</span>
        </Link>

        <div className="mx-auto w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-semibold tracking-tight">Bon retour 👋</h1>
            <p className="text-sm text-muted-foreground">Connectez-vous pour piloter votre cabinet dentaire.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue="dr.mgassy@cabinet-atlas.ma" required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                <a href="#" className="text-xs text-primary hover:underline">Mot de passe oublié ?</a>
              </div>
              <Input id="password" type="password" defaultValue="demo1234" required />
            </div>
            <Button type="submit" className="w-full">Se connecter</Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Nouveau cabinet ? <a href="#" className="font-medium text-primary hover:underline">Commencer l'essai gratuit</a>
          </p>
        </div>

        <p className="text-xs text-muted-foreground">© 2026 DentalPilot — Casablanca, Maroc</p>
      </div>

      <div className="relative hidden overflow-hidden bg-[image:var(--gradient-soft)] lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.7_0.12_185/0.25),transparent_50%),radial-gradient(circle_at_70%_80%,oklch(0.7_0.15_220/0.18),transparent_50%)]" />
        <div className="relative flex h-full flex-col justify-center gap-8 p-12">
          <div className="max-w-md space-y-4">
            <h2 className="font-display text-4xl font-semibold leading-tight tracking-tight">
              Pilotez votre cabinet, fidélisez vos patients.
            </h2>
            <p className="text-sm text-muted-foreground">
              DentalPilot vous aide à recouvrer les impayés, faire revenir les patients, et collecter plus d'avis Google — depuis un seul tableau de bord.
            </p>
          </div>

          <div className="grid max-w-md gap-3">
            {[
              { icon: Wallet, t: "Récupérez 30% d'impayés en plus", d: "Relances WhatsApp automatiques" },
              { icon: Star, t: "Multipliez vos avis Google par 3", d: "Demande envoyée après chaque visite" },
              { icon: ShieldCheck, t: "Conformité RGPD & médicale", d: "Vos données sécurisées au Maroc" },
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
