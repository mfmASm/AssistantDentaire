import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-primary)] text-primary-foreground", className)}>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7.5 3.8c1.2-.6 2.6-.3 3.7.4.5.3 1.1.3 1.6 0 1.1-.7 2.5-1 3.7-.4 2.4 1.1 3.1 4.2 1.9 7.2-.6 1.6-1.1 3.2-1.4 4.9-.4 2.2-.9 4.3-2.3 4.3-1 0-1.3-1.3-1.6-2.8-.3-1.2-.5-2.4-1.1-2.4s-.8 1.2-1.1 2.4c-.3 1.5-.6 2.8-1.6 2.8-1.4 0-1.9-2.1-2.3-4.3-.3-1.7-.8-3.3-1.4-4.9-1.2-3-.5-6.1 1.9-7.2Z" />
      </svg>
    </div>
  );
}
