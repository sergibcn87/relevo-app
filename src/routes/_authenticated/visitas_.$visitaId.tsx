import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  CircleAlert,
  Loader2,
  MessageSquarePlus,
  SkipForward,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatVisitEs } from "@/lib/visits";
import { uploadCarePhoto } from "@/lib/photo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/visitas_/$visitaId")({
  head: () => ({
    meta: [
      { title: "Visita — Relevo" },
      { name: "description", content: "Tareas e instrucciones de tu visita en Relevo." },
      { property: "og:title", content: "Visita — Relevo" },
      { property: "og:description", content: "Tareas e instrucciones de tu visita en Relevo." },
    ],
  }),
  component: VisitaDetailPage,
});

interface TaskRow {
  id: string;
  title: string;
  instructions: string;
  status: string;
  skip_reason: string | null;
  sort_order: number;
}

interface NoteRow {
  id: string;
  task_id: string;
  author_id: string;
  note: string | null;
  photo_path: string | null;
  created_at: string;
}

const TASK_STATUS: Record<string, { label: string; className: string }> = {
  pendiente: { label: "Pendiente", className: "bg-secondary text-secondary-foreground" },
  realizada: { label: "Hecha", className: "bg-primary/10 text-primary" },
  omitida: { label: "Omitida", className: "bg-warning/10 text-warning" },
};

const VISIT_STATUS: Record<string, { label: string; className: string }> = {
  pendiente: { label: "Pendiente", className: "bg-secondary text-secondary-foreground" },
  en_curso: { label: "En curso", className: "bg-primary/10 text-primary" },
  completada: { label: "Completada", className: "bg-primary/10 text-primary" },
  completada_con_omisiones: { label: "Completada con omisiones", className: "bg-warning/10 text-warning" },
};

function VisitaDetailPage() {
  const { visitaId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();

  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState<{ task: TaskRow; action: "done" | "skip" } | null>(null);
  const [skipTask, setSkipTask] = useState<TaskRow | null>(null);
  const [skipReason, setSkipReason] = useState("");
  const [noteTask, setNoteTask] = useState<TaskRow | null>(null);
  const [noteText, setNoteText] = useState("");
  const [notePhoto, setNotePhoto] = useState<File | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  const { data: visit, isLoading } = useQuery({
    queryKey: ["visit", visitaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visits")
        .select(
          "id, scheduled_at, status, closed_at, plan_id, plans(id, title, house_id, houses(name, owner_id))",
        )
        .eq("id", visitaId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["visit-tasks", visitaId],
    enabled: !!visit,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, instructions, status, skip_reason, sort_order")
        .eq("visit_id", visitaId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TaskRow[];
    },
  });

  const taskIds = tasks.map((t) => t.id);
  const { data: notes = [] } = useQuery({
    queryKey: ["visit-notes", visitaId],
    enabled: taskIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("task_notes")
        .select("id, task_id, author_id, note, photo_path, created_at")
        .in("task_id", taskIds)
        .order("created_at", { ascending: true });
      return (data ?? []) as NoteRow[];
    },
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["visit", visitaId] });
    queryClient.invalidateQueries({ queryKey: ["visit-tasks", visitaId] });
    queryClient.invalidateQueries({ queryKey: ["visit-notes", visitaId] });
    queryClient.invalidateQueries({ queryKey: ["visits", user.id] });
  }

  const pendingCount = tasks.filter((t) => t.status === "pendiente").length;
  const visitClosed = visit?.status === "completada" || visit?.status === "completada_con_omisiones";

  async function closeVisit() {
    const { data, error } = await supabase.rpc("close_visit", { _visit_id: visitaId });
    if (error) {
      toast.error(error.message || "No se ha podido cerrar la visita.");
      return;
    }
    toast.success(
      data === "completada_con_omisiones"
        ? "Visita completada con omisiones. Hemos avisado al propietario."
        : "Visita completada. Hemos avisado al propietario.",
    );
  }

  async function completeTask(task: TaskRow, andClose: boolean) {
    setBusyTaskId(task.id);
    const { error } = await supabase
      .from("tasks")
      .update({
        status: "realizada",
        completed_at: new Date().toISOString(),
        completed_by: user.id,
      })
      .eq("id", task.id)
      .eq("status", "pendiente");
    if (error) {
      toast.error("No se ha podido marcar la tarea.");
      setBusyTaskId(null);
      return;
    }
    if (andClose) await closeVisit();
    setBusyTaskId(null);
    invalidate();
  }

  async function submitSkip(andClose: boolean) {
    if (!skipTask || !skipReason.trim()) return;
    setBusyTaskId(skipTask.id);
    const { error } = await supabase
      .from("tasks")
      .update({ status: "omitida", skip_reason: skipReason.trim() })
      .eq("id", skipTask.id)
      .eq("status", "pendiente");
    if (error) {
      toast.error("No se ha podido omitir la tarea.");
      setBusyTaskId(null);
      return;
    }
    const closing = andClose;
    setSkipTask(null);
    setSkipReason("");
    if (closing) await closeVisit();
    setBusyTaskId(null);
    invalidate();
  }

  async function submitNote(event: FormEvent) {
    event.preventDefault();
    if (!noteTask || (!noteText.trim() && !notePhoto) || !visit?.plans) return;
    setSavingNote(true);
    try {
      let photoPath: string | null = null;
      if (notePhoto) photoPath = await uploadCarePhoto(visit.plans.house_id, notePhoto);
      const { error } = await supabase.from("task_notes").insert({
        id: crypto.randomUUID(),
        task_id: noteTask.id,
        author_id: user.id,
        note: noteText.trim() || null,
        photo_path: photoPath,
      });
      if (error) throw error;
      toast.success("Nota añadida.");
      setNoteTask(null);
      setNoteText("");
      setNotePhoto(null);
      queryClient.invalidateQueries({ queryKey: ["visit-notes", visitaId] });
    } catch {
      toast.error("No se ha podido añadir la nota.");
    } finally {
      setSavingNote(false);
    }
  }

  if (isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Cargando la visita…
      </p>
    );
  }

  if (!visit) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-foreground">Visita no encontrada</h1>
        <Link to="/visitas" className="mt-4 inline-block">
          <Button variant="secondary" size="sm">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Volver a visitas
          </Button>
        </Link>
      </div>
    );
  }

  const visitMeta = VISIT_STATUS[visit.status] ?? {
    label: visit.status,
    className: "bg-muted text-muted-foreground",
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/visitas"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Visitas
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{formatVisitEs(visit.scheduled_at)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {visit.plans?.title}
            {visit.plans?.houses?.name ? ` · ${visit.plans.houses.name}` : ""}
          </p>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", visitMeta.className)}>
          {visitMeta.label}
        </span>
      </div>

      {visitClosed && (
        <Card className="mt-4 p-4">
          <p className="text-sm text-card-foreground">
            Esta visita está cerrada. El propietario ya ha recibido el aviso.
          </p>
        </Card>
      )}

      <section className="mt-6" aria-label="Tareas de la visita">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Tareas
        </h2>
        <ul className="mt-3 flex flex-col gap-3">
          {tasks.map((task) => {
            const taskNotes = notes.filter((n) => n.task_id === task.id);
            const meta = TASK_STATUS[task.status] ?? TASK_STATUS.pendiente;
            const isLast = task.status === "pendiente" && pendingCount === 1;
            return (
              <li key={task.id}>
                <Card className="flex flex-col gap-3 p-4 animate-fade-up-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-card-foreground">{task.title}</p>
                    <span
                      className={cn("rounded-full px-3 py-1 text-xs font-semibold", meta.className)}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <p className="whitespace-pre-line text-sm text-muted-foreground">
                    {task.instructions}
                  </p>
                  {task.status === "omitida" && task.skip_reason && (
                    <p className="rounded-xl bg-warning/10 p-3 text-sm text-warning">
                      Motivo de la omisión: {task.skip_reason}
                    </p>
                  )}

                  {taskNotes.length > 0 && (
                    <ul className="flex flex-col gap-2">
                      {taskNotes.map((note) => (
                        <li
                          key={note.id}
                          className="rounded-xl border border-border bg-background p-3"
                        >
                          {note.note && (
                            <p className="whitespace-pre-line text-sm text-foreground">
                              {note.note}
                            </p>
                          )}
                          {note.photo_path && (
                            <SignedPhoto
                              path={note.photo_path}
                              alt="Foto de la nota"
                              className="mt-2 h-40 w-full rounded-lg object-cover"
                            />
                          )}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {note.author_id === user.id ? "Tú" : "La otra persona"} ·{" "}
                            {new Date(note.created_at).toLocaleString("es-ES", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}

                  {!visitClosed && (
                    <div className="flex flex-wrap gap-2">
                      {task.status === "pendiente" && (
                        <>
                          <Button
                            size="sm"
                            disabled={busyTaskId === task.id}
                            onClick={() =>
                              isLast
                                ? setConfirmClose({ task, action: "done" })
                                : completeTask(task, false)
                            }
                          >
                            {busyTaskId === task.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                            ) : (
                              <Check className="h-4 w-4" aria-hidden />
                            )}
                            Hecha
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busyTaskId === task.id}
                            onClick={() => setSkipTask(task)}
                          >
                            <SkipForward className="h-4 w-4" aria-hidden /> Omitir
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setNoteTask(task)}
                      >
                        <MessageSquarePlus className="h-4 w-4" aria-hidden /> Nota o foto
                      </Button>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      {visit.plans && (
        <div className="mt-6">
          <IncidentDialog
            planId={visit.plans.id}
            houseId={visit.plans.house_id}
            authorId={user.id}
            visitId={visit.id}
            trigger={
              <Button variant="outline" size="sm">
                <CircleAlert className="h-4 w-4" aria-hidden /> Abrir una incidencia
              </Button>
            }
          />
        </div>
      )}

      {/* Confirmación de cierre al completar la última tarea */}
      <AlertDialog open={!!confirmClose} onOpenChange={(open) => !open && setConfirmClose(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmClose?.action === "done" ? "¿Marcar la última tarea?" : "¿Omitir la última tarea?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Con esta {confirmClose?.action === "done" ? "tarea" : "omisión"} completas la visita y
              avisamos al propietario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir con la visita</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const pending = confirmClose;
                setConfirmClose(null);
                if (!pending) return;
                if (pending.action === "done") {
                  completeTask(pending.task, true);
                } else {
                  setSkipTask(pending.task);
                }
              }}
            >
              Sí, completar la visita
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de omisión con motivo obligatorio */}
      <Dialog
        open={!!skipTask}
        onOpenChange={(open) => {
          if (!open) {
            setSkipTask(null);
            setSkipReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Omitir «{skipTask?.title}»</DialogTitle>
            <DialogDescription>
              El motivo es obligatorio: el propietario lo verá en el aviso de la visita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="skip-reason">Motivo</Label>
            <Textarea
              id="skip-reason"
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Por ejemplo: No hacía falta, ya estaba regada."
            />
          </div>
          <Button
            className="self-start"
            disabled={!skipReason.trim() || (skipTask && busyTaskId === skipTask.id)}
            onClick={() => skipTask && submitSkip(pendingCount === 1)}
          >
            {skipTask && busyTaskId === skipTask.id && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            )}
            Confirmar omisión
          </Button>
        </DialogContent>
      </Dialog>

      {/* Diálogo de nota o foto */}
      <Dialog
        open={!!noteTask}
        onOpenChange={(open) => {
          if (!open) {
            setNoteTask(null);
            setNoteText("");
            setNotePhoto(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nota en «{noteTask?.title}»</DialogTitle>
            <DialogDescription>
              Escribe una nota, adjunta una foto o ambas cosas. La verá también el propietario.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitNote} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="note-text">Nota</Label>
              <Textarea
                id="note-text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Por ejemplo: He regado un poco más de lo habitual."
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="note-photo" className="flex items-center gap-1.5">
                <Camera className="h-4 w-4" aria-hidden /> Foto{" "}
                <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="note-photo"
                type="file"
                accept="image/*"
                onChange={(e) => setNotePhoto(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button
              type="submit"
              className="self-start"
              disabled={savingNote || (!noteText.trim() && !notePhoto)}
            >
              {savingNote && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Añadir nota
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
