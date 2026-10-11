# Relevo — hoja de ruta

PRD de referencia: documento subido por el usuario (698 líneas). Idioma: español de España. Zona horaria: Europe/Madrid. Formato 24 h.

## Bloques (según PRD §21)

- [x] 0. Lovable Cloud activado + acceso con correo habilitado
- [x] 1. Autenticación, datos y base visual
  - [x] Esquema de base de datos (perfiles, casas, fichas, planes, invitaciones, visitas, tareas, incidencias, actividad, reglas y sugerencias meteorológicas, propuestas IA, avisos, cola de correo, estado de guía)
  - [x] Sistema de diseño (paleta marfil/verde bosque/terracota/ámbar, tipografía Sora, radios)
  - [x] Registro, login, mostrar/ocultar contraseña, recuperación, cierre de sesión
  - [x] Rutas privadas protegidas (`_authenticated`) con conservación del destino (invitaciones)
  - [x] Landing pública en `/`, panel Resumen con creación de casa, Cuenta (perfil + preferencias de correo + guía), centro de Avisos, navegación móvil en cápsula y barra lateral de escritorio
- [x] 2. Casa, fichas, planes y guía
  - [x] Casa: nombre, estancias editables, ciudad opcional (diálogo desde Resumen)
  - [x] Fichas: planta/mascota/casa, plantillas, foto (bucket privado care-photos + URLs firmadas), archivo en lugar de borrado
  - [x] Planes: asistente manual 3 pasos (fechas → fichas/visitas → revisión), borrador persistente en plans.draft
  - [x] Visitas individuales y repetidas con vista previa sin duplicados
  - [x] Guía/tour interactivo por rol (6/5 pasos, teclado, Escape, reduced-motion, estado por usuario/rol/versión)
- [x] 3. Invitaciones, visitas e incidencias
  - [x] Invitación con token seguro, 7 días, un solo uso, revocable, aceptación autenticada (página pública /invitacion/$token; el plan pasa a activo y el propietario recibe aviso)
  - [x] Cuidador: planes aceptados, próxima visita, marcar tareas, omitir con motivo obligatorio, foto/nota por tarea
  - [x] Bucket de fotos privado + subida con compresión (cuidadores incluidos)
  - [x] Incidencias: abierta/resuelta (solo el propietario resuelve), foto opcional, avisos automáticos
  - [x] Cierre de visita con confirmación y aviso anti-duplicados (función close_visit)
- [x] 4. Cierre automático y avisos
  - [x] Cierre automático al resolver la última tarea (con confirmación previa y anti-duplicados) — hecho en bloque 3
  - [x] Aviso de finalización y de omisiones al propietario (centro de avisos + campana) — hecho en bloque 3
  - [x] Aviso de retraso: margen 90 min desde el primer check del cuidador (visits.started_at, trigger tasks_mark_visit_started), una sola vez por visita; la comprobación se hace al abrir la app (ruta /api/public/hooks/visitas-retrasadas, sin tarea programada)
  - [x] Avisos por correo: retirados del producto por decisión del usuario (2026-10-11); columnas de preferencias y cola de correo marcadas como deprecated
- [ ] 5. IA (crear plan con IA, revisión en dos columnas, trazabilidad de fragmentos, validación en servidor)
- [ ] 6. Meteorología (Open-Meteo, reglas por umbral, sugerencias aceptables/descartables, caché 1 h)
- [ ] 7. Animaciones, pruebas (320/390/768/1440 px) y correcciones
- [ ] 8. Escenario de demostración (Casa Olmo, Alex, Nora, Monstera, Milo, toldo, paquetes) y evidencias (README, decisiones, guion de vídeo)

## Notas

- Datos de demostración separados de datos reales.
