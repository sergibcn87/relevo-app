import { createFileRoute } from "@tanstack/react-router";
import { Map } from "lucide-react";
import { Card } from "@/components/ui/card";

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

function PlanesPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground">Planes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cada plan es una ausencia: fechas, visitas y cuidador.
      </p>
      <Card className="mt-6 flex flex-col items-center gap-3 p-10 text-center animate-fade-up-1">
        <Map className="h-8 w-8 text-primary" aria-hidden />
        <h2 className="text-base font-semibold text-card-foreground">Aún no hay planes</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Muy pronto podrás crear una ausencia aquí, paso a paso o con ayuda de la IA, e invitar a
          tu cuidador.
        </p>
      </Card>
    </div>
  );
}
