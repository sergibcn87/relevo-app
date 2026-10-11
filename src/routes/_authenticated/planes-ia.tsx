import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CircleAlert,
  CircleHelp,
  Home,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  confirmPlanProposal,
  discardPlanProposal,
  generatePlanProposal,
  type PlanProposal,
} from "@/lib/ai-plan.functions";
import { formatDateEs } from "@/lib/visits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/planes-ia")({
  head: () => ({
    meta: [
      { title: "Crear plan con IA — Relevo" },
      { name: "description", content: "Describe tu ausencia y revisa la propuesta de la IA antes de crear el plan." },
      { property: "og:title", content: "Crear plan con IA — Relevo" },
      { property: "og:description", content: "Describe tu ausencia y revisa la propuesta de la IA antes de crear el plan." },
    ],
  }),
  component: PlanesIaPage,
});

interface CardInfo {
  id: string;
  name: string;
  category: string;
  room: string | null;
  instructions: string;
  important_note: string | null;
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Resalta el fragmento citado dentro del texto de la ficha. */
function Highlighted({ text, excerpt }: { text: string; excerpt: string | null }) {
  if (!excerpt) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(excerpt.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-warning/25 px-0.5 text-foreground">
        {text.slice(idx, idx + excerpt.length)}
      </mark>
      {text.slice(idx + excerpt.length)}
    </>
  );
}

function PlanesIaPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [phase, setPhase] = useState<"form" | "review">("form");
  const [generating, setGenerating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [proposal, setProposal] = useState<PlanProposal | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

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
    queryKey: ["care-cards-full", house?.id],
    enabled: !!house,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("care_cards")
        .select("id, name, category, room, instructions, important_note")
        .eq("house_id", house!.id)
        .eq("archived", false)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CardInfo[];
    },
  });

  const usedCards = useMemo(() => {
    if (!proposal) return [];
    const ids = new Set<string>();
    for (const visit of proposal.visits) for (const task of visit.tasks) ids.add(task.card_id);
    return cards.filter((c) => ids.has(c.id));
  }, [proposal, cards]);

  const excerptByCard = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!proposal) return map;
    for (const visit of proposal.visits) {
      for (const task of visit.tasks) {
        const list = map.get(task.card_id) ?? [];
        if (!list.includes(task.source_excerpt)) list.push(task.source_excerpt);
        map.set(task.card_id, list);
      }
    }
    return map;
  }, [proposal]);

  function formValid(): boolean {
    return !!startDate && !!endDate && endDate >= startDate && description.trim().length >= 20;
  }

  async function handleGenerate(event: FormEvent) {
    event.preventDefault();
    if (!house || !formValid()) return;
    setGenerating(true);
    const result = await generatePlanProposal({
      data: {
        houseId: house.id,
        title: title.trim(),
        startDate,
        endDate,
        inputText: description,
      },
    });
    setGenerating(false);
    if (!result.ok) {
      toast.error(result.error);
      if ("warnings" in result && result.warnings?.length) {
        for (const w of result.warnings) toast.warning(w);
      }
      return;
    }
    setProposalId(result.proposalId);
    setProposal(result.proposal);
    setPhase("review");
  }

  async function handleConfirm() {
    if (!proposalId) return;
    setConfirming(true);
    const result = await confirmPlanProposal({ data: { proposalId } });
    setConfirming(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Plan creado. Ya puedes invitar a tu cuidador.");
    navigate({ to: "/planes/$planId", params: { planId: result.planId } });
  }

  async function handleDiscard() {
    if (proposalId) await discardPlanProposal({ data: { proposalId } });
    toast.success("Propuesta descartada.");
    navigate({ to: "/planes" });
  }

  if (loadingHouses) {
    return (
      <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Preparando…
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
            La IA trabaja sobre las fichas de tu casa. Crea la casa desde el Resumen y vuelve aquí.
          </p>
          <Link to="/inicio">
            <Button variant="secondary" size="sm">Ir al Resumen</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        to="/planes"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Volver a Planes
      </Link>

      <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-foreground">
        <Sparkles className="h-6 w-6 text-primary" aria-hidden /> Crear plan con IA
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {house.name} · la IA propone, tú decides: nada se crea sin tu confirmación.
      </p>

      {phase === "form" && (
        <form onSubmit={handleGenerate} className="mt-6 flex flex-col gap-5">
          <Card className="flex flex-col gap-4 p-6 animate-fade-up">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-title">
                Título del plan <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="ai-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Por ejemplo: Puente de octubre"
                maxLength={100}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ai-start">Salida</Label>
                <Input
                  id="ai-start"
                  type="date"
                  value={startDate}
                  min={todayIso()}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ai-end">Vuelta</Label>
                <Input
                  id="ai-end"
                  type="date"
                  value={endDate}
                  min={startDate || todayIso()}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-description">Describe tu ausencia</Label>
              <Textarea
                id="ai-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Por ejemplo: nos vamos del 20 al 25 de octubre. La Monstera necesita riego dos veces por semana y a Milo hay que darle de comer cada día, mañana y noche…"
                rows={6}
                maxLength={2000}
                required
              />
              <p className="text-xs text-muted-foreground">
                La IA solo usa lo que digan tus fichas y esta descripción: si falta un dato, te lo
                preguntará en lugar de inventarlo.
              </p>
            </div>
            <div className="mt-1 flex justify-end">
              <Button type="submit" disabled={generating || !formValid()}>
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Generando propuesta…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" aria-hidden /> Generar propuesta
                  </>
                )}
              </Button>
            </div>
          </Card>
        </form>
      )}

      {phase === "review" && proposal && (
        <div className="mt-6 flex flex-col gap-5">
          {(proposal.warnings.length > 0 || proposal.questions.length > 0) && (
            <div className="flex flex-col gap-3">
              {proposal.warnings.map((w, i) => (
                <p
                  key={`w-${i}`}
                  className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning animate-fade-up"
                >
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {w}
                </p>
              ))}
              {proposal.questions.map((q, i) => (
                <p
                  key={`q-${i}`}
                  className="flex items-start gap-2 rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-secondary-foreground animate-fade-up"
                >
                  <CircleHelp className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {q}
                </p>
              ))}
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Propuesta */}
            <section aria-label="Propuesta de la IA" className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Propuesta · {proposal.title}
              </h2>
              {proposal.general_note && (
                <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-card-foreground">
                  {proposal.general_note}
                </p>
              )}
              {proposal.visits.map((visit, vi) => (
                <Card key={`${visit.date}-${visit.time}-${vi}`} className="p-4 animate-fade-up">
                  <p className="text-sm font-semibold text-card-foreground">
                    {formatDateEs(visit.date)} · {visit.time} h
                  </p>
                  <ul className="mt-2 flex flex-col gap-2">
                    {visit.tasks.map((task, ti) => (
                      <li key={`${task.card_id}-${ti}`}>
                        <button
                          type="button"
                          onClick={() => setActiveCardId(task.card_id)}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-left transition-colors hover:border-primary/40"
                        >
                          <p className="text-sm font-medium text-foreground">{task.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{task.instructions}</p>
                          <p className="mt-1 text-xs italic text-muted-foreground">
                            «{task.source_excerpt}»
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </section>

            {/* Fragmentos de origen */}
            <section aria-label="Fragmentos de origen" className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                De dónde sale cada tarea
              </h2>
              {usedCards.map((card) => (
                <Card
                  key={card.id}
                  className={
                    activeCardId === card.id
                      ? "border-primary/50 p-4"
                      : "p-4"
                  }
                >
                  <p className="text-sm font-semibold text-card-foreground">
                    {card.name}
                    {card.room && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {card.room}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                    <Highlighted
                      text={card.instructions}
                      excerpt={excerptByCard.get(card.id)?.[0] ?? null}
                    />
                  </p>
                  {card.important_note && (
                    <p className="mt-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
                      <Highlighted
                        text={card.important_note}
                        excerpt={excerptByCard.get(card.id)?.[0] ?? null}
                      />
                    </p>
                  )}
                </Card>
              ))}
            </section>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleConfirm} disabled={confirming}>
              {confirming && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Crear plan con esta propuesta
            </Button>
            <Button type="button" variant="outline" onClick={() => setPhase("form")}>
              Modificar la descripción
            </Button>
            <Button type="button" variant="ghost" onClick={handleDiscard}>
              Descartar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            El plan se creará como «Sin cuidador»: después podrás invitar a tu cuidador desde la
            ficha del plan.
          </p>
        </div>
      )}
    </div>
  );
}
