import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarPlus,
  Check,
  Home,
  Loader2,
  PawPrint,
  Repeat,
  Sprout,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  describeVisitDef,
  formatDateEs,
  formatVisitEs,
  generateVisitTimes,
  type VisitDef,
} from "@/lib/visits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/planes-nuevo")({
  validateSearch: (search: Record<string, unknown>): { borrador?: string | undefined } => ({
    borrador: typeof search["borrador"] === "string" ? (search["borrador"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Nuevo plan — Relevo" },
      { name: "description", content: "Crea una ausencia paso a paso: fechas, tareas y visitas." },
      { property: "og:title", content: "Nuevo plan — Relevo" },
      { property: "og:description", content: "Crea una ausencia paso a paso: fechas, tareas y visitas." },
    ],
  }),
  component: NuevoPlanPage,
});

interface DraftPayload {
  step: number;
  title: string;
  startDate: string;
  endDate: string;
  generalNote: string;
  selectedCardIds: string[];
  visitDefs: VisitDef[];
}

const CATEGORY_ICONS: Record<string, typeof Sprout> = {
  planta: Sprout,
  mascota: PawPrint,
  casa: Home,
};

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function NuevoPlanPage() {
  const { user } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [planId, setPlanId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [generalNote, setGeneralNote] = useState("");
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [visitDefs, setVisitDefs] = useState<VisitDef[]>([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Entradas del paso 2
  const [singleDate, setSingleDate] = useState("");
  const [singleTime, setSingleTime] = useState("18:00");
  const [repeatEvery, setRepeatEvery] = useState(1);
  const [repeatTime, setRepeatTime] = useState("18:00");
  const [repeatFrom, setRepeatFrom] = useState("");
  const [repeatTo, setRepeatTo] = useState("");

  const { data: houses = [], isLoading: loadingHouses } = useQuery({
    queryKey: ["houses", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("houses")
        .select("id, name")
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });
  const house = houses[0] ?? null;

  const { data: cards = [] } = useQuery({
    queryKey: ["care-cards", house?.id],
    enabled: !!house,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("care_cards")
        .select("id, name, category, room, instructions")
        .eq("house_id", house!.id)
        .eq("archived", false)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: draftPlan, isLoading: loadingDraft } = useQuery({
    queryKey: ["plan-draft", search.borrador],
    enabled: !!search.borrador,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("id, title, start_date, end_date, general_note, status, draft")
        .eq("id", search.borrador!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Hidratar desde el borrador guardado
  useEffect(() => {
    if (hydrated) return;
    if (search.borrador) {
      if (!draftPlan) return;
      setPlanId(draftPlan.id);
      setTitle(draftPlan.title);
      setStartDate(draftPlan.start_date);
      setEndDate(draftPlan.end_date);
      setGeneralNote(draftPlan.general_note ?? "");
      const draft = draftPlan.draft as Partial<DraftPayload> | null;
      if (draft) {
        setStep(Math.min(3, Math.max(1, draft.step ?? 1)));
        setSelectedCardIds(draft.selectedCardIds ?? []);
        setVisitDefs((draft.visitDefs as VisitDef[] | undefined) ?? []);
      }
      setHydrated(true);
    } else {
      setHydrated(true);
    }
  }, [draftPlan, hydrated, search.borrador]);

  // Valores por defecto de repetición cuando hay rango
  useEffect(() => {
    if (startDate && !repeatFrom) setRepeatFrom(startDate);
    if (endDate && !repeatTo) setRepeatTo(endDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const previewTimes = useMemo(
    () => (startDate && endDate ? generateVisitTimes(visitDefs, startDate, endDate) : []),
    [visitDefs, startDate, endDate],
  );

  const selectedCards = useMemo(
    () => cards.filter((c) => selectedCardIds.includes(c.id)),
    [cards, selectedCardIds],
  );

  function step1Valid(): boolean {
    return !!title.trim() && !!startDate && !!endDate && endDate >= startDate;
  }

  async function saveDraft(targetStep: number, silent = false): Promise<string | null> {
    if (!house) return null;
    const payload: DraftPayload = {
      step: targetStep,
      title: title.trim(),
      startDate,
      endDate,
      generalNote: generalNote.trim(),
      selectedCardIds,
      visitDefs,
    };
    const base = {
      title: title.trim(),
      start_date: startDate,
      end_date: endDate,
      general_note: generalNote.trim() || null,
      draft: payload as unknown as Json,
    };
    if (planId) {
      const { error } = await supabase.from("plans").update(base).eq("id", planId);
      if (error) {
        toast.error("No se ha podido guardar el borrador.");
        return null;
      }
      if (!silent) toast.success("Borrador guardado.");
      return planId;
    }
    // El id se genera en el cliente: un INSERT con RETURNING choca con las
    // políticas de lectura que consultan la propia tabla.
    const newId = crypto.randomUUID();
    const { error } = await supabase.from("plans").insert({
      id: newId,
      ...base,
      house_id: house.id,
      status: "borrador",
      timezone: "Europe/Madrid",
    });
    if (error) {
      toast.error("No se ha podido guardar el borrador.");
      return null;
    }
    setPlanId(newId);
    if (!silent) toast.success("Borrador guardado. Puedes continuarlo cuando quieras.");
    return newId;
  }

  async function goToStep(next: number) {
    if (next > 1 && !step1Valid()) {
      toast.error("Completa el título y las fechas: la salida no puede ser después de la vuelta.");
      return;
    }
    setSaving(true);
    const id = await saveDraft(next, true);
    setSaving(false);
    if (id) setStep(next);
  }

  function toggleCard(cardId: string) {
    setSelectedCardIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId],
    );
  }

  function addSingle() {
    if (!singleDate || !singleTime) {
      toast.error("Elige fecha y hora para la visita.");
      return;
    }
    if (singleDate < startDate || singleDate > endDate) {
      toast.error("La visita debe estar entre la salida y la vuelta.");
      return;
    }
    setVisitDefs((prev) => [...prev, { kind: "single", date: singleDate, time: singleTime }]);
    setSingleDate("");
  }

  function addRepeat() {
    if (!repeatTime || !repeatFrom || !repeatTo || repeatFrom > repeatTo) {
      toast.error("Revisa la repetición: el inicio no puede ser después del fin.");
      return;
    }
    setVisitDefs((prev) => [
      ...prev,
      { kind: "repeat", everyDays: repeatEvery, time: repeatTime, from: repeatFrom, to: repeatTo },
    ]);
  }

  async function publish() {
    if (!step1Valid()) {
      toast.error("Faltan el título o las fechas.");
      return;
    }
    if (selectedCardIds.length === 0) {
      toast.error("Selecciona al menos una tarea para las visitas.");
      return;
    }
    if (previewTimes.length === 0) {
      toast.error("Añade al menos una visita o repetición.");
      return;
    }
    setPublishing(true);

    // 1. Plan pasa a abierto
    let id = planId;
    if (!id) {
      const newId = crypto.randomUUID();
      const { error } = await supabase.from("plans").insert({
        id: newId,
        house_id: house!.id,
        title: title.trim(),
        start_date: startDate,
        end_date: endDate,
        general_note: generalNote.trim() || null,
        status: "abierto",
        timezone: "Europe/Madrid",
      });
      if (error) {
        setPublishing(false);
        toast.error("No se ha podido publicar el plan.");
        return;
      }
      id = newId;
    } else {
      const { error } = await supabase
        .from("plans")
        .update({
          title: title.trim(),
          start_date: startDate,
          end_date: endDate,
          general_note: generalNote.trim() || null,
          status: "abierto",
          draft: null,
        })
        .eq("id", id);
      if (error) {
        setPublishing(false);
        toast.error("No se ha podido publicar el plan.");
        return;
      }
    }

    // 2. Visitas (ids generados en el cliente por la misma razón que el plan)
    const visitsData = previewTimes.map((t) => ({
      id: crypto.randomUUID(),
      plan_id: id!,
      scheduled_at: t,
      status: "pendiente",
    }));
    const { error: visitsError } = await supabase.from("visits").insert(visitsData);
    if (visitsError) {
      setPublishing(false);
      toast.error("El plan se ha guardado, pero no se han podido crear las visitas.");
      return;
    }

    // 3. Tareas de la visita: una por tarea seleccionada en cada visita
    const cardMap = new Map(cards.map((c) => [c.id, c]));
    const taskRows = visitsData.flatMap((v) =>
      selectedCardIds.map((cardId, i) => ({
        visit_id: v.id,
        care_card_id: cardId,
        title: cardMap.get(cardId)?.name ?? "Tarea",
        instructions: cardMap.get(cardId)?.instructions ?? "",
        source: "manual",
        sort_order: i,
      })),
    );
    const { error: tasksError } = await supabase.from("tasks").insert(taskRows);
    if (tasksError) {
      setPublishing(false);
      toast.error("Las visitas se han creado, pero no las tareas. Edita el plan.");
      return;
    }

    // 4. Actividad
    await supabase.from("activity_events").insert({
      plan_id: id,
      actor_id: user.id,
      type: "plan_publicado",
      message: `Plan «${title.trim()}» publicado con ${previewTimes.length} visitas y ${selectedCardIds.length} tareas.`,
    });

    setPublishing(false);
    queryClient.invalidateQueries({ queryKey: ["plans", user.id] });
    toast.success("Plan publicado. Ya puedes invitar a tu cuidador (muy pronto).");
    navigate({ to: "/planes" });
  }

  if (loadingHouses || loadingDraft || !hydrated) {
    return (
      <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Preparando el asistente…
      </p>
    );
  }

  if (!house) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="mt-6 flex flex-col items-center gap-3 p-10 text-center">
          <Home className="h-8 w-8 text-primary" aria-hidden />
          <h1 className="text-base font-semibold text-card-foreground">Primero crea tu casa</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Un plan pertenece a una casa. Crea la tuya desde el Resumen y vuelve aquí.
          </p>
          <Link to="/inicio">
            <Button variant="secondary" size="sm">Ir al Resumen</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/planes"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Volver a Planes
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-foreground">Nuevo plan</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {house.name} · tu progreso se guarda como borrador automáticamente.
      </p>

      {/* Indicador de pasos */}
      <ol className="mt-5 flex items-center gap-2" aria-label={`Paso ${step} de 3`}>
        {[1, 2, 3].map((n) => (
          <li
            key={n}
            aria-current={step === n ? "step" : undefined}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              n <= step ? "bg-primary" : "bg-border",
            )}
          />
        ))}
      </ol>
      <p className="mt-2 text-xs font-medium text-muted-foreground">
        Paso {step} de 3 —{" "}
        {step === 1 ? "Fechas" : step === 2 ? "Tareas y visitas" : "Revisión"}
      </p>

      {step === 1 && (
        <Card className="mt-5 flex flex-col gap-4 p-6 animate-fade-up">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plan-title">Título del plan</Label>
            <Input
              id="plan-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Por ejemplo: Puente de octubre"
              maxLength={100}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-start">Salida</Label>
              <Input
                id="plan-start"
                type="date"
                value={startDate}
                min={todayIso()}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-end">Vuelta</Label>
              <Input
                id="plan-end"
                type="date"
                value={endDate}
                min={startDate || todayIso()}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plan-note">
              Nota general{" "}
              <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="plan-note"
              value={generalNote}
              onChange={(e) => setGeneralNote(e.target.value)}
              placeholder="Cualquier cosa que tu cuidador deba saber sobre esta ausencia."
              rows={3}
              maxLength={500}
            />
          </div>
          <div className="mt-2 flex justify-end">
            <Button onClick={() => goToStep(2)} disabled={saving || !step1Valid()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Siguiente <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <div className="mt-5 flex flex-col gap-5">
          <Card className="p-6 animate-fade-up">
            <h2 className="text-base font-semibold text-card-foreground">
              ¿Qué tareas hay que cuidar?
            </h2>
            {cards.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Todavía no hay tareas en esta casa.{" "}
                <Link to="/tareas" className="font-medium text-primary underline">
                  Crea la primera
                </Link>{" "}
                y vuelve aquí: tu borrador se conserva.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {cards.map((card) => {
                  const Icon = CATEGORY_ICONS[card.category] ?? Home;
                  const checked = selectedCardIds.includes(card.id);
                  return (
                    <li key={card.id}>
                      <label
                        className={cn(
                          "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2 transition-colors",
                          checked
                            ? "border-primary bg-secondary"
                            : "border-border bg-background hover:bg-secondary/50",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCard(card.id)}
                          className="h-5 w-5 accent-primary"
                        />
                        <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                        <span className="text-sm font-medium text-foreground">{card.name}</span>
                        {card.room && (
                          <span className="text-xs text-muted-foreground">{card.room}</span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card className="flex flex-col gap-5 p-6 animate-fade-up-1">
            <h2 className="text-base font-semibold text-card-foreground">¿Cuándo son las visitas?</h2>

            <div className="rounded-xl border border-border bg-background p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CalendarPlus className="h-4 w-4 text-primary" aria-hidden /> Visita puntual
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <Input
                  type="date"
                  aria-label="Fecha de la visita"
                  value={singleDate}
                  min={startDate}
                  max={endDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                />
                <Input
                  type="time"
                  aria-label="Hora de la visita"
                  value={singleTime}
                  onChange={(e) => setSingleTime(e.target.value)}
                />
                <Button type="button" variant="secondary" onClick={addSingle}>
                  Añadir
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Repeat className="h-4 w-4 text-primary" aria-hidden /> Repetición
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="repeat-every">Cada…</Label>
                  <select
                    id="repeat-every"
                    value={repeatEvery}
                    onChange={(e) => setRepeatEvery(Number(e.target.value))}
                    className="h-11 rounded-xl border border-input bg-card px-3 text-sm text-foreground"
                  >
                    <option value={1}>día</option>
                    <option value={2}>2 días</option>
                    <option value={3}>3 días</option>
                    <option value={7}>semana</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="repeat-time">Hora</Label>
                  <Input
                    id="repeat-time"
                    type="time"
                    value={repeatTime}
                    onChange={(e) => setRepeatTime(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="repeat-from">Desde</Label>
                  <Input
                    id="repeat-from"
                    type="date"
                    value={repeatFrom}
                    min={startDate}
                    max={endDate}
                    onChange={(e) => setRepeatFrom(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="repeat-to">Hasta</Label>
                  <Input
                    id="repeat-to"
                    type="date"
                    value={repeatTo}
                    min={startDate}
                    max={endDate}
                    onChange={(e) => setRepeatTo(e.target.value)}
                  />
                </div>
              </div>
              <Button type="button" variant="secondary" className="mt-3" onClick={addRepeat}>
                Añadir repetición
              </Button>
            </div>

            {visitDefs.length > 0 && (
              <ul className="flex flex-col gap-2" aria-label="Definiciones de visita">
                {visitDefs.map((def, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-xl bg-secondary/60 px-4 py-2.5"
                  >
                    <span className="text-sm text-secondary-foreground">
                      {describeVisitDef(def)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setVisitDefs((prev) => prev.filter((_, j) => j !== i))}
                      aria-label={`Quitar ${describeVisitDef(def)}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="rounded-xl bg-secondary/50 p-4" aria-live="polite">
              <p className="text-sm font-semibold text-secondary-foreground">
                Vista previa: {previewTimes.length}{" "}
                {previewTimes.length === 1 ? "visita" : "visitas"}
              </p>
              {previewTimes.length > 0 && (
                <ul className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                  {previewTimes.slice(0, 24).map((t) => (
                    <li key={t}>{formatVisitEs(t)}</li>
                  ))}
                  {previewTimes.length > 24 && (
                    <li>…y {previewTimes.length - 24} más</li>
                  )}
                </ul>
              )}
            </div>
          </Card>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4" aria-hidden /> Atrás
            </Button>
            <Button onClick={() => goToStep(3)} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Siguiente <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <Card className="mt-5 flex flex-col gap-4 p-6 animate-fade-up">
          <h2 className="text-base font-semibold text-card-foreground">Revisión</h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-medium text-muted-foreground">Título</dt>
              <dd className="text-foreground">{title}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Fechas</dt>
              <dd className="text-foreground">
                {formatDateEs(startDate)} → {formatDateEs(endDate)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Tareas</dt>
              <dd className="text-foreground">
                {selectedCards.length === 0
                  ? "Ninguna seleccionada"
                  : selectedCards.map((c) => c.name).join(", ")}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Visitas</dt>
              <dd className="text-foreground">
                {previewTimes.length} {previewTimes.length === 1 ? "visita" : "visitas"}
                {previewTimes.length > 0 && (
                  <span className="text-muted-foreground">
                    {" "}
                    (primera: {formatVisitEs(previewTimes[0]!)})
                  </span>
                )}
              </dd>
            </div>
            {generalNote && (
              <div>
                <dt className="font-medium text-muted-foreground">Nota general</dt>
                <dd className="text-foreground">{generalNote}</dd>
              </div>
            )}
          </dl>

          <p className="rounded-xl bg-secondary/60 px-4 py-3 text-sm text-secondary-foreground">
            Al publicar, el plan quedará «sin cuidador». Desde Planes podrás generar el enlace de
            invitación para tu cuidador (disponible muy pronto).
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" onClick={() => setStep(2)}>
              <ArrowLeft className="h-4 w-4" aria-hidden /> Atrás
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={saving || publishing}
                onClick={async () => {
                  setSaving(true);
                  const id = await saveDraft(3);
                  setSaving(false);
                  if (id) navigate({ to: "/planes" });
                }}
              >
                Guardar borrador
              </Button>
              <Button onClick={publish} disabled={publishing || saving}>
                {publishing ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Check className="h-4 w-4" aria-hidden />
                )}
                Publicar plan
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
