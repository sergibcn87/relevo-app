import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { HandHeart, Home, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { GUIDE_VERSION } from "@/components/guide-tour";
import { DemoScenarioCard } from "@/components/demo-scenario-card";

export const Route = createFileRoute("/_authenticated/cuenta")({
  head: () => ({
    meta: [
      { title: "Cuenta — Relevo" },
      { name: "description", content: "Tu perfil en Relevo." },
      { property: "og:title", content: "Cuenta — Relevo" },
      { property: "og:description", content: "Tu perfil en Relevo." },
    ],
  }),
  component: CuentaPage,
});

function CuentaPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [ownerFormOpen, setOwnerFormOpen] = useState(false);
  const [houseName, setHouseName] = useState("");
  const [houseCity, setHouseCity] = useState("");
  const [creatingHouse, setCreatingHouse] = useState(false);

  const { data: accountContext } = useQuery({
    queryKey: ["account-context", user.id],
    queryFn: async () => {
      const [{ count: ownedHouses }, { count: caregiverPlans }] = await Promise.all([
        supabase.from("houses").select("id", { count: "exact", head: true }),
        supabase
          .from("plans")
          .select("id", { count: "exact", head: true })
          .eq("caregiver_id", user.id),
      ]);
      return { ownedHouses: ownedHouses ?? 0, caregiverPlans: caregiverPlans ?? 0 };
    },
  });
  const caregiverOnly =
    !!accountContext && accountContext.ownedHouses === 0 && accountContext.caregiverPlans > 0;

  async function handleActivateOwner(event: FormEvent) {
    event.preventDefault();
    if (!houseName.trim()) return;
    setCreatingHouse(true);
    const { error } = await supabase.from("houses").insert({
      owner_id: user.id,
      name: houseName.trim(),
      city: houseCity.trim() || null,
    });
    setCreatingHouse(false);
    if (error) {
      toast.error("No se ha podido crear la casa. Inténtalo de nuevo.");
      return;
    }
    toast.success("Vista de propietario activada. ¡Bienvenido a tu casa!");
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["tour-context", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["houses", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["account-context", user.id] }),
    ]);
    navigate({ to: "/inicio" });
  }

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-full", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (profile) setDisplayName(profile.display_name);
  }, [profile]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!displayName.trim()) {
      toast.error("El nombre visible no puede estar vacío.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("No se han podido guardar los cambios.");
    } else {
      toast.success("Cambios guardados.");
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      queryClient.invalidateQueries({ queryKey: ["profile-full", user.id] });
    }
  }

  async function handleReopenGuide() {
    const rows = (["propietario", "cuidador"] as const).map((role) => ({
      user_id: user.id,
      role,
      version: GUIDE_VERSION,
      status: "no_iniciada" as const,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from("guide_states")
      .upsert(rows, { onConflict: "user_id,role,version" });
    if (error) {
      toast.error("No se ha podido restablecer la guía.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["guide-state"] });
    toast.success("La guía comenzará en un momento.");
    navigate({ to: "/inicio" });
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground">Cuenta</h1>
      <p className="mt-1 text-sm text-muted-foreground">Tu perfil en Relevo.</p>

      {isLoading ? (
        <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Cargando tu perfil…
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {caregiverOnly && (
            <Card className="p-6 animate-fade-up-1">
              <div className="flex items-start gap-3">
                <HandHeart className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden />
                <div>
                  <h2 className="text-base font-semibold text-card-foreground">
                    Vista de cuidador
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Estás usando Relevo como cuidador: ves las visitas y tareas de los planes a
                    los que te han invitado. Si también quieres organizar el cuidado de tu propia
                    casa, crea tu casa y se activará la vista de propietario.
                  </p>
                </div>
              </div>
              {!ownerFormOpen ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setOwnerFormOpen(true)}
                >
                  <Home className="h-4 w-4" aria-hidden /> Crear mi casa
                </Button>
              ) : (
                <form onSubmit={handleActivateOwner} className="mt-4 flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="owner-house-name">Nombre de la casa</Label>
                    <Input
                      id="owner-house-name"
                      value={houseName}
                      onChange={(e) => setHouseName(e.target.value)}
                      placeholder="Por ejemplo: Apartamento de la playa"
                      maxLength={80}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="owner-house-city">Ciudad (opcional)</Label>
                    <Input
                      id="owner-house-city"
                      value={houseCity}
                      onChange={(e) => setHouseCity(e.target.value)}
                      placeholder="Valencia"
                      maxLength={80}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="submit" size="sm" disabled={creatingHouse}>
                      {creatingHouse && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                      Activar vista de propietario
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setOwnerFormOpen(false)}
                    >
                      Ahora no
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          )}

          <form onSubmit={handleSave} className="flex flex-col gap-6">
          <Card className="p-6 animate-fade-up-1">
            <h2 className="text-base font-semibold text-card-foreground">Perfil</h2>
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="display-name">Nombre visible</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={80}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Es el nombre que verá la otra persona del plan.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input id="email" value={user.email ?? ""} disabled />
              </div>
            </div>
          </Card>

          <Card className="p-6 animate-fade-up-2">
            <h2 className="text-base font-semibold text-card-foreground">Guía de Relevo</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Vuelve a ver el recorrido guiado por la aplicación.
            </p>
            <Button type="button" variant="outline" size="sm" className="mt-4" onClick={handleReopenGuide}>
              Ver guía de nuevo
            </Button>
          </Card>

          <DemoScenarioCard />


          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Guardar cambios
            </Button>
            <Button type="button" variant="ghost" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" aria-hidden /> Cerrar sesión
            </Button>
          </div>
          </form>
        </div>
      )}
    </div>
  );
}
