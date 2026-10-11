import { createFileRoute } from "@tanstack/react-router";
import { Leaf } from "lucide-react";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/fichas")({
  head: () => ({
    meta: [
      { title: "Fichas — Relevo" },
      { name: "description", content: "Fichas de cuidado de plantas, mascotas y casa en Relevo." },
      { property: "og:title", content: "Fichas — Relevo" },
      {
        property: "og:description",
        content: "Fichas de cuidado de plantas, mascotas y casa en Relevo.",
      },
    ],
  }),
  component: FichasPage,
});

function FichasPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground">Fichas</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Instrucciones de cuidado para plantas, mascotas y casa. Se reutilizan en cada plan.
      </p>
      <Card className="mt-6 flex flex-col items-center gap-3 p-10 text-center animate-fade-up-1">
        <Leaf className="h-8 w-8 text-primary" aria-hidden />
        <h2 className="text-base font-semibold text-card-foreground">Todavía no hay fichas</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Crea tu casa desde el Resumen y muy pronto podrás añadir aquí fichas con foto,
          instrucciones y notas importantes.
        </p>
      </Card>
    </div>
  );
}
