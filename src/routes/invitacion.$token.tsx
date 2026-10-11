import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { CalendarClock, CircleAlert, HandHeart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/invitacion/$token")({
  head: () => ({
    meta: [
      { title: "Invitación de cuidador — Relevo" },
      {
        name: "description",
        content: "Acepta una invitación para cuidar una casa con Relevo.",
      },
      { property: "og:title", content: "Invitación de cuidador — Relevo" },
      {
        property: "og:description",
        content: "Acepta una invitación para cuidar una casa con Relevo.",
      },
    ],
  }),
  component: InvitacionPage,
});

function InvitacionPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthChecked(true);
    });
    // Si la sesión llega tarde (p. ej. tras confirmar el correo), la recogemos.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        setUser(session?.user ?? null);
        setAuthChecked(true);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const { data: invitation, isLoading } = useQuery({
    queryKey: ["invitation", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("invitation_info", { _token: token });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const expired =
    !!invitation && invitation.status === "pendiente" && new Date(invitation.expires_at) < new Date();

  async function accept() {
    setAccepting(true);
    const { error } = await supabase.rpc("accept_invitation", { _token: token });
    setAccepting(false);
    if (error) {
      toast.error(error.message || "No se ha podido aceptar la invitación.");
      return;
    }
    toast.success("¡Invitación aceptada! Ya puedes ver tus visitas.");
    navigate({ to: "/visitas" });
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-10">
      <Link to="/" aria-label="Ir a la página principal" className="mb-8">
        <Logo />
      </Link>
      <Card className="w-full max-w-md p-8 text-center animate-fade-up-1">
        {isLoading || !authChecked ? (
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Comprobando la invitación…
          </p>
        ) : !invitation ? (
          <div className="flex flex-col items-center gap-3">
            <CircleAlert className="h-8 w-8 text-destructive" aria-hidden />
            <h1 className="text-xl font-bold text-card-foreground">Invitación no válida</h1>
            <p className="text-sm text-muted-foreground">
              Este enlace no corresponde a ninguna invitación. Pide a la persona que te invitó que
              te envíe uno nuevo.
            </p>
          </div>
        ) : invitation.status !== "pendiente" || expired ? (
          <div className="flex flex-col items-center gap-3">
            <CircleAlert className="h-8 w-8 text-warning" aria-hidden />
            <h1 className="text-xl font-bold text-card-foreground">
              {invitation.status === "aceptada"
                ? "Esta invitación ya se ha utilizado"
                : invitation.status === "revocada"
                  ? "Invitación revocada"
                  : "Invitación caducada"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {invitation.status === "aceptada"
                ? "El enlace era de un solo uso. Si tú la aceptaste, entra en tu cuenta para ver el plan."
                : "Pide a la persona propietaria que genere una nueva invitación."}
            </p>
            {invitation.status === "aceptada" && (
              <Link to={user ? "/visitas" : "/auth"}>
                <Button variant="secondary" size="sm">
                  {user ? "Ir a mis visitas" : "Entrar en mi cuenta"}
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <HandHeart className="h-10 w-10 text-primary" aria-hidden />
            <div>
              <h1 className="text-xl font-bold text-card-foreground">
                {invitation.owner_name} te invita a cuidar {invitation.house_name}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Plan «{invitation.plan_title}». Al aceptar verás las visitas y las instrucciones de
                cuidado.
              </p>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="h-4 w-4" aria-hidden />
              El enlace caduca el{" "}
              {new Date(invitation.expires_at).toLocaleString("es-ES", {
                dateStyle: "long",
                timeStyle: "short",
              })}{" "}
              y es de un solo uso.
            </p>
            {user ? (
              <Button onClick={accept} disabled={accepting} className="w-full">
                {accepting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                Aceptar invitación
              </Button>
            ) : (
              <div className="flex w-full flex-col gap-2">
                <Link to="/auth" search={{ redirect: `/invitacion/${token}` }}>
                  <Button className="w-full">Entrar o crear cuenta para aceptar</Button>
                </Link>
                <p className="text-xs text-muted-foreground">
                  Necesitas una cuenta gratuita de Relevo. No hace falta que crees una casa.
                </p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
