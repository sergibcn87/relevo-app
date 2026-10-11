import { useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadCarePhoto } from "@/lib/photo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface IncidentDialogProps {
  planId: string;
  houseId: string;
  authorId: string;
  visitId?: string;
  trigger: ReactNode;
  onCreated?: () => void;
}

/** Diálogo para abrir una incidencia (título, descripción, ficha y foto opcionales). */
export function IncidentDialog({
  planId,
  houseId,
  authorId,
  visitId,
  trigger,
  onCreated,
}: IncidentDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [careCardId, setCareCardId] = useState<string>("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: careCards = [] } = useQuery({
    queryKey: ["care-cards", houseId],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("care_cards")
        .select("id, name, category")
        .eq("house_id", houseId)
        .eq("archived", false)
        .order("name");
      return data ?? [];
    },
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSaving(true);
    try {
      let photoPath: string | null = null;
      if (photo) photoPath = await uploadCarePhoto(houseId, photo);
      const { error } = await supabase.from("incidents").insert({
        id: crypto.randomUUID(),
        plan_id: planId,
        visit_id: visitId ?? null,
        care_card_id: careCardId || null,
        author_id: authorId,
        title: title.trim(),
        description: description.trim(),
        photo_path: photoPath,
        status: "abierta",
      });
      if (error) throw error;
      toast.success("Incidencia registrada. El propietario recibirá un aviso.");
      setOpen(false);
      setTitle("");
      setDescription("");
      setCareCardId("");
      setPhoto(null);
      onCreated?.();
    } catch {
      toast.error("No se ha podido registrar la incidencia. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abrir una incidencia</DialogTitle>
          <DialogDescription>
            Describe qué ha pasado. La otra persona del plan recibirá un aviso.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="incident-title">Título</Label>
            <Input
              id="incident-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Por ejemplo: La maceta está rota"
              maxLength={120}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="incident-description">Descripción</Label>
            <Textarea
              id="incident-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explica qué ha ocurrido y qué has hecho."
              rows={4}
              maxLength={1000}
              required
            />
          </div>
          {careCards.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="incident-card">
                Ficha relacionada{" "}
                <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Select value={careCardId} onValueChange={setCareCardId}>
                <SelectTrigger id="incident-card">
                  <SelectValue placeholder="Ninguna" />
                </SelectTrigger>
                <SelectContent>
                  {careCards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="incident-photo">
              Foto <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="incident-photo"
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
          </div>
          <Button
            type="submit"
            disabled={saving || !title.trim() || !description.trim()}
            className="self-start"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Registrar incidencia
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
