import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { WeatherRulesSection } from "@/components/weather-rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface HouseSummary {
  id: string;
  name: string;
  city: string | null;
  rooms: string[];
}

interface HouseSettingsProps {
  house: HouseSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Ajustes de la casa: nombre, ciudad opcional y estancias editables. */
export function HouseSettings({ house, open, onOpenChange }: HouseSettingsProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(house.name);
  const [city, setCity] = useState(house.city ?? "");
  const [rooms, setRooms] = useState<string[]>(house.rooms);
  const [newRoom, setNewRoom] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(house.name);
      setCity(house.city ?? "");
      setRooms(house.rooms);
      setNewRoom("");
    }
  }, [open, house]);

  function addRoom() {
    const value = newRoom.trim();
    if (!value) return;
    if (rooms.some((r) => r.toLowerCase() === value.toLowerCase())) {
      toast.error("Esa estancia ya existe.");
      return;
    }
    setRooms((prev) => [...prev, value]);
    setNewRoom("");
  }

  function onRoomKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addRoom();
    }
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("El nombre de la casa no puede estar vacío.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("houses")
      .update({ name: name.trim(), city: city.trim() || null, rooms })
      .eq("id", house.id);
    setSaving(false);
    if (error) {
      toast.error("No se han podido guardar los cambios de la casa.");
      return;
    }
    toast.success("Casa actualizada.");
    queryClient.invalidateQueries({ queryKey: ["houses"] });
    queryClient.invalidateQueries({ queryKey: ["house", house.id] });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustes de la casa</DialogTitle>
          <DialogDescription>
            Nombre, ciudad para el tiempo y las estancias que aparecen en las fichas.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-house-name">Nombre de la casa</Label>
            <Input
              id="settings-house-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-house-city">
              Ciudad <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="settings-house-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Por ejemplo: Valencia"
              maxLength={80}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-new-room">Estancias</Label>
            <div className="flex gap-2">
              <Input
                id="settings-new-room"
                value={newRoom}
                onChange={(e) => setNewRoom(e.target.value)}
                onKeyDown={onRoomKeyDown}
                placeholder="Por ejemplo: Terraza"
                maxLength={40}
              />
              <Button type="button" variant="secondary" onClick={addRoom} disabled={!newRoom.trim()}>
                <Plus className="h-4 w-4" aria-hidden /> Añadir
              </Button>
            </div>
            {rooms.length > 0 ? (
              <ul className="mt-1 flex flex-wrap gap-2">
                {rooms.map((room) => (
                  <li
                    key={room}
                    className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-sm text-secondary-foreground"
                  >
                    {room}
                    <button
                      type="button"
                      onClick={() => setRooms((prev) => prev.filter((r) => r !== room))}
                      aria-label={`Quitar ${room}`}
                      className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-primary/10"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                Sin estancias: las fichas no pedirán ubicación.
              </p>
            )}
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Guardar
            </Button>
          </div>
        </form>
        <WeatherRulesSection houseId={house.id} hasCity={!!city.trim()} />
      </DialogContent>
    </Dialog>
  );
}
