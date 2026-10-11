import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FilePenLine, Loader2, Map, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatDateEs } from "@/lib/visits";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/planes")({
  head: () => ({
    meta: [
      { title: "Planes — Relevo" },
      { name: "description", content: "Tus ausencias y planes de cuidado en Relevo." },
      { property: "og:title", content: "Planes — Relevo" },
      { property: "og:description", content: "Tus ausencias y planes de cuidado en Relevo." },
    ],
  }),
  component: PlanesPage,
});

interface PlanRow {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: string;
  caregiver_id: string | null;
  houses: { name: string } | null;
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  borrador: { label: "Borrador", className: "bg-warning/10 text-warning" },
  abierto: { label: "Sin cuidador", className: "bg-secondary text-secondary-foreground" },
  activo: { label: "Activo", className: "bg-primary/10 text-primary" },
  completado: { label: "Completado", className: "bg-muted text-muted-foreground" },
  cancelado: { label: "Cancelado", className: "bg-muted text-muted-foreground" },
};

function statusMeta(status: string) {
  return STATUS_META[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
}

function PlanesPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["plans", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("id, title, start_date, end_date, status, caregiver_id, houses(name)")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PlanRow[];
    },
  });

  const drafts = plans.filter((p) => p.status === "borrador");
  const published = plans.filter((p) => p.status !== "borrador");

  async function discardDraft(planId: string) {
    setDeleting(true);
    const { error } = await supabase.from("plans").delete().eq("id", planId);
    setDeleting(false);
    if (error) {
      toast.error("No se ha podido descartar el borrador.");
      return;
    }
    toast.success("Borrador descartado.");
    queryClient.invalidateQueries({ queryKey: ["plans", user.id] });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada plan es una ausencia: fechas, visitas y cuidador.
          </p>
        </div>
        <Link to="/planes-nuevo">
          <Button className="shrink-0">
            <Plus className="h-4 w-4" aria-hidden /> Nuevo plan
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Cargando planes…
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {drafts.length > 0 && (
            <section aria-label="Borradores">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Borradores
              </h2>
              <div className="mt-3 flex flex-col gap-3">
                {drafts.map((plan) => (
                  <Card
                    key={plan.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-dashed p-4"
                  >
                    <div className="flex items-center gap-3">
                      <FilePenLine className="h-5 w-5 text-warning" aria-hidden />
                      <div>
                        <p className="text-sm font-semibold text-card-foreground">{plan.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateEs(plan.start_date)} → {formatDateEs(plan.end_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link to="/planes-nuevo" search={{ borrador: plan.id }}>
                        <Button variant="secondary" size="sm">
                          Continuar
                        </Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" aria-label={`Descartar borrador ${plan.title}`}>
                            <Trash2 className="h-4 w-4 text-destructive" aria-hidden />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Descartar este borrador?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Se eliminará «{plan.title}» y no se podrá recuperar.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Volver</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => discardDraft(plan.id)}
                              disabled={deleting}
                            >
                              Descartar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {published.length === 0 && drafts.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 p-10 text-center animate-fade-up-1">
              <Map className="h-8 w-8 text-primary" aria-hidden />
              <h2 className="text-base font-semibold text-card-foreground">Aún no hay planes</h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                Crea tu primera ausencia paso a paso: fechas, fichas y visitas. Después invitarás a
                tu cuidador con un enlace.
              </p>
              <Link to="/planes-nuevo">
                <Button size="sm" className="mt-1">
                  <Plus className="h-4 w-4" aria-hidden /> Crear mi primer plan
                </Button>
              </Link>
            </Card>
          ) : published.length > 0 ? (
            <section aria-label="Planes">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Tus planes
              </h2>
              <div className="mt-3 flex flex-col gap-3">
                {published.map((plan) => {
                  const meta = statusMeta(plan.status);
                  return (
                    <Card key={plan.id} className="flex flex-col gap-2 p-5 animate-fade-up-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-base font-semibold text-card-foreground">
                          {plan.title}
                        </h3>
                        <span
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-semibold",
                            meta.className,
                          )}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDateEs(plan.start_date)} → {formatDateEs(plan.end_date)}
                        {plan.houses?.name ? ` · ${plan.houses.name}` : ""}
                      </p>
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" aria-hidden />
                        {plan.caregiver_id
                          ? "Cuidador asignado"
                          : "Sin cuidador: la invitación estará disponible muy pronto."}
                      </p>
                    </Card>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
