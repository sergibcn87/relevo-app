import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/logo";

type AuthSearch = { redirect?: string };

const validateSearch = (search: Record<string, unknown>): AuthSearch => ({
  redirect:
    typeof search.redirect === "string" &&
    search.redirect.startsWith("/") &&
    !search.redirect.startsWith("//")
      ? search.redirect
      : undefined,
});

export const Route = createFileRoute("/auth")({
  validateSearch,
  head: () => ({
    meta: [
      { title: "Entrar o crear cuenta — Relevo" },
      {
        name: "description",
        content: "Accede a Relevo o crea tu cuenta para organizar el cuidado de tu casa.",
      },
      { property: "og:title", content: "Entrar o crear cuenta — Relevo" },
      {
        property: "og:description",
        content: "Accede a Relevo o crea tu cuenta para organizar el cuidado de tu casa.",
      },
    ],
  }),
  component: AuthPage,
});

function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (m.includes("email not confirmed"))
    return "Aún no has confirmado tu correo. Revisa tu bandeja de entrada.";
  if (m.includes("user already registered")) return "Ya existe una cuenta con este correo.";
  if (m.includes("password"))
    return "La contraseña no cumple los requisitos. Usa al menos 8 caracteres.";
  if (m.includes("rate limit")) return "Demasiados intentos. Espera un momento y vuelve a probar.";
  return "No se ha podido completar la operación. Inténtalo de nuevo.";
}

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const target = redirect ?? "/inicio";

  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ href: target, replace: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (err) setError(mapAuthError(err.message));
        else
          setNotice(
            "Si existe una cuenta con ese correo, te hemos enviado un enlace para establecer una nueva contraseña.",
          );
        return;
      }

      if (password.length < 8) {
        setError("La contraseña debe tener al menos 8 caracteres.");
        return;
      }

      if (mode === "signup") {
        if (!name.trim()) {
          setError("Indica tu nombre visible.");
          return;
        }
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: name.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (err) {
          setError(mapAuthError(err.message));
        } else if (!data.session) {
          setNotice(
            "Cuenta creada. Te hemos enviado un correo de confirmación: ábrelo y pulsa el enlace para activar tu cuenta.",
          );
        } else {
          navigate({ href: target });
        }
        return;
      }

      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) setError(mapAuthError(err.message));
      else navigate({ href: target });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">
        <div className="hidden flex-col justify-between rounded-3xl p-8 bg-hero-card md:flex">
          <Logo />
          <div>
            <h1 className="text-3xl font-bold leading-tight text-foreground">
              Deja tu casa en buenas manos y sigue cada visita.
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Instrucciones, visitas y avisos en un plan compartido entre propietario y cuidador.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">Plantas, mascotas y casa, bajo control.</p>
        </div>

        <Card className="p-6 sm:p-8">
          <div className="mb-6 md:hidden">
            <Logo />
          </div>

          {mode !== "forgot" ? (
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                  setNotice(null);
                }}
                className={`min-h-11 rounded-full text-sm font-semibold transition-colors ${
                  mode === "login" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setNotice(null);
                }}
                className={`min-h-11 rounded-full text-sm font-semibold transition-colors ${
                  mode === "signup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Crear cuenta
              </button>
            </div>
          ) : (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground">Recuperar contraseña</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Te enviaremos un enlace para establecer una nueva contraseña.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {mode === "signup" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Nombre visible</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Por ejemplo: Alex"
                  autoComplete="name"
                  maxLength={80}
                  required
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.es"
                autoComplete="email"
                maxLength={255}
                required
              />
            </div>

            {mode !== "forgot" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
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
            )}

            {error && (
              <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="rounded-xl bg-secondary px-4 py-3 text-sm text-secondary-foreground">
                {notice}
              </p>
            )}

            <Button type="submit" disabled={loading} className="mt-1 w-full">
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {mode === "login" && "Entrar"}
              {mode === "signup" && "Crear cuenta"}
              {mode === "forgot" && "Enviar enlace"}
            </Button>

            {mode === "login" && (
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError(null);
                  setNotice(null);
                }}
                className="min-h-11 text-sm font-medium text-primary hover:underline"
              >
                He olvidado mi contraseña
              </button>
            )}
            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                  setNotice(null);
                }}
                className="min-h-11 text-sm font-medium text-primary hover:underline"
              >
                Volver a entrar
              </button>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}
