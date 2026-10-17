# Pruebas

Todas las pruebas se hicieron en un navegador automatizado sobre la vista previa (no en móvil físico).

## Realizadas

- Acceso: registro, entrada, redirección de rutas privadas a la pantalla de acceso conservando el destino.
- Plan manual publicado con 6 visitas y 6 tareas, sin duplicados.
- Invitación: aceptación con cuenta existente y con cuenta nueva (vuelta a la invitación tras confirmar el correo).
- Inicio de visita: marcar la primera tarea fija la hora de inicio y pasa la visita a «en curso».
- Aviso de retraso generado una sola vez por visita.
- IA: propuesta, revisión en dos columnas, creación solo al confirmar; tareas sin fragmento literal descartadas.
- Meteorología: regla → sugerencia → aceptar crea exactamente una tarea; recargar no duplica.
- Guía: «Ver guía de nuevo» vuelve a Resumen y arranca en el paso 1.
- Vista de cuidador: menú reducido, aviso y redirección a Visitas.
- Responsive: 11 pantallas en 320, 390, 768 y 1440 px sin desbordamiento horizontal (corregida la cabecera de Planes).
- Demostración: carga desde Cuenta, casa «Casa Olmo» marcada y avisos «[Demostración]» visibles.

## Pendientes

- Pruebas en móvil físico.
- Correos de acceso con marca: pendiente de verificación DNS de `info.relevo.com`.
- Tercera cuenta para comprobar que no ve datos ajenos (las reglas de acceso están en la base de datos, pero falta la prueba manual).
