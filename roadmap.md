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
- [ ] 2. Casa, fichas, planes y guía
  - [ ] Casa: nombre, estancias editables, ciudad opcional
  - [ ] Fichas: planta/mascota/casa, plantillas, foto, archivo en lugar de borrado
  - [ ] Planes: asistente manual 3 pasos (fechas → fichas/visitas → cuidador/revisión), borrador persistente
  - [ ] Visitas individuales y repetidas con vista previa sin duplicados
  - [ ] Guía/tour interactivo por rol (máx. 6/5 pasos, teclado, Escape, reduced-motion, estado por usuario/rol/versión)
- [ ] 3. Invitaciones, visitas e incidencias
  - [ ] Invitación con token seguro, 7 días, un solo uso, revocable, aceptación autenticada
  - [ ] Cuidador: planes aceptados, visita del día, marcar tareas, omitir con motivo, foto/nota
  - [ ] Bucket de fotos privado + subida con progreso y compresión
  - [ ] Incidencias: abierta/resuelta, foto opcional
- [ ] 4. Cierre automático y avisos
  - [ ] Cierre automático al resolver la última tarea (con confirmación previa y anti-duplicados)
  - [ ] Aviso de finalización y de omisiones al propietario (centro de avisos + campana)
  - [ ] Aviso de retraso: margen 90 min (30+60), una sola vez por visita, tarea programada cada 5 min
  - [ ] Cola de correo con reintentos; preferencias de correo en Cuenta; estado claro si el correo no está configurado
- [ ] 5. IA (crear plan con IA, revisión en dos columnas, trazabilidad de fragmentos, validación en servidor)
- [ ] 6. Meteorología (Open-Meteo, reglas por umbral, sugerencias aceptables/descartables, caché 1 h)
- [ ] 7. Animaciones, pruebas (320/390/768/1440 px) y correcciones
- [ ] 8. Escenario de demostración (Casa Olmo, Alex, Nora, Monstera, Milo, toldo, paquetes) y evidencias (README, decisiones, guion de vídeo)

## Notas

- Correo transaccional: requiere remitente verificado; si falta configuración, avisos in-app funcionan igualmente y se indica el paso pendiente.
- Datos de demostración separados de datos reales; sin envíos automáticos de correo a ejemplos precargados.
