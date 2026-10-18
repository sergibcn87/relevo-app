import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Archive,
  ArchiveRestore,
  Camera,
  Check,
  ChevronDown,
  Home,
  Leaf,
  Loader2,
  PawPrint,
  Pencil,
  Plus,
  Sprout,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getSignedPhotoUrl, uploadCarePhoto } from "@/lib/photo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/fichas")({
  head: () => ({
    meta: [
      { title: "Fichas — Relevo" },
      { name: "description", content: "Fichas de cuidado de plantas, mascotas y casa en Relevo." },
      { property: "og:title", content: "Fichas — Relevo" },
      {
        property: "og:description",
        content: "Fichas de cuidado de plantas, mascotas y casa en Relevo.",
      },
    ],
  }),
  component: FichasPage,
});

interface CareCard {
  id: string;
  house_id: string;
  name: string;
  category: string;
  room: string | null;
  photo_path: string | null;
  instructions: string;
  important_note: string | null;
  archived: boolean;
}

const CATEGORIES = [
  { id: "planta", label: "Planta", icon: Sprout },
  { id: "mascota", label: "Mascota", icon: PawPrint },
  { id: "casa", label: "Casa", icon: Home },
] as const;

const TEMPLATES: Array<{
  name: string;
  category: string;
  instructions: string;
  important_note?: string;
}> = [
  {
    name: "Monstera",
    category: "planta",
    instructions: "Regar una vez por semana, hasta que salga un poco de agua por debajo. Luz indirecta.",
    important_note: "No mojar las hojas: se manchan.",
  },
  {
    name: "Potos",
    category: "planta",
    instructions: "Regar cuando la tierra esté seca al tacto (cada 5-7 días). Tolera poca luz.",
  },
  {
    name: "Cactus y suculentas",
    category: "planta",
    instructions: "Regar muy poco: una vez cada 2-3 semanas. Mucha luz directa.",
    important_note: "El exceso de agua las mata: ante la duda, no regar.",
  },
  {
    name: "Gato",
    category: "mascota",
    instructions: "Comida y agua fresca cada día. Limpiar el arenero en cada visita.",
    important_note: "Que no salga a la terraza sin supervisión.",
  },
  {
    name: "Perro",
    category: "mascota",
    instructions: "Paseo mañana y tarde. Comida después del paseo, agua siempre disponible.",
  },
  {
    name: "Peces",
    category: "mascota",
    instructions: "Una pizca pequeña de comida al día. No limpiar el filtro durante la ausencia.",
    important_note: "La sobrealimentación ensucia el agua: mejor quedarse corto.",
  },
  {
    name: "Llaves y cerraduras",
    category: "casa",
    instructions: "La puerta de la entrada cierra con dos vueltas. Comprobar la terraza antes de salir.",
  },
  {
    name: "Correo y paquetes",
    category: "casa",
    instructions: "Recoger el correo del buzón en cada visita. Los paquetes se dejan sobre la mesa del recibidor.",
  },
  {
    name: "Basuras y reciclaje",
    category: "casa",
    instructions: "Sacar la basura orgánica si huele. El contenedor amarillo es para envases.",
  },
];

function categoryMeta(category: string) {
  return CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[2];
}

/** URLs firmadas para las fotos privadas de las fichas. */
function useSignedUrls(paths: string[]) {
  const key = [...paths].sort().join(",");
  return useQuery({
    queryKey: ["signed-urls", key],
    enabled: paths.length > 0,
    staleTime: 55 * 60 * 1000,
    queryFn: async () => {
      const entries = await Promise.all(
        paths.map(async (p) => [p, await getSignedPhotoUrl(p)] as const),
      );
      return Object.fromEntries(entries) as Record<string, string | null>;
    },
  });
}

function FichasPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CareCard | null>(null);
  const [showArchived, setShowArchived] = useState(false);

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

  const house = houses.find((h) => h.id === selectedHouseId) ?? houses[0] ?? null;

  const { data: cards = [], isLoading: loadingCards } = useQuery({
    queryKey: ["care-cards", house?.id],
    enabled: !!house,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("care_cards")
        .select("id, house_id, name, category, room, photo_path, instructions, important_note, archived")
        .eq("house_id", house!.id)
        .order("archived", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CareCard[];
    },
  });

  const photoPaths = useMemo(
    () => cards.filter((c) => c.photo_path).map((c) => c.photo_path!),
    [cards],
  );
  const { data: signedUrls = {} } = useSignedUrls(photoPaths);

  const active = cards.filter((c) => !c.archived);
  const archived = cards.filter((c) => c.archived);

  async function toggleArchive(card: CareCard) {
    const { error } = await supabase
      .from("care_cards")
      .update({ archived: !card.archived })
      .eq("id", card.id);
    if (error) {
      toast.error("No se ha podido actualizar la ficha.");
      return;
    }
    toast.success(card.archived ? "Ficha restaurada." : "Ficha archivada.");
    queryClient.invalidateQueries({ queryKey: ["care-cards", house?.id] });
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(card: CareCard) {
    setEditing(card);
    setDialogOpen(true);
  }

  const isLoading = loadingHouses || (!!house && loadingCards);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fichas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Instrucciones de cuidado para plantas, mascotas y casa. Se reutilizan en cada plan.
          </p>
        </div>
        {house && (
          <Button onClick={openCreate} className="shrink-0">
            <Plus className="h-4 w-4" aria-hidden /> Nueva ficha
          </Button>
        )}
      </div>

      {houses.length > 1 && (
        <HousePicker
          houses={houses}
          selectedId={house?.id ?? ""}
          onSelect={setSelectedHouseId}
        />
      )}

      {isLoading ? (
        <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Cargando fichas…
        </p>
      ) : !house ? (
        <Card className="mt-6 flex flex-col items-center gap-3 p-10 text-center animate-fade-up-1">
          <Home className="h-8 w-8 text-primary" aria-hidden />
          <h2 className="text-base font-semibold text-card-foreground">Primero crea tu casa</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Las fichas pertenecen a una casa. Crea la tuya desde el Resumen y vuelve aquí.
          </p>
          <Link to="/inicio">
            <Button variant="secondary" size="sm">Ir al Resumen</Button>
          </Link>
        </Card>
      ) : active.length === 0 && archived.length === 0 ? (
        <Card className="mt-6 flex flex-col items-center gap-3 p-10 text-center animate-fade-up-1">
          <Leaf className="h-8 w-8 text-primary" aria-hidden />
          <h2 className="text-base font-semibold text-card-foreground">Todavía no hay fichas</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Crea la primera con una plantilla o en blanco: foto, instrucciones y notas importantes.
          </p>
          <Button onClick={openCreate} size="sm" className="mt-1">
            <Plus className="h-4 w-4" aria-hidden /> Nueva ficha
          </Button>
        </Card>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {CATEGORIES.map((cat) => {
            const group = active.filter((c) => c.category === cat.id);
            if (group.length === 0) return null;
            return (
              <section key={cat.id} aria-label={cat.label}>
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <cat.icon className="h-4 w-4" aria-hidden /> {cat.label}
                </h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {group.map((card) => (
                    <Card key={card.id} className="flex flex-col gap-3 p-4 animate-fade-up-1">
                      <div className="flex items-start gap-3">
                        {card.photo_path && signedUrls[card.photo_path] ? (
                          <img
                            src={signedUrls[card.photo_path] ?? undefined}
                            alt={`Foto de ${card.name}`}
                            className="h-14 w-14 shrink-0 rounded-xl object-cover"
                          />
                        ) : (
                          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                            {(() => {
                              const Icon = categoryMeta(card.category).icon;
                              return <Icon className="h-6 w-6" aria-hidden />;
                            })()}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-base font-semibold text-card-foreground">
                            {card.name}
                          </h3>
                          {card.room && (
                            <p className="text-xs text-muted-foreground">{card.room}</p>
                          )}
                        </div>
                      </div>
                      <p className="line-clamp-3 text-sm text-muted-foreground">{card.instructions}</p>
                      {card.important_note && (
                        <p className="rounded-xl bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
                          Importante: {card.important_note}
                        </p>
                      )}
                      <div className="mt-auto flex gap-2 pt-1">
                        <Button variant="outline" size="sm" onClick={() => openEdit(card)}>
                          <Pencil className="h-4 w-4" aria-hidden /> Editar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleArchive(card)}>
                          <Archive className="h-4 w-4" aria-hidden /> Archivar
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}

          {archived.length > 0 && (
            <section aria-label="Fichas archivadas">
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                className="flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground"
                aria-expanded={showArchived}
              >
                <Archive className="h-4 w-4" aria-hidden />
                Archivadas ({archived.length}) — {showArchived ? "ocultar" : "ver"}
              </button>
              {showArchived && (
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {archived.map((card) => (
                    <Card key={card.id} className="flex items-center justify-between gap-3 p-4 opacity-75">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-card-foreground">
                          {card.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {categoryMeta(card.category).label}
                          {card.room ? ` · ${card.room}` : ""}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => toggleArchive(card)}>
                        <ArchiveRestore className="h-4 w-4" aria-hidden /> Restaurar
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {house && (
        <CardDialog
          house={house}
          card={editing}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </div>
  );
}

interface CardDialogProps {
  house: { id: string; rooms: string[] };
  card: CareCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CardDialog({ house, card, open, onOpenChange }: CardDialogProps) {
  const queryClient = useQueryClient();
  const [templatePicked, setTemplatePicked] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("planta");
  const [room, setRoom] = useState("");
  const [instructions, setInstructions] = useState("");
  const [importantNote, setImportantNote] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTemplatePicked(!!card);
    setName(card?.name ?? "");
    setCategory(card?.category ?? "planta");
    setRoom(card?.room ?? "");
    setInstructions(card?.instructions ?? "");
    setImportantNote(card?.important_note ?? "");
    setPhotoFile(null);
    setPhotoPreview(null);
  }, [open, card]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  function applyTemplate(template: (typeof TEMPLATES)[number]) {
    setName(template.name);
    setCategory(template.category);
    setInstructions(template.instructions);
    setImportantNote(template.important_note ?? "");
    setTemplatePicked(true);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !instructions.trim()) {
      toast.error("El nombre y las instrucciones son obligatorios.");
      return;
    }
    setSaving(true);
    let photoPath = card?.photo_path ?? null;
    if (photoFile) {
      try {
        photoPath = await uploadCarePhoto(house.id, photoFile);
      } catch {
        setSaving(false);
        toast.error("No se ha podido subir la foto. Inténtalo de nuevo.");
        return;
      }
    }
    const payload = {
      name: name.trim(),
      category,
      room: room || null,
      instructions: instructions.trim(),
      important_note: importantNote.trim() || null,
      photo_path: photoPath,
    };
    const { error } = card
      ? await supabase.from("care_cards").update(payload).eq("id", card.id)
      : await supabase.from("care_cards").insert({ ...payload, house_id: house.id });
    setSaving(false);
    if (error) {
      toast.error("No se ha podido guardar la ficha.");
      return;
    }
    toast.success(card ? "Ficha actualizada." : "Ficha creada.");
    queryClient.invalidateQueries({ queryKey: ["care-cards", house.id] });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{card ? "Editar ficha" : "Nueva ficha"}</DialogTitle>
          <DialogDescription>
            {card
              ? "Actualiza las instrucciones que verá tu cuidador."
              : "Empieza con una plantilla o en blanco."}
          </DialogDescription>
        </DialogHeader>

        {!card && !templatePicked ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TEMPLATES.map((t) => {
                const Icon = categoryMeta(t.category).icon;
                return (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="flex min-h-20 flex-col items-start gap-1 rounded-xl border border-border bg-background p-3 text-left transition-colors hover:border-primary hover:bg-secondary/50"
                  >
                    <Icon className="h-5 w-5 text-primary" aria-hidden />
                    <span className="text-sm font-medium text-foreground">{t.name}</span>
                  </button>
                );
              })}
            </div>
            <Button variant="ghost" className="self-center" onClick={() => setTemplatePicked(true)}>
              Empezar en blanco
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Categoría</Label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    aria-pressed={category === cat.id}
                    className={cn(
                      "flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-2 text-sm font-medium transition-colors",
                      category === cat.id
                        ? "border-primary bg-secondary text-secondary-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-secondary/50",
                    )}
                  >
                    <cat.icon className="h-4 w-4" aria-hidden /> {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="card-name">Nombre</Label>
              <Input
                id="card-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Por ejemplo: Monstera del salón"
                maxLength={80}
                required
              />
            </div>

            {house.rooms.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="card-room">Estancia</Label>
                <select
                  id="card-room"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  className="h-11 rounded-xl border border-input bg-card px-3 text-sm text-foreground"
                >
                  <option value="">Sin estancia</option>
                  {house.rooms.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="card-instructions">Instrucciones</Label>
              <Textarea
                id="card-instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Qué hay que hacer, con qué frecuencia y cómo."
                rows={4}
                maxLength={1000}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="card-note">
                Nota importante{" "}
                <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Textarea
                id="card-note"
                value={importantNote}
                onChange={(e) => setImportantNote(e.target.value)}
                placeholder="Algo que no debe pasarse por alto."
                rows={2}
                maxLength={300}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>
                Foto <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <div className="flex items-center gap-3">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Vista previa de la foto elegida"
                    className="h-16 w-16 rounded-xl object-cover"
                  />
                ) : card?.photo_path ? (
                  <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-secondary text-xs text-secondary-foreground">
                    Foto actual
                  </span>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" aria-hidden />
                  {photoFile || card?.photo_path ? "Cambiar foto" : "Añadir foto"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                La foto es privada: solo la ven quienes participan en la casa.
              </p>
            </div>

            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {card ? "Guardar cambios" : "Crear ficha"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
