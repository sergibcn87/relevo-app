import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * La sección «Fichas» se llama ahora «Tareas» (2026-10-18): esta ruta solo
 * redirige para que los enlaces y marcadores antiguos no queden muertos.
 */
export const Route = createFileRoute("/fichas")({
  beforeLoad: () => {
    throw redirect({ to: "/tareas", replace: true });
  },
});
