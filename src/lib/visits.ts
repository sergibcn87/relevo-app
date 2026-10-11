/*
 * Definiciones y generación de visitas para el asistente de planes.
 * Las horas se interpretan como hora local del navegador (zona inicial: Europe/Madrid).
 */

export type VisitDef =
  | { kind: "single"; date: string; time: string }
  | { kind: "repeat"; everyDays: number; time: string; from: string; to: string };

/** Genera las visitas (ISO, únicas y ordenadas) dentro del rango del plan. */
export function generateVisitTimes(
  defs: VisitDef[],
  startDate: string,
  endDate: string,
): string[] {
  const set = new Set<string>();
  for (const def of defs) {
    if (def.kind === "single") {
      if (def.date && def.time && def.date >= startDate && def.date <= endDate) {
        set.add(toIso(def.date, def.time));
      }
    } else {
      const every = Math.max(1, Math.floor(def.everyDays || 1));
      const from = def.from < startDate ? startDate : def.from;
      const to = def.to > endDate ? endDate : def.to;
      if (!def.time || !from || !to || from > to) continue;
      let day = from;
      let guard = 0;
      while (day <= to && guard < 400) {
        set.add(toIso(day, def.time));
        day = addDays(day, every);
        guard += 1;
      }
    }
  }
  return [...set].sort();
}

function toIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const visitFormatter = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatVisitEs(iso: string): string {
  return visitFormatter.format(new Date(iso));
}

export function formatDateEs(date: string): string {
  return dateFormatter.format(new Date(`${date}T00:00:00`));
}

/** Descripción legible de una definición de visita. */
export function describeVisitDef(def: VisitDef): string {
  if (def.kind === "single") {
    return `Visita única — ${formatDateEs(def.date)}, ${def.time} h`;
  }
  const every =
    def.everyDays === 1 ? "Cada día" : `Cada ${def.everyDays} días`;
  return `${every} a las ${def.time} h · del ${formatDateEs(def.from)} al ${formatDateEs(def.to)}`;
}
