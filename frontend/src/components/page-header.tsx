import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="text-sm text-muted-foreground break-words">{description}</p>}
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{actions}</div>}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  trend?: string;
  trendTone?: "up" | "down" | "neutral";
  icon?: ReactNode;
  accent?: "primary" | "success" | "warning" | "danger" | "info";
}

const accentMap = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-warning-foreground",
  danger: "bg-destructive/15 text-destructive",
  info: "bg-info/15 text-info",
};

export function StatCard({ label, value, hint, trend, trendTone = "neutral", icon, accent = "primary" }: StatCardProps) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border bg-card p-5 transition-shadow hover:shadow-[var(--shadow-elevated)]"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 break-words font-display text-2xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="mt-1 break-words text-xs text-muted-foreground">{hint}</p>}
        </div>
        {icon && (
          <div className={`flex size-10 items-center justify-center rounded-xl ${accentMap[accent]}`}>{icon}</div>
        )}
      </div>
      {trend && (
        <div className="mt-3 text-xs font-medium">
          <span
            className={
              trendTone === "up"
                ? "text-success"
                : trendTone === "down"
                ? "text-destructive"
                : "text-muted-foreground"
            }
          >
            {trend}
          </span>
        </div>
      )}
    </div>
  );
}
