import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CloudSun, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { refreshWeatherSuggestions } from "@/lib/weather.functions";
import { formatDateEs } from "@/lib/visits";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const THROTTLE_MS = 15 * 60 * 1000;

/**
 * Actualiza la previsión de una casa como mucho una vez cada 15 minutos por
 * dispositivo (el servidor además cachea 1 hora). Devuelve null si se omite.
 */
export async function refreshHouseWeatherThrottled(houseId: string) {
  const key = `relevo-weather-refresh-${houseId}`;
  const last = Number(sessionStorage.getItem(key) ?? "0");
  if (Date.now() - last < THROTTLE_MS) return null;
  sessionStorage.setItem(key, String(Date.now()));
  return refreshWeatherSuggestions({ data: { houseId } });
}

interface VisitLite {
  id: string;
  scheduled_at: string;
  status: string;
}

interface SuggestionRow {
  id: string;
  visit_id: string;
  condition_text: string;
  forecast_date: string;
  source: string;
  fetched_at: string;
  status: string;
  weather_rules: {
    instruction: string;
    care_cards: { name: string } | null;
  } | null;
}

interface WeatherSuggestionsProps {
  planId: string;
  houseId: string;
  houseCity: string | null;
  visits: VisitLite[];
}

/**
 * Bloque compacto de sugerencias meteorológicas del plan (PRD §11 y §14).
 * Solo para el propietario: acepta la sugerencia como tarea adicional de la
 * visita o la descarta. Las tareas aceptadas cuentan en el total de la visita.
 */
export function WeatherSuggestions({ planId, houseId, houseCity, visits }: WeatherSuggestionsProps) {
  const queryClient = useQueryClient();
  const [refreshIssue, setRefreshIssue] = useState<"error" | "ciudad" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const visitIds = visits.map((v) => v.id);

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ["weather-suggestions", planId],
    enabled: visitIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("weather_suggestions")
        .select(
          "id, visit_id, condition_text, forecast_date, source, fetched_at, status, weather_rules(instruction, care_cards(name))",
        )
        .in("visit_id", visitIds)
        .neq("status", "descartada")
        .order("forecast_date", { ascending: true });
      return (data ?? []) as unknown as SuggestionRow[];
    },
  });

  useEffect(() => {
    if (!houseCity) return;
    let cancelled = false;
    refreshHouseWeatherThrottled(houseId)
      .then((result) => {
        if (cancelled || !result) return;
        setRefreshIssue(
          result.status === "error_api"
            ? "error"
            : result.status === "ciudad_no_encontrada"
              ? "ciudad"
              : null,
        );
        if (result.status === "ok" && result.created > 0) {
          queryClient.invalidateQueries({ queryKey: ["weather-suggestions", planId] });
        }
      })
      .catch(() => {
        if (!cancelled) setRefreshIssue("error");
      });
    return () => {
      cancelled = true;
    };
  }, [houseId, houseCity, planId, queryClient]);

  async function accept(id: string) {
    setBusyId(id);
    const { error } = await supabase.rpc("accept_weather_suggestion", { _suggestion_id: id });
    setBusyId(null);
    if (error) {
      toast.error(
        error.message.includes("cerrada")
          ? "La visita ya está cerrada: no se puede añadir la tarea."
          : "No se ha podido aceptar la sugerencia.",
      );
      return;
    }
    toast.success("Tarea añadida a la visita.");
    queryClient.invalidateQueries({ queryKey: ["weather-suggestions", planId] });
    queryClient.invalidateQueries({ queryKey: ["plan-visits", planId] });
    queryClient.invalidateQueries({ queryKey: ["visit"] });
  }

  async function dismiss(id: string) {
    setBusyId(id);
    const { error } = await supabase
      .from("weather_suggestions")
      .update({ status: "descartada" })
      .eq("id", id)
      .eq("status", "pendiente");
    setBusyId(null);
    if (error) {
      toast.error("No se ha podido descartar la sugerencia.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["weather-suggestions", planId] });
  }

  const pending = suggestions.filter((s) => s.status === "pendiente");
  const accepted = suggestions.filter((s) => s.status === "aceptada");
  const lastFetched = suggestions.reduce<string | null>(
    (latest, s) => (latest == null || s.fetched_at > latest ? s.fetched_at : latest),
    null,
  );

  return (
    <Card className="mt-6 p-5 animate-fade-up-2">
      <div className="flex items-center gap-2">
        <CloudSun className="h-5 w-5 text-primary" aria-hidden />
        <h2 className="text-base font-semibold text-card-foreground">Tiempo</h2>
      </div>

      {!houseCity ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Añade una ciudad en «Editar casa» (desde Resumen) para activar las sugerencias
          meteorológicas de este plan.
        </p>
      ) : (
        <>
          {refreshIssue === "error" && (
            <p className="mt-2 rounded-xl bg-warning/10 px-3 py-2 text-xs text-warning">
              No se pudo actualizar la previsión. Se conservan las sugerencias anteriores.
            </p>
          )}
          {refreshIssue === "ciudad" && (
            <p className="mt-2 rounded-xl bg-warning/10 px-3 py-2 text-xs text-warning">
              No se encontraron coordenadas para «{houseCity}». Revisa el nombre en «Editar casa».
            </p>
          )}

          {isLoading ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Consultando la previsión…
            </p>
          ) : pending.length === 0 && accepted.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Sin sugerencias de tiempo para las próximas visitas. Puedes crear reglas
              meteorológicas desde «Editar casa» en Resumen.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {pending.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-background px-4 py-3"
                >
                  <p className="text-sm font-medium text-foreground">{s.condition_text}</p>
                  <p className="text-xs text-muted-foreground">
                    Para el {formatDateEs(s.forecast_date)} · {s.weather_rules?.instruction}
                    {s.weather_rules?.care_cards?.name
                      ? ` · Ficha: ${s.weather_rules.care_cards.name}`
                      : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busyId === s.id}
                      onClick={() => accept(s.id)}
                    >
                      {busyId === s.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Check className="h-4 w-4" aria-hidden />
                      )}
                      Añadir como tarea
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyId === s.id}
                      onClick={() => dismiss(s.id)}
                    >
                      <X className="h-4 w-4" aria-hidden /> Descartar
                    </Button>
                  </div>
                </li>
              ))}
              {accepted.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-primary/5 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{s.condition_text}</p>
                    <p className="text-xs text-muted-foreground">
                      Para el {formatDateEs(s.forecast_date)} · {s.weather_rules?.instruction}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    Añadida a la visita
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-3 text-xs text-muted-foreground">
            Datos de Open-Meteo
            {lastFetched
              ? ` · actualizado el ${new Date(lastFetched).toLocaleString("es-ES", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}`
              : ""}
            .
          </p>
        </>
      )}
    </Card>
  );
}
