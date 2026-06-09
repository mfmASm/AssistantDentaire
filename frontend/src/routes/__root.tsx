import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, ChevronDown, LogOut, Search, Settings } from "lucide-react";
import { toast } from "sonner";
import { getNotifications, type AppNotification } from "@/lib/notifications";
import { getRoleLabel } from "@/lib/roles";
import { DEMO_MODE_EVENT, isDemoMode } from "@/lib/demoMode";
import { REMEMBER_SESSION_KEY, SAVED_EMAIL_KEY } from "@/lib/supabase";
import { setWhatsAppCabinetContext } from "@/lib/whatsapp";
import { AUTH_ME_QUERY_KEY, authApi, type AuthMe } from "@/services/authApi";
import { DASHBOARD_SUMMARY_QUERY_KEY, getDashboardSummary, type DashboardSummary } from "@/services/dashboardApi";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-semibold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">Cette page n'existe pas ou a été déplacée.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Une erreur est survenue</h1>
        <p className="mt-2 text-sm text-muted-foreground">Essayez de recharger la page.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={() => { router.invalidate(); reset(); }}>Réessayer</Button>
          <a href="/" className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">Accueil</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AssistantDentaire — Gestion intelligente des cabinets dentaires" },
      { name: "description", content: "AssistantDentaire aide les cabinets dentaires à recouvrer les impayés, faire revenir les patients et obtenir plus d'avis Google depuis un seul tableau de bord." },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function AppShell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isAuthPage = pathname === "/" || pathname === "/login";
  const isPublicPage = isAuthPage || pathname === "/sitemap.xml";
  const demoNotifications = useMemo(() => getNotifications(), []);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [loadingLabel, setLoadingLabel] = useState("Chargement de votre espace…");
  const [showServerInitMessage, setShowServerInitMessage] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthMe | null>(null);
  const [demoMode, setDemoModeState] = useState(() => isDemoMode());

  const dashboardSummaryQuery = useQuery({
    queryKey: DASHBOARD_SUMMARY_QUERY_KEY,
    queryFn: getDashboardSummary,
    enabled: !demoMode && isAuthorized && !isPublicPage,
    staleTime: 30_000,
    retry: 1,
  });

  useEffect(() => {
    let active = true;

    const checkAuth = async () => {
      if (active) {
        setLoadingLabel("Chargement de votre espace…");
        setIsCheckingAuth(true);
      }
      try {
        const session = await authApi.session();

        if (isAuthPage) {
          if (active) {
            setIsAuthorized(true);
            setIsCheckingAuth(false);
          }
          return;
        }

        if (isPublicPage) {
          if (active) {
            setIsAuthorized(true);
            setIsCheckingAuth(false);
          }
          return;
        }

        if (!session?.access_token) {
          if (active) {
            setCurrentUser(null);
            setIsAuthorized(false);
            setIsCheckingAuth(false);
          }
          queryClient.removeQueries({ queryKey: AUTH_ME_QUERY_KEY });
          queryClient.removeQueries({ queryKey: DASHBOARD_SUMMARY_QUERY_KEY });
          router.navigate({ to: "/login" });
          return;
        }

        const cachedUser = queryClient.getQueryData<AuthMe>(AUTH_ME_QUERY_KEY);
        const user = cachedUser ?? await authApi.ensureOnboarded();
        queryClient.setQueryData(AUTH_ME_QUERY_KEY, user);
        syncWhatsAppCabinetContext(user);
        if (active) {
          setCurrentUser(user);
          setIsAuthorized(true);
          setIsCheckingAuth(false);
        }
        if (active && !demoMode && !user.cabinet_setup_complete && pathname !== "/settings") {
          router.navigate({ to: "/settings" });
        }
      } catch {
        await authApi.logout();
        queryClient.removeQueries({ queryKey: AUTH_ME_QUERY_KEY });
        queryClient.removeQueries({ queryKey: DASHBOARD_SUMMARY_QUERY_KEY });
        if (active) {
          setCurrentUser(null);
          setIsAuthorized(false);
          setIsCheckingAuth(false);
        }
        if (!isAuthPage) router.navigate({ to: "/login" });
      }
    };

    checkAuth();

    return () => {
      active = false;
    };
  }, [demoMode, isAuthPage, isPublicPage, pathname, queryClient, router]);

  useEffect(() => {
    if (!isCheckingAuth || isPublicPage) {
      setShowServerInitMessage(false);
      return;
    }

    const timeoutId = window.setTimeout(() => setShowServerInitMessage(true), 4_000);
    return () => window.clearTimeout(timeoutId);
  }, [isCheckingAuth, isPublicPage]);

  useEffect(() => {
    if (isPublicPage) return;
    const refreshCurrentUser = () => {
      authApi.me()
        .then((user) => {
          queryClient.setQueryData(AUTH_ME_QUERY_KEY, user);
          setCurrentUser(user);
        })
        .catch(() => undefined);
    };
    window.addEventListener("assistantdentaire-cabinet-updated", refreshCurrentUser);
    return () => window.removeEventListener("assistantdentaire-cabinet-updated", refreshCurrentUser);
  }, [isPublicPage, queryClient]);

  useEffect(() => {
    const updateDemoMode = () => setDemoModeState(isDemoMode());
    window.addEventListener(DEMO_MODE_EVENT, updateDemoMode);
    window.addEventListener("storage", updateDemoMode);
    return () => {
      window.removeEventListener(DEMO_MODE_EVENT, updateDemoMode);
      window.removeEventListener("storage", updateDemoMode);
    };
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("dentalpilot-read-notifications");
      if (stored) setReadNotificationIds(JSON.parse(stored));
    } catch {
      setReadNotificationIds([]);
    }
  }, []);

  const realNotifications = dashboardSummaryQuery.data ? buildRealNotifications(dashboardSummaryQuery.data) : [];
  const notifications = demoMode ? demoNotifications : realNotifications;
  const unreadNotifications = notifications.filter((notification) => !readNotificationIds.includes(notification.id));
  const notificationCount = unreadNotifications.length;

  const markNotificationsRead = () => {
    const nextIds = Array.from(new Set([...readNotificationIds, ...notifications.map((notification) => notification.id)]));
    setReadNotificationIds(nextIds);
    try {
      window.localStorage.setItem("dentalpilot-read-notifications", JSON.stringify(nextIds));
    } catch {
      // Local storage can be unavailable in private or locked-down browsers.
    }
    toast.info("Notifications marquees comme lues");
  };

  const handleLogout = async () => {
    const shouldKeepSavedEmail = window.localStorage.getItem(REMEMBER_SESSION_KEY) === "true";
    await authApi.logout();
    queryClient.removeQueries({ queryKey: AUTH_ME_QUERY_KEY });
    queryClient.removeQueries({ queryKey: DASHBOARD_SUMMARY_QUERY_KEY });
    setWhatsAppCabinetContext(null);
    if (!shouldKeepSavedEmail) {
      window.localStorage.removeItem(SAVED_EMAIL_KEY);
    }
    setCurrentUser(null);
    setIsAuthorized(false);
    toast.success("Déconnexion réussie.");
    router.navigate({ to: "/login" });
  };

  const userName = getUserName(currentUser);
  const userInitials = getUserInitials(userName);
  const userEmail = currentUser?.email || "email@assistantdentaire.ma";
  const cabinetName = getCabinetName(currentUser);
  const roleLabel = getRoleLabel(currentUser?.role);

  if (isAuthPage) return <Outlet />;
  if (!isPublicPage && isCheckingAuth) return <LoadingState label={loadingLabel} showServerInitMessage={showServerInitMessage} />;
  if (!isPublicPage && !isAuthorized) return <LoadingState label="Chargement de votre espace…" showServerInitMessage={showServerInitMessage} />;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden bg-background">
        <AppSidebar currentUser={currentUser} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-3 backdrop-blur sm:px-6">
            <SidebarTrigger className="shrink-0" />
            <div className="relative hidden flex-1 max-w-md md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher un patient, un paiement…" className="h-9 pl-9" />
            </div>
            <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
              {demoMode && <Badge variant="secondary" className="max-w-[7rem] shrink truncate bg-warning/20 text-warning-foreground sm:max-w-none">Mode démo</Badge>}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative" aria-label={`${notificationCount} notifications non lues`}>
                    <Bell className="size-4" />
                    {notificationCount > 0 && (
                      <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-destructive-foreground">
                        {notificationCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[min(calc(100vw-2rem),24rem)] p-0">
                  <div className="flex items-center justify-between gap-3 border-b p-4">
                    <div>
                      <p className="text-sm font-semibold">Notifications</p>
                      <p className="text-xs text-muted-foreground">{notificationCount} non lues sur {notifications.length}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={markNotificationsRead} disabled={notificationCount === 0}>
                      Tout lire
                    </Button>
                  </div>
                  <div className="max-h-96 overflow-y-auto p-2">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground">Aucune notification active.</p>
                    ) : (
                      notifications.map((notification) => (
                        <NotificationRow
                          key={notification.id}
                          notification={notification}
                          isRead={readNotificationIds.includes(notification.id)}
                        />
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="flex h-8 max-w-[12rem] shrink-0 items-center gap-2 rounded-full border bg-card pl-1 pr-2.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">{userInitials}</div>
                    <span className="hidden truncate text-xs font-medium sm:inline">{userName}</span>
                    <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={8} className="w-[min(calc(100vw-1rem),18rem)] rounded-lg border bg-popover p-0 shadow-lg">
                  <div className="flex gap-3 p-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{userInitials}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">{userName}</p>
                        <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px]">{roleLabel}</Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{cabinetName}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <div className="p-1">
                    <DropdownMenuItem onClick={() => router.navigate({ to: "/settings" })}>
                      <Settings className="size-4" />
                      Paramètres du cabinet
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                      <LogOut className="size-4" />
                      Déconnexion
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function LoadingState({ label, showServerInitMessage }: { label: string; showServerInitMessage: boolean }) {
  return (
    <div className="p-6 text-sm text-muted-foreground">
      <p>{label}</p>
      {showServerInitMessage && (
        <p className="mt-2">Initialisation du serveur, cela peut prendre quelques secondes…</p>
      )}
    </div>
  );
}

function syncWhatsAppCabinetContext(user: AuthMe | null) {
  const cabinet = user?.cabinet;
  if (!cabinet || typeof cabinet !== "object") {
    setWhatsAppCabinetContext(null);
    return;
  }

  setWhatsAppCabinetContext({
    name: typeof cabinet.name === "string" ? cabinet.name : null,
    googleReviewLink: typeof cabinet.google_review_link === "string" ? cabinet.google_review_link : null,
  });
}

function getUserName(user: AuthMe | null) {
  return user?.full_name || "Utilisateur";
}

function getUserInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return initials || "U";
}

function getCabinetName(user: AuthMe | null) {
  const cabinet = user?.cabinet;
  if (cabinet && typeof cabinet === "object" && "name" in cabinet && typeof cabinet.name === "string" && cabinet.name.trim()) return cabinet.name;
  return "Nouveau cabinet";
}

function buildRealNotifications(summary: DashboardSummary): AppNotification[] {
  const notifications: AppNotification[] = [];
  const now = new Date().toISOString();

  if (summary.overdue_payments_count > 0) {
    notifications.push({
      id: `real-overdue-payments-${summary.overdue_payments_count}`,
      title: "Paiements en retard",
      description: `${summary.overdue_payments_count} paiement(s) à relancer`,
      href: "/payments",
      tone: "danger",
      createdAt: now,
    });
  }

  if (summary.recalls_due_count > 0) {
    notifications.push({
      id: `real-due-recalls-${summary.recalls_due_count}`,
      title: "Rappels patients à traiter",
      description: `${summary.recalls_due_count} rappel(s) arrivé(s) à échéance`,
      href: "/recalls",
      tone: "warning",
      createdAt: now,
    });
  }

  if (summary.review_requests_pending > 0) {
    notifications.push({
      id: `real-pending-reviews-${summary.review_requests_pending}`,
      title: "Avis Google à envoyer",
      description: `${summary.review_requests_pending} demande(s) d'avis en attente`,
      href: "/reviews",
      tone: "info",
      createdAt: now,
    });
  }

  return notifications;
}

function NotificationRow({ notification, isRead }: { notification: AppNotification; isRead: boolean }) {
  const toneClass = {
    danger: "bg-destructive",
    warning: "bg-warning",
    info: "bg-info",
  }[notification.tone];

  const badgeVariant = notification.tone === "danger" ? "destructive" : "secondary";

  return (
    <Link
      to={notification.href}
      className="flex gap-3 rounded-md p-3 transition-colors hover:bg-accent"
    >
      <span className={`mt-1 size-2 shrink-0 rounded-full ${isRead ? "bg-muted" : toneClass}`} />
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium leading-5">{notification.title}</span>
          <Badge variant={badgeVariant} className="shrink-0 px-1.5 py-0 text-[10px]">
            {isRead ? "lu" : "new"}
          </Badge>
        </span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{notification.description}</span>
      </span>
    </Link>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={150}>
        <AppShell />
        <Toaster position="top-right" richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
