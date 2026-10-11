import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/cuenta")({
  head: () => ({
    meta: [
      { title: "Cuenta — Relevo" },
      { name: "description", content: "Tu perfil y preferencias de avisos en Relevo." },
      { property: "og:title", content: "Cuenta — Relevo" },
      { property: "og:description", content: "Tu perfil y preferencias de avisos en Relevo." },
    ],
  }),
  component: CuentaPage,
});

function CuentaPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState("");
  const [emailCompletion, setEmailCompletion] = useState(true);
  const [emailDelay, setEmailDelay] = useState(true);
  const [saving, setSaving] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-full", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, email_completion_notifications, email_delay_notifications")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setEmailCompletion(profile.email_completion_notifications);
      setEmailDelay(profile.email_delay_notifications);
    }
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
        email_completion_notifications: emailCompletion,
        email_delay_notifications: emailDelay,
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
      version: 1,
      status: "no_iniciada" as const,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from("guide_states")
      .upsert(rows, { onConflict: "user_id,role,version" });
    if (error) toast.error("No se ha podido restablecer la guía.");
    else {
      queryClient.invalidateQueries({ queryKey: ["guide-state"] });
      toast.success("La guía se mostrará en un momento.");
    }
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
      <p className="mt-1 text-sm text-muted-foreground">Tu perfil y tus preferencias de avisos.</p>

      {isLoading ? (
        <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Cargando tu perfil…
        </p>
      ) : (
        <form onSubmit={handleSave} className="mt-6 flex flex-col gap-6">
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
            <h2 className="text-base font-semibold text-card-foreground">Avisos por correo</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Los avisos dentro de la aplicación siempre se muestran. Aquí eliges si también quieres
              recibirlos por correo.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border bg-background px-4">
                <input
                  type="checkbox"
                  checked={emailCompletion}
                  onChange={(e) => setEmailCompletion(e.target.checked)}
                  className="h-5 w-5 accent-primary"
                />
                <span className="text-sm text-foreground">
                  Aviso cuando una visita se complete
                </span>
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border bg-background px-4">
                <input
                  type="checkbox"
                  checked={emailDelay}
                  onChange={(e) => setEmailDelay(e.target.checked)}
                  className="h-5 w-5 accent-primary"
                />
                <span className="text-sm text-foreground">
                  Aviso cuando una visita supere su margen sin completarse
                </span>
              </label>
            </div>
          </Card>

          <Card className="p-6 animate-fade-up-3">
            <h2 className="text-base font-semibold text-card-foreground">Guía de Relevo</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Vuelve a ver el recorrido guiado por la aplicación.
            </p>
            <Button type="button" variant="outline" size="sm" className="mt-4" onClick={handleReopenGuide}>
              Ver guía de nuevo
            </Button>
          </Card>

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
      )}
    </div>
  );
}
