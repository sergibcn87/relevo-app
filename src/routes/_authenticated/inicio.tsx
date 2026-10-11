import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Home, Loader2, MapPin, PawPrint, Pencil, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { HouseSettings, type HouseSummary } from "@/components/house-settings";
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
        .select("id, name, city, rooms")
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
                  <h2 className="text-lg font-semibold text-card-foreground">{house.name}</h2>
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
