import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  CalendarCheck,
  CircleAlert,
  CircleCheck,
  Copy,
  Link2,
  Loader2,
  MapPin,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatDateEs, formatVisitEs } from "@/lib/visits";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IncidentDialog } from "@/components/incident-dialog";
import { SignedPhoto } from "@/components/signed-photo";
import { WeatherSuggestions } from "@/components/weather-suggestions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/planes_/$planId")({
  head: () => ({
    meta: [
      { title: "Detalle del plan — Relevo" },
      { name: "description", content: "Visitas, invitaciones e incidencias de tu plan en Relevo." },
      { property: "og:title", content: "Detalle del plan — Relevo" },
      {
        property: "og:description",
        content: "Visitas, invitaciones e incidencias de tu plan en Relevo.",
      },
    ],
  }),
  component: PlanDetailPage,
});

const STATUS_META: Record<string, { label: string; className: string }> = {
  borrador: { label: "Borrador", className: "bg-warning/10 text-warning" },
  abierto: { label: "Sin cuidador", className: "bg-secondary text-secondary-foreground" },
  activo: { label: "Activo", className: "bg-primary/10 text-primary" },
  completado: { label: "Completado", className: "bg-muted text-muted-foreground" },
  cancelado: { label: "Cancelado", className: "bg-muted text-muted-foreground" },
  archivado: { label: "Archivado", className: "bg-muted text-muted-foreground" },
};

const VISIT_STATUS: Record<string, { label: string; className: string }> = {
  pendiente: { label: "Pendiente", className: "bg-secondary text-secondary-foreground" },
  en_curso: { label: "En curso", className: "bg-primary/10 text-primary" },
  completada: { label: "Completada", className: "bg-primary/10 text-primary" },
  completada_con_omisiones: {
    label: "Con omisiones",
    className: "bg-warning/10 text-warning",
  },
};

function chip(meta: { label: string; className: string }) {
  return (
    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", meta.className)}>
      {meta.label}
    </span>
  );
}

function PlanDetailPage() {
  const { planId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [savingResolution, setSavingResolution] = useState(false);

  const { data: plan, isLoading } = useQuery({
    queryKey: ["plan", planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select(
          "id, title, start_date, end_date, status, caregiver_id, general_note, house_id, houses(name, owner_id, city)",
        )
        .eq("id", planId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const isOwner = !!plan?.houses && plan.houses.owner_id === user.id;

  const { data: caregiver } = useQuery({
    queryKey: ["caregiver", plan?.caregiver_id],
    enabled: !!plan?.caregiver_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", plan!.caregiver_id!)
        .maybeSingle();
      return data;
    },
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ["invitations", planId],
    enabled: isOwner,
    queryFn: async () => {
      const { data } = await supabase
        .from("invitations")
        .select("id, token, status, expires_at, created_at")
        .eq("plan_id", planId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: visits = [] } = useQuery({
    queryKey: ["plan-visits", planId],
    enabled: !!plan,
    queryFn: async () => {
      const { data } = await supabase
        .from("visits")
        .select("id, scheduled_at, status")
        .eq("plan_id", planId)
        .order("scheduled_at", { ascending: true });
      return data ?? [];
    },
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ["plan-incidents", planId],
    enabled: !!plan,
    queryFn: async () => {
      const { data } = await supabase
        .from("incidents")
        .select("id, title, description, photo_path, status, resolution_note, author_id, created_at")
        .eq("plan_id", planId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["plan", planId] });
    queryClient.invalidateQueries({ queryKey: ["invitations", planId] });
    queryClient.invalidateQueries({ queryKey: ["plan-visits", planId] });
    queryClient.invalidateQueries({ queryKey: ["plan-incidents", planId] });
    queryClient.invalidateQueries({ queryKey: ["plans", user.id] });
  }

  async function createInvitation() {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from("invitations")
      .insert({ plan_id: planId, token, expires_at: expiresAt, status: "pendiente" });
    if (error) {
      toast.error("No se ha podido crear la invitación.");
      return;
    }
    toast.success("Invitación creada. Copia el enlace y envíalo a tu cuidador.");
    queryClient.invalidateQueries({ queryKey: ["invitations", planId] });
  }

  async function copyLink(token: string) {
    const url = `${window.location.origin}/invitacion/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado al portapapeles.");
    } catch {
      toast.message(url, { description: "Copia el enlace manualmente." });
    }
  }

  async function revokeInvitation(id: string) {
    const { error } = await supabase
      .from("invitations")
      .update({ status: "revocada" })
      .eq("id", id)
      .eq("status", "pendiente");
    if (error) {
      toast.error("No se ha podido revocar la invitación.");
      return;
    }
    toast.success("Invitación revocada.");
    queryClient.invalidateQueries({ queryKey: ["invitations", planId] });
  }

  async function resolveIncident() {
    if (!resolvingId || !resolutionNote.trim()) return;
    setSavingResolution(true);
    const { error } = await supabase
      .from("incidents")
      .update({
        status: "resuelta",
        resolution_note: resolutionNote.trim(),
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", resolvingId)
      .eq("status", "abierta");
    setSavingResolution(false);
    if (error) {
      toast.error("No se ha podido resolver la incidencia.");
      return;
    }
    toast.success("Incidencia resuelta.");
    setResolvingId(null);
    setResolutionNote("");
    queryClient.invalidateQueries({ queryKey: ["plan-incidents", planId] });
  }

  if (isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Cargando el plan…
      </p>
    );
  }

  if (!plan) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-foreground">Plan no encontrado</h1>
        <Link to="/planes" className="mt-4 inline-block">
          <Button variant="secondary" size="sm">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Volver a planes
          </Button>
        </Link>
      </div>
    );
  }

  const pendingInvitation = invitations.find((i) => i.status === "pendiente");

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/planes"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Planes
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{plan.title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>
              {formatDateEs(plan.start_date)} → {formatDateEs(plan.end_date)}
            </span>
            {plan.houses?.name && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" aria-hidden />
                {plan.houses.name}
                {plan.houses.city ? ` · ${plan.houses.city}` : ""}
              </span>
            )}
          </p>
        </div>
        {chip(STATUS_META[plan.status] ?? { label: plan.status, className: "bg-muted text-muted-foreground" })}
      </div>

      {plan.general_note && (
        <Card className="mt-4 p-4">
          <p className="text-sm text-card-foreground">{plan.general_note}</p>
        </Card>
      )}

      {/* Cuidador / invitación */}
      <Card className="mt-6 p-5 animate-fade-up-1">
        <div className="flex items-center gap-2">
          <UserRound className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="text-base font-semibold text-card-foreground">Cuidador</h2>
        </div>
        {plan.caregiver_id ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {plan.caregiver_id === user.id
              ? "Eres el cuidador de este plan."
              : `${caregiver?.display_name ?? "Tu cuidador"} cuidará la casa durante esta ausencia.`}
          </p>
        ) : isOwner ? (
          <div className="mt-3 flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Genera un enlace de invitación y envíalo a tu cuidador. Caduca en 7 días y es de un
              solo uso.
            </p>
            {pendingInvitation ? (
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-secondary/40 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Link2 className="h-4 w-4 text-primary" aria-hidden />
                  Invitación activa hasta el{" "}
                  {new Date(pendingInvitation.expires_at).toLocaleString("es-ES", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => copyLink(pendingInvitation.token)}>
                    <Copy className="h-4 w-4" aria-hidden /> Copiar enlace
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        Revocar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Revocar esta invitación?</AlertDialogTitle>
                        <AlertDialogDescription>
                          El enlace dejará de funcionar. Puedes crear uno nuevo cuando quieras.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Volver</AlertDialogCancel>
                        <AlertDialogAction onClick={() => revokeInvitation(pendingInvitation.id)}>
                          Revocar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ) : (
              <Button size="sm" className="self-start" onClick={createInvitation}>
                <Link2 className="h-4 w-4" aria-hidden /> Crear enlace de invitación
              </Button>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Aún no hay cuidador asignado a este plan.
          </p>
        )}
      </Card>

      {/* Sugerencias meteorológicas (solo propietario) */}
      {isOwner && (
        <WeatherSuggestions
          planId={plan.id}
          houseId={plan.house_id}
          houseCity={plan.houses?.city ?? null}
          visits={visits}
        />
      )}

      {/* Visitas */}
      <section className="mt-8" aria-label="Visitas del plan">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <CalendarCheck className="h-4 w-4" aria-hidden /> Visitas
        </h2>
        {visits.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Este plan no tiene visitas.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {visits.map((visit) => (
              <li key={visit.id}>
                <Link
                  to="/visitas/$visitaId"
                  params={{ visitaId: visit.id }}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition-colors hover:bg-secondary/40"
                >
                  <span className="text-sm font-medium text-card-foreground">
                    {formatVisitEs(visit.scheduled_at)}
                  </span>
                  {chip(
                    VISIT_STATUS[visit.status] ?? {
                      label: visit.status,
                      className: "bg-muted text-muted-foreground",
                    },
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Incidencias */}
      <section className="mt-8" aria-label="Incidencias del plan">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <TriangleAlert className="h-4 w-4" aria-hidden /> Incidencias
          </h2>
          <IncidentDialog
            planId={plan.id}
            houseId={plan.house_id}
            authorId={user.id}
            onCreated={invalidate}
            trigger={
              <Button variant="outline" size="sm">
                <CircleAlert className="h-4 w-4" aria-hidden /> Abrir incidencia
              </Button>
            }
          />
        </div>
        {incidents.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No hay incidencias en este plan.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {incidents.map((incident) => {
              const authorLabel =
                incident.author_id === user.id
                  ? "Tú"
                  : incident.author_id === plan.houses?.owner_id
                    ? "El propietario"
                    : "El cuidador";
              return (
                <li key={incident.id}>
                  <Card className="flex flex-col gap-2 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-card-foreground">
                        {incident.title}
                      </p>
                      {incident.status === "abierta"
                        ? chip({ label: "Abierta", className: "bg-destructive/10 text-destructive" })
                        : chip({ label: "Resuelta", className: "bg-primary/10 text-primary" })}
                    </div>
                    <p className="text-sm text-muted-foreground">{incident.description}</p>
                    {incident.photo_path && (
                      <SignedPhoto
                        path={incident.photo_path}
                        alt={`Foto de la incidencia ${incident.title}`}
                        className="h-40 w-full rounded-xl object-cover"
                      />
                    )}
                    <p className="text-xs text-muted-foreground">
                      {authorLabel} ·{" "}
                      {new Date(incident.created_at).toLocaleString("es-ES", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                    {incident.status === "resuelta" && incident.resolution_note && (
                      <p className="flex items-start gap-1.5 rounded-xl bg-primary/5 p-3 text-sm text-card-foreground">
                        <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                        {incident.resolution_note}
                      </p>
                    )}
                    {incident.status === "abierta" && isOwner && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="self-start"
                        onClick={() => setResolvingId(incident.id)}
                      >
                        <CircleCheck className="h-4 w-4" aria-hidden /> Marcar como resuelta
                      </Button>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Diálogo de resolución */}
      <Dialog
        open={!!resolvingId}
        onOpenChange={(open) => {
          if (!open) setResolvingId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver incidencia</DialogTitle>
            <DialogDescription>
              Explica cómo se ha solucionado. El cuidador recibirá un aviso.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resolution-note">Nota de resolución</Label>
            <Textarea
              id="resolution-note"
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Por ejemplo: He hablado con el cuidador y la maceta ya está sustituida."
            />
          </div>
          <Button
            onClick={resolveIncident}
            disabled={savingResolution || !resolutionNote.trim()}
            className="self-start"
          >
            {savingResolution && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Resolver incidencia
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
