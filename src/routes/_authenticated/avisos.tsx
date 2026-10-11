import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, CheckCheck, CircleAlert, CircleCheck, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/avisos")({
  head: () => ({
    meta: [
      { title: "Avisos — Relevo" },
      { name: "description", content: "Centro de avisos de Relevo." },
      { property: "og:title", content: "Avisos — Relevo" },
      { property: "og:description", content: "Centro de avisos de Relevo." },
    ],
  }),
  component: AvisosPage,
});

const typeConfig = {
  visita_completada: { icon: CircleCheck, className: "text-primary", label: "Visita completada" },
  visita_con_omisiones: {
    icon: CircleAlert,
    className: "text-warning",
    label: "Completada con omisiones",
  },
  visita_retrasada: { icon: Clock, className: "text-destructive", label: "Visita sin completar" },
} as const;

function AvisosPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, message, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    refetchOnWindowFocus: true,
  });

  async function markAllRead() {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null);
    queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
    queryClient.invalidateQueries({ queryKey: ["notifications-unread", user.id] });
  }

  async function markRead(id: string) {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .is("read_at", null);
    queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
    queryClient.invalidateQueries({ queryKey: ["notifications-unread", user.id] });
  }

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Avisos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Finalizaciones y retrasos de tus visitas.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" aria-hidden /> Marcar todos como leídos
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Cargando avisos…</p>
      ) : notifications.length === 0 ? (
        <Card className="mt-6 flex flex-col items-center gap-3 p-10 text-center animate-fade-up-1">
          <BellOff className="h-8 w-8 text-primary" aria-hidden />
          <h2 className="text-base font-semibold text-card-foreground">No tienes avisos</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Cuando una visita se complete o supere su margen de 90 minutos, te avisaremos aquí.
          </p>
        </Card>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {notifications.map((notification) => {
            const config = typeConfig[notification.type];
            const Icon = config?.icon ?? Bell;
            return (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => !notification.read_at && markRead(notification.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-secondary/40",
                    !notification.read_at && "border-l-4 border-l-primary",
                  )}
                >
                  <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", config?.className)} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-card-foreground">
                      {notification.message}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {config?.label ?? "Aviso"} ·{" "}
                      {new Date(notification.created_at).toLocaleString("es-ES", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </span>
                  {!notification.read_at && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Sin leer" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
