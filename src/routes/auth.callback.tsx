import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/logo";

type CallbackSearch = { redirect?: string | undefined };

const validateSearch = (search: Record<string, unknown>): CallbackSearch => ({
  redirect:
    typeof search["redirect"] === "string" &&
    search["redirect"].startsWith("/") &&
    !search["redirect"].startsWith("//")
      ? search["redirect"]
      : undefined,
});

export const Route = createFileRoute("/auth/callback")({
  validateSearch,
  head: () => ({
    meta: [
      { title: "Completando el acceso — Relevo" },
      {
        name: "description",
        content: "Estamos confirmando tu cuenta de Relevo.",
      },
      { property: "og:title", content: "Completando el acceso — Relevo" },
      {
        property: "og:description",
        content: "Estamos confirmando tu cuenta de Relevo.",
      },
    ],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const target = redirect ?? "/inicio";
  const done = useRef(false);

  useEffect(() => {
    const go = (path: string) => {
      if (done.current) return;
      done.current = true;
      navigate({ href: path, replace: true });
    };

    // Tras confirmar el correo, la sesión llega en el hash de la URL y el
    // cliente la detecta de forma asíncrona: comprobamos y además escuchamos.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) go(target);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) go(target);
    });
    const timer = setTimeout(() => {
      go(`/auth?redirect=${encodeURIComponent(target)}`);
    }, 12000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
      <Logo />
      <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Confirmando tu cuenta, un momento…
      </p>
    </div>
  );
}
