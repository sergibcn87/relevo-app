import { createFileRoute } from "@tanstack/react-router";

// Tarea programada (cada 5 min): avisa al propietario cuando una visita
// supera el margen de 90 minutos sin completarse. Una sola vez por visita.
// El bearer (clave pública del proyecto) solo filtra tráfico espurio:
// la operación es idempotente y no expone datos.

const DELAY_MINUTES = 90;

interface OverdueVisit {
  id: string;
  scheduled_at: string;
  plan_id: string;
  plans: {
    title: string;
    timezone: string;
    houses: { owner_id: string; name: string } | null;
  } | null;
}

export const Route = createFileRoute("/api/public/hooks/visitas-retrasadas")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) {
          return Response.json({ error: "No autorizado" }, { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const cutoff = new Date(Date.now() - DELAY_MINUTES * 60_000).toISOString();
        const { data: visits, error } = await supabaseAdmin
          .from("visits")
          .select(
            "id, scheduled_at, plan_id, plans!inner(status, title, timezone, houses!inner(owner_id, name))",
          )
          .eq("status", "programada")
          .is("delay_notified_at", null)
          .lt("scheduled_at", cutoff)
          .eq("plans.status", "activo");

        if (error) {
          return Response.json({ error: "Error al consultar visitas" }, { status: 500 });
        }

        const overdue = (visits ?? []) as unknown as OverdueVisit[];
        let notified = 0;

        for (const visit of overdue) {
          const plan = visit.plans;
          const owner = plan?.houses?.owner_id;
          if (!plan || !owner) continue;

          // Marcar primero: si dos ejecuciones coinciden, solo una avisa.
          const { data: claimed } = await supabaseAdmin
            .from("visits")
            .update({ delay_notified_at: new Date().toISOString() })
            .eq("id", visit.id)
            .is("delay_notified_at", null)
            .select("id");
          if (!claimed || claimed.length === 0) continue;

          const when = new Intl.DateTimeFormat("es-ES", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: plan.timezone || "Europe/Madrid",
          }).format(new Date(visit.scheduled_at));

          const message = `La visita del ${when} («${plan.title}») sigue sin completarse tras el margen de ${DELAY_MINUTES} minutos.`;

          await supabaseAdmin.from("notifications").insert({
            user_id: owner,
            plan_id: visit.plan_id,
            visit_id: visit.id,
            type: "visita_retrasada",
            message,
          });
          await supabaseAdmin.from("activity_events").insert({
            plan_id: visit.plan_id,
            actor_id: null,
            type: "visita_retrasada",
            message: `La visita del ${when} superó el margen de ${DELAY_MINUTES} minutos sin completarse.`,
          });
          notified += 1;
        }

        return Response.json({ ok: true, overdue: overdue.length, notified });
      },
    },
  },
});
