import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nueva contraseña — Relevo" },
      { name: "description", content: "Establece una nueva contraseña para tu cuenta de Relevo." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else if (!window.location.hash.includes("type=recovery")) setInvalid(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError("No se ha podido actualizar la contraseña. Pide un nuevo enlace e inténtalo de nuevo.");
    } else {
      setDone(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <div className="mb-6">
          <Logo />
        </div>

        {done ? (
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-semibold text-foreground">Contraseña actualizada</h1>
            <p className="text-sm text-muted-foreground">
              Ya puedes usar tu nueva contraseña para entrar en Relevo.
            </p>
            <Button onClick={() => navigate({ href: "/inicio" })}>Ir a mi panel</Button>
          </div>
        ) : invalid ? (
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-semibold text-foreground">Enlace no válido</h1>
            <p className="text-sm text-muted-foreground">
              Este enlace ha caducado o ya se ha utilizado. Pide uno nuevo desde la pantalla de
              acceso.
            </p>
            <Button variant="outline" onClick={() => navigate({ href: "/auth" })}>
              Volver a entrar
            </Button>
          </div>
        ) : !ready ? (
          <p className="text-sm text-muted-foreground">Comprobando el enlace…</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <h1 className="text-xl font-semibold text-foreground">Establece una nueva contraseña</h1>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  className="pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary/60"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && (
              <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Guardar contraseña
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
