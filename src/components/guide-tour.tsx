import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const GUIDE_VERSION = 1;
export type GuideRole = "propietario" | "cuidador";

interface GuideStep {
  title: string;
  body: string;
  /** Selectores CSS candidatos; se usa el primero visible. */
  targets?: string[];
}

const STEPS: Record<GuideRole, GuideStep[]> = {
  propietario: [
    {
      title: "Te damos la bienvenida a Relevo",
      body: "Este recorrido de 6 pasos te muestra lo esencial para dejar tu casa en buenas manos. Puedes usar las flechas del teclado y salir con Escape.",
    },
    {
      title: "Resumen",
      body: "Aquí verás tu casa, el estado de tus planes y lo último que ha pasado.",
      targets: ['[data-tour="nav-inicio"]', '[data-tour="mnav-inicio"]'],
    },
    {
      title: "Fichas de cuidado",
      body: "Crea fichas para plantas, mascotas y hogar con foto e instrucciones. Se reutilizan en cada plan.",
      targets: ['[data-tour="nav-fichas"]', '[data-tour="mnav-fichas"]'],
    },
    {
      title: "Planes",
      body: "Cada ausencia es un plan: fechas, visitas y fichas. Al publicarlo podrás invitar a tu cuidador.",
      targets: ['[data-tour="nav-planes"]'],
    },
    {
      title: "Avisos",
      body: "La campana reúne los avisos: visitas completadas, tareas omitidas y retrasos.",
      targets: ['[data-tour="nav-avisos"]'],
    },
    {
      title: "Tu cuenta",
      body: "Desde tu avatar abres tu cuenta: nombre visible, avisos por correo y la opción de repetir esta guía.",
      targets: ['[data-tour="menu-cuenta"]'],
    },
  ],
  cuidador: [
    {
      title: "Te damos la bienvenida a Relevo",
      body: "Este recorrido de 5 pasos te muestra lo esencial para cuidar una casa. Puedes usar las flechas del teclado y salir con Escape.",
    },
    {
      title: "Inicio",
      body: "Aquí verás los planes que has aceptado y lo último que ha pasado.",
      targets: ['[data-tour="mnav-inicio"]', '[data-tour="nav-inicio"]'],
    },
    {
      title: "Visitas",
      body: "Tu próxima visita aparece aquí con sus tareas: márcalas, omítelas con motivo o añade nota y foto.",
      targets: ['[data-tour="mnav-visitas"]', '[data-tour="nav-visitas"]'],
    },
    {
      title: "Avisos",
      body: "La campana te avisa de cambios del plan e incidencias.",
      targets: ['[data-tour="nav-avisos"]'],
    },
    {
      title: "Tu cuenta",
      body: "Desde tu avatar abres tu cuenta: nombre visible, avisos por correo y la opción de repetir esta guía.",
      targets: ['[data-tour="menu-cuenta"]'],
    },
  ],
};

interface GuideTourProps {
  role: GuideRole;
  onFinish: (status: "completada" | "omitida") => void;
}

export function GuideTour({ role, onFinish }: GuideTourProps) {
  const steps = STEPS[role];
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const step = steps[index];
  const isLast = index === steps.length - 1;

  const locate = useCallback(() => {
    if (!step.targets) {
      setRect(null);
      return;
    }
    for (const selector of step.targets) {
      const el = document.querySelector(selector);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          setRect(r);
          return;
        }
      }
    }
    setRect(null);
  }, [step]);

  useEffect(() => {
    locate();
    window.addEventListener("resize", locate);
    return () => window.removeEventListener("resize", locate);
  }, [locate]);

  useEffect(() => {
    cardRef.current?.focus();
    if (rect) {
      const el = document.querySelector(step.targets?.[0] ?? "");
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onFinish("omitida");
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setIndex((i) => Math.min(i + 1, steps.length - 1));
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((i) => Math.max(i - 1, 0));
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onFinish, steps.length]);

  const margin = 8;
  const cardWidth = Math.min(340, window.innerWidth - margin * 2);
  let style: React.CSSProperties = {
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: cardWidth,
  };
  if (rect) {
    const below = rect.bottom + 12 + 180 < window.innerHeight;
    const top = below ? rect.bottom + 12 : Math.max(margin, rect.top - 12 - 190);
    const center = rect.left + rect.width / 2;
    const left = Math.min(
      Math.max(margin, center - cardWidth / 2),
      window.innerWidth - cardWidth - margin,
    );
    style = { top, left, width: cardWidth };
  }

  return createPortal(
    <div className="fixed inset-0 z-[90]" role="presentation">
      <div className="absolute inset-0 bg-foreground/45" aria-hidden />
      {rect && (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-xl ring-4 ring-primary"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
          }}
        />
      )}
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Guía de Relevo, paso ${index + 1} de ${steps.length}: ${step.title}`}
        className="absolute flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-xl outline-none"
        style={style}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Paso {index + 1} de {steps.length}
            </p>
            <h2 className="mt-0.5 text-base font-semibold text-card-foreground">{step.title}</h2>
          </div>
          <button
            type="button"
            onClick={() => onFinish("omitida")}
            aria-label="Cerrar la guía"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">{step.body}</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => onFinish("omitida")}>
            Omitir guía
          </Button>
          <div className="flex gap-2">
            {index > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={() => setIndex(index - 1)}>
                Atrás
              </Button>
            )}
            {isLast ? (
              <Button type="button" size="sm" onClick={() => onFinish("completada")}>
                Terminar
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={() => setIndex(index + 1)}>
                Siguiente
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
