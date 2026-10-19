import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayRunIdFetch } from "@/lib/ai/run-id";

/*
 * Crear plan con IA (bloque 5 del PRD).
 * - Modelo por defecto del gateway, endpoint /v1/responses con salida JSON
 *   estricta (json_schema).
 * - Trazabilidad: cada tarea cita un fragmento literal de su tarea de cuidado; el
 *   servidor descarta cualquier tarea cuyo fragmento no se pueda verificar.
 * - Nada se activa sin confirmación: la propuesta se guarda como
 *   ai_proposals.status = 'borrador' y solo confirmPlanProposal crea el plan.
 */

const MODEL = "openai/gpt-6-astra";
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/responses";

export interface ProposalTask {
  card_id: string;
  title: string;
  instructions: string;
  source_excerpt: string;
}

export interface ProposalVisit {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (24 h)
  tasks: ProposalTask[];
}

export interface PlanProposal {
  title: string;
  general_note: string | null;
  visits: ProposalVisit[];
  warnings: string[];
  questions: string[];
}

interface CardRow {
  id: string;
  name: string;
  category: string;
  room: string | null;
  instructions: string;
  important_note: string | null;
}

const PROPOSAL_SCHEMA = {
  type: "json_schema",
  name: "plan_proposal",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["title", "general_note", "visits", "warnings", "questions"],
    properties: {
      title: { type: "string", description: "Título corto del plan" },
      general_note: {
        type: ["string", "null"],
        description: "Nota general para el cuidador, o null si no aporta nada",
      },
      visits: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["date", "time", "tasks"],
          properties: {
            date: { type: "string", description: "YYYY-MM-DD, dentro de las fechas del plan" },
            time: { type: "string", description: "HH:MM en formato 24 h" },
            tasks: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["card_id", "title", "instructions", "source_excerpt"],
                properties: {
                  card_id: { type: "string", description: "id exacto de la tarea de cuidado origen" },
                  title: { type: "string" },
                  instructions: { type: "string" },
                  source_excerpt: {
                    type: "string",
                    description:
                      "Fragmento literal copiado de la tarea de cuidado (nombre, instrucciones o nota importante) que justifica la tarea",
                  },
                },
              },
            },
          },
        },
      },
      warnings: {
        type: "array",
        items: { type: "string" },
        description: "Contradicciones o cosas que el propietario debería revisar",
      },
      questions: {
        type: "array",
        items: { type: "string" },
        description: "Datos que faltan y la IA no debe inventar",
      },
    },
  },
} as const;

const SYSTEM_PROMPT = `Eres el asistente de planes de Relevo, una app para organizar el cuidado de casas (plantas, mascotas y hogar) durante las ausencias del propietario. A partir de la descripción de la ausencia y de las tareas de cuidado existentes (lista «tareas_de_cuidado»), propones las visitas y las tareas de cada visita.

Reglas estrictas:
- No inventes cantidades, horarios, frecuencias ni cuidados que no aparezcan en las tareas de cuidado o en la descripción del propietario.
- Cada tarea de visita debe basarse en una tarea de cuidado concreta: usa su card_id exacto y copia en source_excerpt el fragmento literal de esa tarea de cuidado (de su nombre, instrucciones o nota importante) que la justifica. No parafrasees el fragmento: cópialo tal cual.
- Las visitas solo pueden caer dentro de las fechas del plan (salida y vuelta incluidas). Usa horas razonables en formato HH:MM (24 h).
- Si la descripción contradice una tarea de cuidado, respeta la tarea de cuidado y anota la contradicción en warnings.
- Si falta un dato importante (por ejemplo, cada cuánto regar una planta), no lo inventes: añade una pregunta en questions y crea la tarea solo si la tarea de cuidado ya lo especifica.
- Reparte las tareas entre las visitas según la frecuencia que indique cada tarea de cuidado; si una tarea de cuidado no indica frecuencia, inclúyela en todas las visitas.
- Escribe todo en español de España.`;

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Comprueba que el fragmento es literal dentro del contenido de la tarea de cuidado. */
function excerptIsVerifiable(excerpt: string, card: CardRow): boolean {
  const haystack = normalize(
    [card.name, card.instructions, card.important_note ?? ""].join("\n"),
  );
  const needle = normalize(excerpt);
  return needle.length >= 8 && haystack.includes(needle);
}

/** Validación en servidor: descarta lo no verificable y devuelve avisos. */
function validateProposal(
  raw: PlanProposal,
  cards: CardRow[],
  startDate: string,
  endDate: string,
): { proposal: PlanProposal; dropped: string[] } {
  const cardMap = new Map(cards.map((c) => [c.id, c]));
  const dropped: string[] = [];
  const visits: ProposalVisit[] = [];

  for (const visit of raw.visits ?? []) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(visit.date) || visit.date < startDate || visit.date > endDate) {
      dropped.push("Se descartó una visita fuera de las fechas del plan.");
      continue;
    }
    if (!/^\d{2}:\d{2}$/.test(visit.time)) {
      dropped.push("Se descartó una visita con una hora no válida.");
      continue;
    }
    const tasks: ProposalTask[] = [];
    for (const task of visit.tasks ?? []) {
      const card = cardMap.get(task.card_id);
      if (!card) {
        dropped.push(`Se descartó «${task.title}»: no corresponde a ninguna de tus tareas.`);
        continue;
      }
      if (!task.title.trim() || !task.instructions.trim()) {
        dropped.push("Se descartó una tarea incompleta.");
        continue;
      }
      if (!excerptIsVerifiable(task.source_excerpt, card)) {
        dropped.push(
          `Se descartó «${task.title}»: la IA no citó un fragmento literal de su tarea de origen.`,
        );
        continue;
      }
      tasks.push({
        card_id: task.card_id,
        title: task.title.trim().slice(0, 120),
        instructions: task.instructions.trim().slice(0, 1000),
        source_excerpt: task.source_excerpt.trim().slice(0, 500),
      });
    }
    if (tasks.length > 0) visits.push({ date: visit.date, time: visit.time, tasks });
    else dropped.push("Se descartó una visita que se quedó sin tareas verificables.");
  }

  visits.sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));

  return {
    proposal: {
      title: (raw.title ?? "").trim().slice(0, 100),
      general_note: raw.general_note?.trim().slice(0, 500) || null,
      visits: visits.slice(0, 60),
      warnings: (raw.warnings ?? []).map((w) => w.slice(0, 300)),
      questions: (raw.questions ?? []).map((q) => q.slice(0, 300)),
    },
    dropped,
  };
}

/** Convierte fecha + hora locales de la zona de la casa a ISO UTC. */
function zonedToUtcIso(date: string, time: string, timeZone: string): string {
  const [y = 1970, mo = 1, d = 1] = date.split("-").map(Number);
  const [h = 0, mi = 0] = time.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    fmt
      .formatToParts(new Date(guess))
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    Number(parts["year"]),
    Number(parts["month"]) - 1,
    Number(parts["day"]),
    Number(parts["hour"]),
    Number(parts["minute"]),
  );
  return new Date(guess - (asUtc - guess)).toISOString();
}

/** Consume el stream SSE del gateway y devuelve el texto completo. */
async function readResponsesStream(response: Response): Promise<string> {
  if (!response.body) throw new Error("Respuesta vacía del servicio de IA.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const event of events) {
      const dataLine = event
        .split("\n")
        .find((line) => line.startsWith("data:"));
      if (!dataLine) continue;
      const payload = dataLine.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const parsed = JSON.parse(payload) as {
          type?: string;
          delta?: string;
          error?: { message?: string };
          response?: { error?: { message?: string } };
        };
        if (parsed.type === "response.output_text.delta" && parsed.delta) {
          text += parsed.delta;
        } else if (parsed.type === "response.failed" || parsed.type === "error") {
          throw new Error(
            parsed.error?.message ??
              parsed.response?.error?.message ??
              "El servicio de IA no pudo completar la propuesta.",
          );
        }
      } catch (error) {
        if (error instanceof SyntaxError) continue;
        throw error;
      }
    }
  }
  return text;
}

function gatewayErrorMessage(status: number, bodyText: string): string {
  let upstream = "";
  try {
    const parsed = JSON.parse(bodyText) as { error?: { message?: string }; message?: string };
    upstream = parsed.error?.message ?? parsed.message ?? "";
  } catch {
    upstream = "";
  }
  if (status === 401) return "La conexión con el servicio de IA no está configurada.";
  if (status === 402 || status === 403) {
    return upstream || "El servicio de IA no está disponible ahora mismo (créditos o permisos).";
  }
  if (status === 429) return "El servicio de IA está ocupado; inténtalo de nuevo en unos minutos.";
  if (status >= 500) return "El servicio de IA ha fallado; inténtalo de nuevo en unos minutos.";
  return "No se ha podido generar la propuesta. Revisa la descripción e inténtalo de nuevo.";
}

export const generatePlanProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { houseId: string; title: string; startDate: string; endDate: string; inputText: string }) =>
      input,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { houseId, title, startDate, endDate, inputText } = data;

    if (!inputText.trim() || inputText.trim().length < 20) {
      return { ok: false as const, error: "Describe la ausencia con un poco más de detalle (mínimo 20 caracteres)." };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate) {
      return { ok: false as const, error: "Revisa las fechas: la vuelta no puede ser antes de la salida." };
    }

    // La casa y las tareas se leen con RLS: solo el propietario llega aquí.
    const { data: house } = await supabase
      .from("houses")
      .select("id, name, timezone")
      .eq("id", houseId)
      .maybeSingle();
    if (!house) return { ok: false as const, error: "No se ha encontrado la casa." };

    const { data: cards } = await supabase
      .from("care_cards")
      .select("id, name, category, room, instructions, important_note")
      .eq("house_id", houseId)
      .eq("archived", false)
      .order("created_at", { ascending: true });
    const cardRows = (cards ?? []) as CardRow[];
    if (cardRows.length === 0) {
      return { ok: false as const, error: "Esta casa aún no tiene tareas activas. Crea al menos una antes de usar la IA." };
    }

    const userPayload = {
      descripcion_ausencia: inputText.trim(),
      titulo_sugerido: title.trim() || null,
      fechas: { salida: startDate, vuelta: endDate },
      casa: house.name,
      tareas_de_cuidado: cardRows.map((c) => ({
        id: c.id,
        nombre: c.name,
        categoria: c.category,
        estancia: c.room,
        instrucciones: c.instructions,
        nota_importante: c.important_note,
      })),
    };

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      return { ok: false as const, error: "La conexión con el servicio de IA no está configurada." };
    }

    const gateway = createLovableAiGatewayRunIdFetch();
    let proposalText: string;
    try {
      const response = await gateway.fetch(GATEWAY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model: MODEL,
          instructions: SYSTEM_PROMPT,
          input: [
            {
              role: "user",
              content:
                "Genera la propuesta de plan en JSON para esta ausencia:\n\n" +
                JSON.stringify(userPayload, null, 2),
            },
          ],
          stream: true,
          store: false,
          reasoning: { effort: "low", summary: "auto" },
          include: ["reasoning.encrypted_content"],
          text: { format: PROPOSAL_SCHEMA },
        }),
      });
      if (!response.ok) {
        const bodyText = await response.text();
        return { ok: false as const, error: gatewayErrorMessage(response.status, bodyText) };
      }
      proposalText = await readResponsesStream(response);
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : "El servicio de IA ha fallado.",
      };
    }

    if (!proposalText.trim()) {
      return { ok: false as const, error: "El servicio de IA devolvió una propuesta vacía. Inténtalo de nuevo." };
    }

    let raw: PlanProposal;
    try {
      raw = JSON.parse(proposalText) as PlanProposal;
    } catch {
      return { ok: false as const, error: "La propuesta de la IA no tenía un formato válido. Inténtalo de nuevo." };
    }

    const { proposal, dropped } = validateProposal(raw, cardRows, startDate, endDate);
    if (!proposal.title) proposal.title = title.trim() || "Plan sin título";
    proposal.warnings = [...proposal.warnings, ...dropped];

    if (proposal.visits.length === 0) {
      const nothingNeeded = dropped.length === 0;
      await supabase.from("ai_proposals").insert({
        house_id: houseId,
        created_by: userId,
        start_date: startDate,
        end_date: endDate,
        input_text: inputText.trim(),
        proposal: null,
        status: "borrador",
        error: nothingNeeded
          ? "La IA no propone ninguna visita para estas fechas."
          : "La propuesta no contenía ninguna visita con tareas verificables.",
      });
      // Si la IA concluye que no hace falta ninguna visita, su explicación
      // (general_note) se muestra como aviso persistente junto al formulario.
      return {
        ok: false as const,
        error: nothingNeeded
          ? "La IA no propone ninguna visita para estas fechas."
          : "La IA no ha podido proponer visitas con tareas verificables. Revisa las preguntas y avisos, completa tus tareas e inténtalo de nuevo.",
        warnings: proposal.general_note
          ? [proposal.general_note, ...proposal.warnings]
          : proposal.warnings,
        questions: proposal.questions,
      };
    }

    const proposalId = crypto.randomUUID();
    const { error: insertError } = await supabase.from("ai_proposals").insert({
      id: proposalId,
      house_id: houseId,
      created_by: userId,
      start_date: startDate,
      end_date: endDate,
      input_text: inputText.trim(),
      proposal: proposal as never,
      status: "borrador",
    });
    if (insertError) {
      return { ok: false as const, error: "La propuesta se generó, pero no se pudo guardar. Inténtalo de nuevo." };
    }

    return { ok: true as const, proposalId, proposal };
  });

export const confirmPlanProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { proposalId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: row } = await supabase
      .from("ai_proposals")
      .select("id, house_id, start_date, end_date, proposal, status")
      .eq("id", data.proposalId)
      .maybeSingle();
    if (!row) return { ok: false as const, error: "No se ha encontrado la propuesta." };
    if (row.status !== "borrador" || !row.proposal) {
      return { ok: false as const, error: "Esta propuesta ya se ha utilizado o descartado." };
    }

    const { data: house } = await supabase
      .from("houses")
      .select("id, name, timezone")
      .eq("id", row.house_id)
      .maybeSingle();
    if (!house) return { ok: false as const, error: "No se ha encontrado la casa." };

    // Revalidar contra las tareas actuales por si cambiaron desde la propuesta.
    const { data: cards } = await supabase
      .from("care_cards")
      .select("id, name, category, room, instructions, important_note")
      .eq("house_id", row.house_id)
      .eq("archived", false);
    const cardRows = (cards ?? []) as CardRow[];
    const { proposal } = validateProposal(
      row.proposal as unknown as PlanProposal,
      cardRows,
      row.start_date,
      row.end_date,
    );
    if (proposal.visits.length === 0) {
      return { ok: false as const, error: "Las tareas han cambiado y la propuesta ya no es válida. Genera una nueva." };
    }

    // Nada se activa hasta aquí: el usuario ya ha confirmado la revisión.
    const planId = crypto.randomUUID();
    const { error: planError } = await supabase.from("plans").insert({
      id: planId,
      house_id: row.house_id,
      title: proposal.title,
      start_date: row.start_date,
      end_date: row.end_date,
      general_note: proposal.general_note,
      status: "abierto",
      timezone: house.timezone || "Europe/Madrid",
    });
    if (planError) return { ok: false as const, error: "No se ha podido crear el plan." };

    const tz = house.timezone || "Europe/Madrid";
    const visitRows = proposal.visits.map((v) => ({
      id: crypto.randomUUID(),
      plan_id: planId,
      scheduled_at: zonedToUtcIso(v.date, v.time, tz),
      status: "pendiente",
    }));
    const { error: visitsError } = await supabase.from("visits").insert(visitRows);
    if (visitsError) {
      return { ok: false as const, error: "El plan se creó, pero no sus visitas. Edítalo desde Planes." };
    }

    // La tarea conserva copia de las instrucciones; el fragmento de origen
    // queda guardado en ai_proposals para trazabilidad.
    const taskRows = proposal.visits.flatMap((v, vi) =>
      v.tasks.map((t, ti) => ({
        visit_id: visitRows[vi]!.id,
        care_card_id: t.card_id,
        title: t.title,
        instructions: t.instructions,
        source: "ia",
        sort_order: ti,
      })),
    );
    const { error: tasksError } = await supabase.from("tasks").insert(taskRows);
    if (tasksError) {
      return { ok: false as const, error: "Las visitas se crearon, pero no las tareas. Edita el plan desde Planes." };
    }

    await supabase
      .from("ai_proposals")
      .update({ status: "guardada" })
      .eq("id", row.id);

    await supabase.from("activity_events").insert({
      plan_id: planId,
      actor_id: userId,
      type: "plan_publicado",
      message: `Plan «${proposal.title}» creado con IA: ${visitRows.length} visitas y ${taskRows.length} tareas.`,
    });

    return { ok: true as const, planId };
  });

export const discardPlanProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { proposalId: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("ai_proposals")
      .update({ status: "descartada" })
      .eq("id", data.proposalId)
      .eq("status", "borrador");
    if (error) return { ok: false as const, error: "No se ha podido descartar la propuesta." };
    return { ok: true as const };
  });
