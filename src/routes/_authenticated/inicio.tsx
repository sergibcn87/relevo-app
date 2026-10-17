import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { CloudSun, Home, Loader2, MapPin, PawPrint, Pencil, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { HouseSettings, type HouseSummary } from "@/components/house-settings";
import { refreshHouseWeatherThrottled } from "@/components/weather-suggestions";
import { formatDateEs } from "@/lib/visits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({
    meta: [
      { title: "Resumen — Relevo" },
      { name: "description", content: "Resumen de tu casa, planes y visitas en Relevo." },
      { property: "og:title", content: "Resumen — Relevo" },
      { property: "og:description", content: "Resumen de tu casa, planes y visitas en Relevo." },
    ],
  }),
  component: InicioPage,
});

function InicioPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [houseName, setHouseName] = useState("");
  const [houseCity, setHouseCity] = useState("");
  const [saving, setSaving] = useState(false);
  const [settingsHouse, setSettingsHouse] = useState<HouseSummary | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: houses = [], isLoading: loadingHouses } = useQuery({
    queryKey: ["houses", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("houses")
        .select("id, name, city, rooms, is_demo")
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const { data: caregiverPlans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ["caregiver-plans", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("plans")
        .select("id, title, start_date, end_date, status")
        .eq("caregiver_id", user.id)
        .order("start_date", { ascending: true });
      return data ?? [];
    },
  });

  // Sugerencias meteorológicas pendientes de las casas del propietario (PRD §12: el panel las muestra)
  const { data: weatherPending = [] } = useQuery({
    queryKey: ["weather-pending", user.id],
    enabled: houses.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("weather_suggestions")
        .select(
          "id, forecast_date, condition_text, visits!inner(plan_id, plans!inner(title, houses!inner(owner_id)))",
        )
        .eq("status", "pendiente")
        .eq("visits.plans.houses.owner_id", user.id)
        .order("forecast_date", { ascending: true })
        .limit(4);
      return (data ?? []) as unknown as {
        id: string;
        forecast_date: string;
        condition_text: string;
        visits: { plan_id: string; plans: { title: string } | null } | null;
      }[];
    },
  });

  // Actualiza la previsión de las casas con ciudad (limitado: 15 min por
  // dispositivo aquí y 1 h de caché en el servidor)
  useEffect(() => {
    const withCity = houses.filter((h) => h.city);
    if (withCity.length === 0) return;
    let cancelled = false;
    (async () => {
      let anyCreated = false;
      for (const house of withCity) {
        try {
          const result = await refreshHouseWeatherThrottled(house.id);
          if (result && result.status === "ok" && result.created > 0) anyCreated = true;
        } catch {
          // El panel no bloquea por un fallo puntual de la previsión
        }
      }
      if (!cancelled && anyCreated) {
        queryClient.invalidateQueries({ queryKey: ["weather-pending", user.id] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [houses, queryClient, user.id]);

  async function handleCreateHouse(event: FormEvent) {
    event.preventDefault();
    if (!houseName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("houses").insert({
      owner_id: user.id,
      name: houseName.trim(),
      city: houseCity.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error("No se ha podido crear la casa. Inténtalo de nuevo.");
    } else {
      toast.success("Casa creada. Ya puedes empezar a prepararla.");
      setHouseName("");
      setHouseCity("");
      queryClient.invalidateQueries({ queryKey: ["houses", user.id] });
    }
  }

  const firstName = profile?.display_name?.split(" ")[0] ?? "";
  const isLoading = loadingHouses || loadingPlans;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground animate-fade-up">
        Hola{firstName ? `, ${firstName}` : ""}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground animate-fade-up">
        Este es el resumen de tus casas y planes.
      </p>

      {isLoading ? (
        <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Cargando tu información…
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {houses.length === 0 && caregiverPlans.length === 0 && (
            <Card className="p-6 bg-hero-card animate-fade-up-1">
              <div className="flex items-start gap-3">
                <Home className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden />
                <div>
                  <h2 className="text-lg font-semibold text-card-foreground">Crea tu casa</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tu casa reúne las fichas de cuidado (plantas, mascotas y hogar) que luego se
                    usan en cada plan. Si alguien te ha invitado como cuidador, no necesitas crear
                    una casa: abre el enlace de invitación.
                  </p>
                </div>
              </div>
              <form onSubmit={handleCreateHouse} className="mt-5 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="house-name">Nombre de la casa</Label>
                  <Input
                    id="house-name"
                    value={houseName}
                    onChange={(e) => setHouseName(e.target.value)}
                    placeholder="Por ejemplo: Casa Olmo"
                    maxLength={80}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="house-city">
                    Ciudad <span className="font-normal text-muted-foreground">(opcional, para el tiempo)</span>
                  </Label>
                  <Input
                    id="house-city"
                    value={houseCity}
                    onChange={(e) => setHouseCity(e.target.value)}
                    placeholder="Por ejemplo: Valencia"
                    maxLength={80}
                  />
                </div>
                <Button type="submit" disabled={saving || !houseName.trim()} className="self-start">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  Crear mi casa
                </Button>
              </form>
            </Card>
          )}

          {houses.map((house) => (
            <Card key={house.id} className="p-6 bg-hero-card animate-fade-up-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-card-foreground">
                    {house.name}
                    {house.is_demo && (
                      <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 align-middle text-xs font-semibold text-secondary-foreground">
                        Demostración
                      </span>
                    )}
                  </h2>
                  {house.city && (
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" aria-hidden /> {house.city}
                    </p>
                  )}
                </div>
                <Home className="h-6 w-6 text-primary" aria-hidden />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Añade fichas de cuidado desde la sección Fichas y crea tu primera ausencia desde
                Planes.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/fichas">
                  <Button variant="secondary" size="sm">
                    <PawPrint className="h-4 w-4" aria-hidden /> Ver fichas
                  </Button>
                </Link>
                <Link to="/planes">
                  <Button variant="outline" size="sm">
                    <MapPin className="h-4 w-4" aria-hidden /> Ver planes
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => setSettingsHouse(house)}>
                  <Pencil className="h-4 w-4" aria-hidden /> Editar casa
                </Button>
              </div>
            </Card>
          ))}

          {houses.length > 0 && (
            <Card className="p-6 animate-fade-up-2">
              <div className="flex items-center gap-2">
                <CloudSun className="h-5 w-5 text-primary" aria-hidden />
                <h2 className="text-lg font-semibold text-card-foreground">Tiempo</h2>
              </div>
              {weatherPending.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Sin sugerencias de tiempo pendientes. Puedes crear reglas meteorológicas desde
                  «Editar casa».
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {weatherPending.map((s) => (
                    <li key={s.id}>
                      <Link
                        to="/planes/$planId"
                        params={{ planId: s.visits?.plan_id ?? "" }}
                        className="flex flex-col gap-0.5 rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:bg-secondary/40"
                      >
                        <span className="text-sm font-medium text-foreground">
                          {s.condition_text}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {s.visits?.plans?.title ?? "Plan"} · {formatDateEs(s.forecast_date)} —
                          revisar en el plan
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-muted-foreground">Datos de Open-Meteo.</p>
            </Card>
          )}

          {caregiverPlans.length > 0 && (
            <Card className="p-6 animate-fade-up-2">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" aria-hidden />
                <h2 className="text-lg font-semibold text-card-foreground">Planes como cuidador</h2>
              </div>
              <ul className="mt-3 flex flex-col gap-2">
                {caregiverPlans.map((plan) => (
                  <li key={plan.id}>
                    <Link
                      to="/planes/$planId"
                      params={{ planId: plan.id }}
                      className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:bg-secondary/40"
                    >
                      <span className="text-sm font-medium text-foreground">{plan.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {plan.start_date} → {plan.end_date}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-muted-foreground">
                Abre la sección Visitas para ver tus próximas visitas.
              </p>
            </Card>
          )}
        </div>
      )}

      {settingsHouse && (
        <HouseSettings
          house={settingsHouse}
          open={!!settingsHouse}
          onOpenChange={(open) => {
            if (!open) setSettingsHouse(null);
          }}
        />
      )}
    </div>
  );
}
