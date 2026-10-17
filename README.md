# Relevo

Aplicación web responsive para organizar los cuidados de una casa (plantas, mascotas, tareas domésticas) durante una ausencia: el propietario crea un plan con visitas y tareas, invita a un cuidador y recibe avisos de lo que pasa.

Idioma: español de España · Formato 24 h · Zona horaria inicial Europe/Madrid.

## Funcionalidades

- Cuenta con correo y contraseña, recuperación de contraseña, rutas privadas.
- Casas con estancias y ciudad; fichas de cuidado (planta / mascota / casa) con foto privada.
- Planes con asistente manual (3 pasos) o **con IA** (revisión en dos columnas, cada tarea cita un fragmento literal de su ficha; nada se crea sin confirmar).
- Invitación de cuidador con enlace seguro (7 días, un solo uso, revocable), también para personas sin cuenta.
- Vista reducida de cuidador: solo Visitas, Avisos y Cuenta.
- Visitas: marcar tareas, omitir con motivo, nota y foto, incidencias, cierre automático al terminar.
- Avisos dentro de la app: visita completada, con omisiones, retrasada (90 min desde la primera tarea marcada), invitación aceptada, incidencias.
- Meteorología (Open-Meteo): reglas por umbral que sugieren tareas extra, sin duplicados.
- Guía interactiva por rol.

## Escenario de demostración

Cuenta → «Cargar o reiniciar demostración». Crea, solo para el usuario actual, la casa ficticia **Casa Olmo** (marcada «Demostración»): Monstera, gato Milo, toldo y paquetes; plan «Escapada a Lisboa» con visita de ayer completada con foto y una omisión, visita de hoy pendiente, visita futura, incidencia abierta, regla de viento para el toldo y avisos de ejemplo con el prefijo «[Demostración]». Las fechas se calculan desde el día actual. Reiniciar borra y recrea solo la casa de demostración propia; nunca toca datos reales ni ajenos. En «Crear con IA» hay un botón «Usar texto de ejemplo (demo)».

La cuidadora Nora es ficticia (aparece en textos); para probar el flujo real de cuidador hay que invitar a una segunda cuenta desde el plan.

## Configurar y comprobar los avisos

1. Completa una visita como cuidador → el propietario recibe «visita completada» (o «con omisiones»).
2. Retraso: marca una tarea (empieza la visita) y deja otras pendientes; pasados 90 minutos, al abrir la app se genera un único aviso «Visita sin completar». No hay tarea programada: la comprobación se lanza al abrir la app, como mucho cada 15 minutos por dispositivo. Repetirla no duplica avisos.
3. Los correos de aviso están retirados del producto. Los correos de acceso (registro, recuperación…) usan plantillas con la marca Relevo y se activan al verificar el DNS de `info.relevo.com`.

## Desarrollo

```sh
bun install
bun run dev
```

TanStack Start + React 19 + Tailwind CSS v4, backend en Lovable Cloud.

Ver también: `docs/decisiones.md`, `docs/pruebas.md`, `docs/guion-video.md`.
