import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CloudSun, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const VARIABLES = {
  temperatura_max: { label: "Temperatura máxima", unit: "°C" },
  racha_viento: { label: "Racha de viento", unit: "km/h" },
} as const;

type WeatherVariable = keyof typeof VARIABLES;

function isVariable(value: string): value is WeatherVariable {
  return value in VARIABLES;
}

function ruleSummary(variable: string, threshold: number): string {
  const meta = isVariable(variable) ? VARIABLES[variable] : null;
  const label = meta?.label.toLowerCase() ?? variable;
  const unit = meta?.unit ?? "";
  return `Si la ${label} supera ${threshold} ${unit}`.trim();
}

interface WeatherRulesSectionProps {
  houseId: string;
  hasCity: boolean;
}

/** Reglas meteorológicas de la casa (PRD §11): variable, umbral, instrucción y ficha opcional. */
export function WeatherRulesSection({ houseId, hasCity }: WeatherRulesSectionProps) {
  const queryClient = useQueryClient();
  const [cardId, setCardId] = useState("none");
  const [variable, setVariable] = useState<WeatherVariable>("temperatura_max");
  const [threshold, setThreshold] = useState("");
  const [instruction, setInstruction] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["weather-rules", houseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("weather_rules")
        .select("id, variable, threshold, instruction, active, care_cards(name)")
        .eq("house_id", houseId)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const { data: cards = [] } = useQuery({
    queryKey: ["weather-rule-cards", houseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("care_cards")
        .select("id, name")
        .eq("house_id", houseId)
        .eq("archived", false)
        .order("name", { ascending: true });
      return data ?? [];
    },
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["weather-rules", houseId] });
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    const value = Number(threshold.replace(",", "."));
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Introduce un umbral válido (por ejemplo: 30 o 45).");
      return;
    }
    if (!instruction.trim()) {
      toast.error("Escribe la instrucción para el cuidador.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("weather_rules").insert({
      house_id: houseId,
      care_card_id: cardId === "none" ? null : cardId,
      variable,
      threshold: value,
      instruction: instruction.trim(),
      active: true,
    });
    setSaving(false);
    if (error) {
      toast.error("No se ha podido guardar la regla.");
      return;
    }
    toast.success("Regla meteorológica creada.");
    setInstruction("");
    setThreshold("");
    setCardId("none");
    invalidate();
  }

  async function toggleActive(id: string, active: boolean) {
    const { error } = await supabase.from("weather_rules").update({ active }).eq("id", id);
    if (error) {
      toast.error("No se ha podido actualizar la regla.");
      return;
    }
    invalidate();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("weather_rules").delete().eq("id", id);
    if (error) {
      toast.error("No se ha podido eliminar la regla.");
      return;
    }
    toast.success("Regla eliminada.");
    invalidate();
  }

  return (
    <section className="flex flex-col gap-3 border-t border-border pt-4" aria-label="Reglas meteorológicas">
      <div className="flex items-center gap-2">
        <CloudSun className="h-4 w-4 text-primary" aria-hidden />
        <h3 className="text-sm font-semibold text-foreground">Reglas meteorológicas</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Si la previsión supera el umbral el día de una visita, verás una sugerencia en el plan que
        podrás aceptar como tarea adicional o descartar.
      </p>
      {!hasCity && (
        <p className="rounded-xl bg-secondary/60 px-3 py-2 text-xs text-secondary-foreground">
          Añade una ciudad arriba para activar las sugerencias de tiempo.
        </p>
      )}

      {isLoading ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Cargando reglas…
        </p>
      ) : rules.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">
                  {ruleSummary(rule.variable, Number(rule.threshold))}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {rule.instruction}
                  {rule.care_cards?.name ? ` · Ficha: ${rule.care_cards.name}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Switch
                  checked={rule.active}
                  onCheckedChange={(checked) => toggleActive(rule.id, checked)}
                  aria-label={rule.active ? "Desactivar regla" : "Activar regla"}
                />
                <button
                  type="button"
                  onClick={() => remove(rule.id)}
                  aria-label="Eliminar regla"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Aún no hay reglas. Añade la primera:</p>
      )}

      <form onSubmit={handleAdd} className="flex flex-col gap-3 rounded-xl bg-secondary/40 p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wr-variable" className="text-xs">
              Variable
            </Label>
            <Select value={variable} onValueChange={(v) => isVariable(v) && setVariable(v)}>
              <SelectTrigger id="wr-variable">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(VARIABLES).map(([value, meta]) => (
                  <SelectItem key={value} value={value}>
                    {meta.label} ({meta.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wr-threshold" className="text-xs">
              Umbral ({VARIABLES[variable].unit})
            </Label>
            <Input
              id="wr-threshold"
              inputMode="decimal"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder={variable === "temperatura_max" ? "30" : "45"}
              maxLength={6}
              required
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wr-card" className="text-xs">
            Ficha relacionada <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <Select value={cardId} onValueChange={setCardId}>
            <SelectTrigger id="wr-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin ficha concreta</SelectItem>
              {cards.map((card) => (
                <SelectItem key={card.id} value={card.id}>
                  {card.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wr-instruction" className="text-xs">
            Instrucción
          </Label>
          <Input
            id="wr-instruction"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Por ejemplo: Revisar que el toldo esté recogido"
            maxLength={200}
            required
          />
        </div>
        <Button type="submit" variant="secondary" size="sm" disabled={saving} className="self-start">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Plus className="h-4 w-4" aria-hidden />
          )}
          Añadir regla
        </Button>
      </form>
    </section>
  );
}
