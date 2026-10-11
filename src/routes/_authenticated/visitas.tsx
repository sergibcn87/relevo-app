import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck } from "lucide-react";
import { Card } from "@/components/ui/card";

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

function VisitasPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground">Visitas</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Aquí verás la próxima visita y el historial de las anteriores.
      </p>
      <Card className="mt-6 flex flex-col items-center gap-3 p-10 text-center animate-fade-up-1">
        <CalendarCheck className="h-8 w-8 text-primary" aria-hidden />
        <h2 className="text-base font-semibold text-card-foreground">Sin visitas por ahora</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Cuando un plan esté activo, tus visitas aparecerán aquí con sus tareas e instrucciones.
        </p>
      </Card>
    </div>
  );
}
