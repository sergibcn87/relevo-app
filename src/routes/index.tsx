import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, CalendarCheck, Camera, CloudSun, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import heroImage from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Relevo — Deja tu casa en buenas manos y sigue cada visita" },
      {
        name: "description",
        content:
          "Relevo reúne instrucciones, visitas y confirmaciones en un plan compartido entre propietario y cuidador. Plantas, mascotas y casa bajo control mientras estás fuera.",
      },
      { property: "og:title", content: "Relevo — Deja tu casa en buenas manos y sigue cada visita" },
      {
        property: "og:description",
        content:
          "Instrucciones, visitas y avisos automáticos en un plan compartido entre propietario y cuidador.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const features = [
  {
    icon: ClipboardList,
    title: "Instrucciones claras",
    text: "Fichas de cuidado para plantas, mascotas y casa, reutilizables en cada ausencia.",
  },
  {
    icon: CalendarCheck,
    title: "Visitas organizadas",
    text: "El cuidador marca cada tarea desde el móvil y la visita se cierra sola al terminar.",
  },
  {
    icon: Bell,
    title: "Avisos automáticos",
    text: "Recibe un aviso cuando se completa una visita o si no consta completada a tiempo.",
  },
  {
    icon: CloudSun,
    title: "El tiempo, vigilado",
    text: "Reglas sencillas: si hace mucho calor o viento, Relevo sugiere qué revisar.",
  },
  {
    icon: Camera,
    title: "Fotos privadas",
    text: "El cuidador puede adjuntar fotos y notas que solo veis vosotros dos.",
  },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/60"
          >
            Entrar
          </Link>
          <Link to="/auth" className="hidden sm:inline-flex">
            <Button size="sm">Crear cuenta</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="grid items-center gap-8 py-10 md:grid-cols-2 md:py-16">
          <div className="animate-fade-up">
            <p className="mb-3 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
              Cuidado de casa compartido
            </p>
            <h1 className="text-4xl font-bold leading-tight text-foreground sm:text-5xl">
              Deja tu casa en buenas manos y sigue cada visita.
            </h1>
            <p className="mt-4 max-w-md text-base text-muted-foreground sm:text-lg">
              Relevo reúne instrucciones, visitas y confirmaciones en un plan compartido. Tu
              cuidador sabe qué hacer y tú sabes qué se ha hecho.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/auth">
                <Button size="lg">Empezar ahora</Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline">
                  Ya tengo cuenta
                </Button>
              </Link>
            </div>
          </div>
          <div className="animate-fade-up-1 overflow-hidden rounded-3xl border border-border shadow-sm">
            <img
              src={heroImage}
              alt="Rincón de una casa con una monstera, un gato, una regadera y un paquete"
              width={1536}
              height={1024}
              className="h-full w-full object-cover"
            />
          </div>
        </section>

        <section className="grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className={`rounded-2xl border border-border bg-card p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 ${
                ["animate-fade-up", "animate-fade-up-1", "animate-fade-up-2", "animate-fade-up-3", "animate-fade-up-3", "animate-fade-up-3"][index]
              }`}
            >
              <feature.icon className="h-6 w-6 text-primary" aria-hidden />
              <h2 className="mt-3 text-base font-semibold text-card-foreground">{feature.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{feature.text}</p>
            </article>
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Relevo — cuidado de casa durante ausencias temporales
      </footer>
    </div>
  );
}
