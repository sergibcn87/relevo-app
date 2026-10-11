import { Sprout } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Sprout className="h-5 w-5" aria-hidden />
      </span>
      {!compact && <span className="text-lg font-bold tracking-tight text-foreground">Relevo</span>}
    </span>
  );
}
