import { createFileRoute } from "@tanstack/react-router";

import { LoginPage } from "./login";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Connexion - AssistantDentaire" },
      { name: "description", content: "Accedez a votre tableau de bord AssistantDentaire pour piloter votre cabinet dentaire." },
    ],
  }),
  component: LoginPage,
});
