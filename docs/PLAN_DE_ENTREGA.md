# Plan de entrega — fecha objetivo 10/11/2026

Hoy se toma como fecha de inicio el 18/10/2026. Quedan 23 días naturales. El plan original de cuatro semanas debe comprimirse y priorizar el flujo verificable, no añadir funcionalidades fuera de alcance.

## Orden de trabajo

### Fase 0 — Preparación (18–19 oct.)
- Confirmar Node.js, npm, Git en Windows.
- Abrir esta carpeta en VS Code y conseguir `npm run check` exitoso.
- Crear proyecto propio de Supabase (si se acepta que los datos de desarrollo estén en la nube) y ejecutar la migración.
- Inicializar Git y crear primer commit.

### Fase 1 — Acceso y base de datos (20–22 oct.)
- Inicio/cierre de sesión y pantalla de aprobación pendiente.
- Perfil activo/rol, primer administrador y administración de cuentas.
- Invitación de Inspectores mediante Edge Function sin exponer `service_role`.
- Probar rechazo de cuentas inactivas y restricciones RLS.

### Fase 2 — Zonas y mapa (23–26 oct.)
- Alta y edición técnica de zonas por Inspector; consulta general por Administrador.
- Asignación múltiple de zonas a Inspectores con RLS.
- Mapa Leaflet, coordenadas manuales y geocodificación inversa editable.

### Fase 3 — Inspecciones y evidencias (27–30 oct.)
- Alta de inspección con campos obligatorios, prioridad operativa y estado inicial.
- Compresión, validación y carga de hasta cinco imágenes en bucket privado.
- Prueba de errores de carga sin guardar referencias inexistentes.

### Fase 4 — Seguimiento e historial (31 oct.–3 nov.)
- Actuaciones con comentario, acción, fecha prevista y resultado.
- Cambiar estado e insertar historial en una operación atómica.
- El Administrador consulta; el Inspector no puede cerrar ni reabrir.

### Fase 5 — Consulta y aceptación (4–7 nov.)
- Filtros por zona, fecha, estado y categoría; resumen simple.
- Revisar casos PR-01 a PR-15 en escritorio y ancho 360 px.
- Generar al menos 8 zonas, 15 inspecciones y 20 fotos ficticias solo cuando la funcionalidad y los permisos funcionen.
- Añadir CSV si no pone en peligro el núcleo.

### Fase 6 — Entrega (8–10 nov.)
- Probar PWA e instalación con HTTPS si se mantiene la entrega publicada del documento.
- Revisar errores, accesos, `.env`, README, repositorio y capturas.
- Ensayar demostración y conservar evidencia de pruebas. Si la publicación sigue solo local, documentar esa desviación respecto a la propuesta.

## Regla de corte

Si hay retraso, primero diferir CSV, gráficos, GPS, ajustes visuales secundarios; nunca sacrificar la autorización RLS, el historial atómico, las evidencias ni las pruebas por rol.
