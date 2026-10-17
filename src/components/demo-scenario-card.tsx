import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Carga (o reinicia) el escenario ficticio «Casa Olmo» del usuario actual.
 * Solo toca la casa de demostración propia; nunca datos reales ni ajenos.
 */
export function DemoScenarioCard() {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function load() {
    if (!window.confirm("Se creará (o reiniciará) la casa de demostración «Casa Olmo». Tus datos reales no se tocan. ¿Continuar?")) return;
    setLoading(true);
    try {
      const { data: houseId, error } = await supabase.rpc("load_demo_scenario");
      if (error || !houseId) throw error ?? new Error("sin casa");
      // Foto de ejemplo de la visita completada
      const blob = await (await fetch("/demo-monstera.jpg")).blob();
      await supabase.storage
        .from("care-photos")
        .upload(`${houseId}/demo-monstera.jpg`, blob, { contentType: "image/jpeg", upsert: true });
      await queryClient.invalidateQueries();
      toast.success("Escenario de demostración cargado.");
      navigate({ to: "/inicio" });
    } catch {
      toast.error("No se pudo cargar la demostración. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-6 animate-fade-up-3">
      <h2 className="text-base font-semibold text-card-foreground">Escenario de demostración</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Crea la casa ficticia «Casa Olmo» con la Monstera, el gato Milo, el toldo y los paquetes:
        una visita de ayer completada con foto, la de hoy, una futura, una incidencia abierta, una
        regla de viento y avisos de ejemplo. Las fechas se calculan desde hoy.
      </p>
      <Button type="button" variant="outline" size="sm" className="mt-4" onClick={load} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
        Cargar o reiniciar demostración
      </Button>
    </Card>
  );
}
