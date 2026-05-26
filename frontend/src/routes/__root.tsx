import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import { authApi, type AuthMe } from "@/services/authApi";

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
  console.error(error);
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
      { title: "DentalPilot — Pilotez votre cabinet dentaire" },
      { name: "description", content: "DentalPilot aide les cabinets dentaires à recouvrer les impayés, faire revenir les patients et obtenir plus d'avis Google depuis un seul tableau de bord." },
    ],
    links: [
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
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isAuthPage = pathname === "/login";
  const isPublicPage = isAuthPage || pathname === "/sitemap.xml";
  const notifications = useMemo(() => getNotifications(), []);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthMe | null>(null);

  useEffect(() => {
    console.log("Root route rendered");
  }, []);

  useEffect(() => {
    let active = true;

    const checkAuth = async () => {
      if (active) setIsCheckingAuth(true);
      try {
        const session = await authApi.session();
        console.log("Current pathname", pathname);
        console.log("Is login route", isAuthPage);
        console.log("Session exists", session?.access_token ? "yes" : "no");

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
          router.navigate({ to: "/login" });
          return;
        }

        const user = await authApi.ensureOnboarded();
        if (active) {
          setCurrentUser(user);
          setIsAuthorized(true);
          setIsCheckingAuth(false);
        }
      } catch (error) {
        console.error(error);
        await authApi.logout();
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
  }, [isAuthPage, isPublicPage, pathname, router]);

  useEffect(() => {
    console.log("Auth loading state", isCheckingAuth);
  }, [isCheckingAuth]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("dentalpilot-read-notifications");
      if (stored) setReadNotificationIds(JSON.parse(stored));
    } catch {
      setReadNotificationIds([]);
    }
  }, []);

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
    await authApi.logout();
    setCurrentUser(null);
    setIsAuthorized(false);
    toast.success("Déconnexion réussie.");
    router.navigate({ to: "/login" });
  };

  const userName = getUserName(currentUser);
  const userInitials = getUserInitials(userName);
  const userEmail = currentUser?.email || "email@dentalpilot.ma";
  const cabinetName = getCabinetName(currentUser);
  const roleLabel = getRoleLabel(currentUser?.role);

  if (isAuthPage) return <Outlet />;
  if (!isPublicPage && isCheckingAuth) return <div className="p-6 text-sm text-muted-foreground">Chargement...</div>;
  if (!isPublicPage && !isAuthorized) return <div className="p-6 text-sm text-muted-foreground">Chargement...</div>;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-3 backdrop-blur sm:px-6">
            <SidebarTrigger />
            <div className="relative hidden flex-1 max-w-md md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher un patient, un paiement…" className="h-9 pl-9" />
            </div>
            <div className="ml-auto flex items-center gap-2">
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
                  <button type="button" className="flex h-8 max-w-[12rem] items-center gap-2 rounded-full border bg-card pl-1 pr-2.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
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
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
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
  if (cabinet && typeof cabinet === "object" && "name" in cabinet && typeof cabinet.name === "string") return cabinet.name;
  return "Cabinet dentaire";
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
  useEffect(() => {
    console.log("App mounted");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={150}>
        <AppShell />
        <Toaster position="top-right" richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
