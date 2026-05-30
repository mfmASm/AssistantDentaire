import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Wallet,
  BellRing,
  ClipboardList,
  FileCheck2,
  Star,
  CalendarDays,
  Settings,
} from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { getRoleLabel } from "@/lib/roles";
import type { AuthMe } from "@/services/authApi";

const nav = [
  { title: "Tableau de bord", url: "/", icon: LayoutDashboard },
  { title: "Rendez-vous", url: "/appointments", icon: CalendarDays },
  { title: "Patients", url: "/patients", icon: Users },
  { title: "Paiements", url: "/payments", icon: Wallet },
  { title: "Ordonnances", url: "/ordonnances", icon: ClipboardList },
  { title: "Certificats médicaux", url: "/certificats-medicaux", icon: FileCheck2 },
  { title: "Rappels", url: "/recalls", icon: BellRing },
  { title: "Avis Google", url: "/reviews", icon: Star },
];

const secondary = [{ title: "Paramètres", url: "/settings", icon: Settings }];

type AppSidebarProps = {
  currentUser: AuthMe | null;
};

export function AppSidebar({ currentUser }: AppSidebarProps) {
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const closeMobileMenu = () => setOpenMobile(false);
  const cabinetName = getCabinetDisplayName(currentUser);
  const practitionerName = getPractitionerName(currentUser);
  const initials = getInitials(practitionerName);
  const roleLabel = getRoleLabel(currentUser?.role);

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b">
        <Link to="/" onClick={closeMobileMenu} className="flex items-center gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-accent">
          <BrandMark className="shadow-sm" />
          {!collapsed && (
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="font-display text-base font-semibold tracking-tight">AssistantDentaire</span>
              <span className="truncate text-[11px] text-muted-foreground">{cabinetName}</span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-1">
        <SidebarGroup>
          <SidebarGroupLabel>Pilotage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                    <Link to={item.url} onClick={closeMobileMenu} className="flex items-center gap-2.5">
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Cabinet</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondary.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                    <Link to={item.url} onClick={closeMobileMenu} className="flex items-center gap-2.5">
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-semibold">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-xs font-medium">{practitionerName}</span>
              <span className="truncate text-[11px] text-muted-foreground">{roleLabel}</span>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function getCabinetDisplayName(user: AuthMe | null) {
  const cabinet = user?.cabinet;
  if (!cabinet || typeof cabinet !== "object") return "Nouveau cabinet";

  const name = typeof cabinet.name === "string" && cabinet.name.trim() ? cabinet.name.trim() : "Nouveau cabinet";
  const city = typeof cabinet.city === "string" && cabinet.city.trim() ? cabinet.city.trim() : "";
  return city ? `${name} — ${city}` : name;
}

function getPractitionerName(user: AuthMe | null) {
  const cabinet = user?.cabinet;
  if (cabinet && typeof cabinet === "object" && typeof cabinet.dentist_name === "string" && cabinet.dentist_name.trim()) {
    return cabinet.dentist_name.trim();
  }
  return user?.full_name || user?.email || "Utilisateur";
}

function getInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return initials || "U";
}
