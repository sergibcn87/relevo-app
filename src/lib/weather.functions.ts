import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

/*
 * Meteorología (bloque 6 del PRD §11): Open-Meteo con atribución.
 * - Caché de 1 hora por casa en weather_cache (solo servidor).
 * - Geocodificación perezosa: la primera vez se guardan coordenadas
 *   aproximadas y zona horaria de la ciudad (sin dirección exacta).
 * - Se evalúa el día local de cada visita pendiente o en curso de planes
 *   abiertos/activos; solo fechas cubiertas por la API (16 días).
 * - No duplica: índice único (weather_rule_id, visit_id) + upsert con
 *   ignoreDuplicates. Si la API falla, no se generan sugerencias con
 *   datos caducados.
 */

const CACHE_MINUTES = 60;
const FORECAST_DAYS = 16;

interface ForecastPayload {
  daily?: {
    time?: string[];
    temperature_2m_max?: (number | null)[];
    wind_gusts_10m_max?: (number | null)[];
  };
}

interface GeocodingResponse {
  results?: { latitude: number; longitude: number; timezone?: string }[];
}

export type WeatherRefreshStatus = "ok" | "sin_ciudad" | "ciudad_no_encontrada" | "error_api";

export interface WeatherRefreshResult {
  status: WeatherRefreshStatus;
  created: number;
  fetchedAt: string | null;
}

export const refreshWeatherSuggestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { houseId: string }) => input)
  .handler(async ({ data, context }): Promise<WeatherRefreshResult> => {
    const { supabase, userId } = context;

    const { data: house } = await supabase
      .from("houses")
      .select("id, owner_id, city, city_lat, city_lon, timezone")
      .eq("id", data.houseId)
      .maybeSingle();

    if (!house || house.owner_id !== userId) {
      throw new Error("No autorizado");
    }
    if (!house.city) {
      return { status: "sin_ciudad", created: 0, fetchedAt: null };
    }

    // Geocodificación perezosa de la ciudad (una sola vez por casa)
    let lat = house.city_lat;
    let lon = house.city_lon;
    let timezone = house.timezone || "Europe/Madrid";
    if (lat == null || lon == null) {
      let geo: GeocodingResponse | null = null;
      try {
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(house.city)}&count=1&language=es&format=json`,
        );
        if (geoRes.ok) geo = (await geoRes.json()) as GeocodingResponse;
      } catch {
        geo = null;
      }
      const first = geo?.results?.[0];
      if (!first) {
        return { status: "ciudad_no_encontrada", created: 0, fetchedAt: null };
      }
      lat = first.latitude;
      lon = first.longitude;
      timezone = first.timezone || timezone;
      await supabase
        .from("houses")
        .update({ city_lat: lat, city_lon: lon, timezone })
        .eq("id", house.id);
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Caché de 1 hora por casa
    const { data: cache } = await supabaseAdmin
      .from("weather_cache")
      .select("fetched_at, payload")
      .eq("house_id", house.id)
      .maybeSingle();

    let payload = (cache?.payload ?? null) as ForecastPayload | null;
    let fetchedAt: string | null = cache?.fetched_at ?? null;
    const fresh =
      fetchedAt != null && Date.now() - new Date(fetchedAt).getTime() < CACHE_MINUTES * 60_000;

    if (!fresh) {
      try {
        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.searchParams.set("latitude", String(lat));
        url.searchParams.set("longitude", String(lon));
        url.searchParams.set("daily", "temperature_2m_max,wind_gusts_10m_max");
        url.searchParams.set("timezone", timezone);
        url.searchParams.set("forecast_days", String(FORECAST_DAYS));
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Open-Meteo respondió ${res.status}`);
        payload = (await res.json()) as ForecastPayload;
        fetchedAt = new Date().toISOString();
        await supabaseAdmin
          .from("weather_cache")
          .upsert({ house_id: house.id, fetched_at: fetchedAt, payload: payload as Json });
      } catch {
        // PRD: si falla la API se conservan las visitas y no se generan
        // sugerencias nuevas con datos caducados.
        return { status: "error_api", created: 0, fetchedAt };
      }
    }

    const daily = payload?.daily;
    if (!daily?.time?.length) {
      return { status: "error_api", created: 0, fetchedAt };
    }

    const { data: rules } = await supabase
      .from("weather_rules")
      .select("id, variable, threshold")
      .eq("house_id", house.id)
      .eq("active", true);

    if (!rules || rules.length === 0) {
      return { status: "ok", created: 0, fetchedAt };
    }

    const byDate = new Map<string, { temperatura_max: number | null; racha_viento: number | null }>();
    daily.time.forEach((date, i) => {
      byDate.set(date, {
        temperatura_max: daily.temperature_2m_max?.[i] ?? null,
        racha_viento: daily.wind_gusts_10m_max?.[i] ?? null,
      });
    });

    const { data: visitRows } = await supabase
      .from("visits")
      .select("id, scheduled_at, plans!inner(house_id, status)")
      .eq("plans.house_id", house.id)
      .in("plans.status", ["abierto", "activo"])
      .in("status", ["pendiente", "en_curso"]);

    const visits = (visitRows ?? []) as unknown as { id: string; scheduled_at: string }[];
    const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: timezone });

    const candidates: {
      visit_id: string;
      weather_rule_id: string;
      condition_text: string;
      forecast_date: string;
      forecast_value: number;
      source: string;
      fetched_at: string;
      status: string;
    }[] = [];
    const fetchedAtSure = fetchedAt as string;

    for (const visit of visits) {
      const localDate = dayFmt.format(new Date(visit.scheduled_at));
      const day = byDate.get(localDate);
      if (!day) continue; // la API no cubre esa fecha: no se evalúa
      for (const rule of rules) {
        const value =
          rule.variable === "temperatura_max" ? day.temperatura_max : day.racha_viento;
        const threshold = Number(rule.threshold);
        if (value == null || value <= threshold) continue;
        const rounded = Math.round(value * 10) / 10;
        candidates.push({
          visit_id: visit.id,
          weather_rule_id: rule.id,
          condition_text:
            rule.variable === "temperatura_max"
              ? `Temperatura máxima prevista de ${rounded} °C (tu umbral: ${threshold} °C)`
              : `Racha máxima prevista de ${rounded} km/h (tu umbral: ${threshold} km/h)`,
          forecast_date: localDate,
          forecast_value: rounded,
          source: "Open-Meteo",
          fetched_at: fetchedAtSure,
          status: "pendiente",
        });
      }
    }

    let created = 0;
    if (candidates.length > 0) {
      const { data: inserted } = await supabaseAdmin
        .from("weather_suggestions")
        .upsert(candidates, {
          onConflict: "weather_rule_id,visit_id",
          ignoreDuplicates: true,
        })
        .select("id");
      created = inserted?.length ?? 0;
    }

    return { status: "ok", created, fetchedAt };
  });
