import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatVisitEs } from "@/lib/visits";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/visitas")({
  head: () => ({
    meta: [
      { title: "Visitas — Relevo" },
      { name: "description", content: "Tus visitas de cuidado en Relevo." },
      { property: "og:title", content: "Visitas — Relevo" },
      { property: "og:description", content: "Tus visitas de cuidado en Relevo." },
    ],
  }),
  component: VisitasPage,
});

const VISIT_STATUS: Record<string, { label: string; className: string }> = {
  pendiente: { label: "Pendiente", className: "bg-secondary text-secondary-foreground" },
  en_curso: { label: "En curso", className: "bg-primary/10 text-primary" },
  completada: { label: "Completada", className: "bg-primary/10 text-primary" },
  completada_con_omisiones: { label: "Con omisiones", className: "bg-warning/10 text-warning" },
};

interface VisitRow {
  id: string;
  scheduled_at: string;
  status: string;
  plans: { title: string; houses: { name: string } | null } | null;
}

function statusChip(status: string) {
  const meta = VISIT_STATUS[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground",
  };
  return (
    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", meta.className)}>
      {meta.label}
    </span>
  );
}

function VisitasPage() {
  const { user } = Route.useRouteContext();

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ["visits", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visits")
        .select("id, scheduled_at, status, plans(title, houses(name))")
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as VisitRow[];
    },
  });

  const upcoming = visits.filter((v) => v.status === "pendiente" || v.status === "en_curso");
  const past = visits
    .filter((v) => v.status !== "pendiente" && v.status !== "en_curso")
    .reverse();
  const next = upcoming[0];
  const rest = upcoming.slice(1);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground">Visitas</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tu próxima visita, las que vienen después y el historial.
      </p>

      {isLoading ? (
        <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Cargando visitas…
        </p>
      ) : visits.length === 0 ? (
        <Card className="mt-6 flex flex-col items-center gap-3 p-10 text-center animate-fade-up-1">
          <CalendarCheck className="h-8 w-8 text-primary" aria-hidden />
          <h2 className="text-base font-semibold text-card-foreground">Sin visitas por ahora</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Cuando un plan esté publicado y tengas cuidador —o aceptes una invitación— tus visitas
            aparecerán aquí.
          </p>
        </Card>
      ) : (
        <div className="mt-6 flex flex-col gap-8">
          {next && (
            <section aria-label="Próxima visita">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Próxima visita
              </h2>
              <Link to="/visitas/$visitaId" params={{ visitaId: next.id }} className="mt-3 block">
                <Card className="flex flex-col gap-2 border-primary/30 bg-hero-card p-5 transition-colors hover:border-primary/60 animate-fade-up-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-base font-semibold text-card-foreground">
                      {formatVisitEs(next.scheduled_at)}
                    </p>
                    {statusChip(next.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {next.plans?.title}
                    {next.plans?.houses?.name ? ` · ${next.plans.houses.name}` : ""}
                  </p>
                  <p className="flex items-center gap-1 text-sm font-medium text-primary">
                    Ver tareas <ArrowRight className="h-4 w-4" aria-hidden />
                  </p>
                </Card>
              </Link>
            </section>
          )}

          {rest.length > 0 && (
            <section aria-label="Próximas visitas">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Después
              </h2>
              <ul className="mt-3 flex flex-col gap-2">
                {rest.map((visit) => (
                  <li key={visit.id}>
                    <Link
                      to="/visitas/$visitaId"
                      params={{ visitaId: visit.id }}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition-colors hover:bg-secondary/40"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-card-foreground">
                          {formatVisitEs(visit.scheduled_at)}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {visit.plans?.title}
                        </span>
                      </span>
                      {statusChip(visit.status)}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {past.length > 0 && (
            <section aria-label="Historial de visitas">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Historial
              </h2>
              <ul className="mt-3 flex flex-col gap-2">
                {past.map((visit) => (
                  <li key={visit.id}>
                    <Link
                      to="/visitas/$visitaId"
                      params={{ visitaId: visit.id }}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition-colors hover:bg-secondary/40"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-card-foreground">
                          {formatVisitEs(visit.scheduled_at)}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {visit.plans?.title}
                        </span>
                      </span>
                      {statusChip(visit.status)}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
