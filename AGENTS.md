# Instrucciones obligatorias para Codex, Claude Code y cualquier asistente de código

Este repositorio implementa la propuesta académica aprobada de La Paz Segura. Antes de editar, leer `README.md`, `docs/REQUISITOS_Y_DECISIONES.md` y `docs/PRUEBAS_ACEPTACION.md`.

## No negociables

1. Interfaz y mensajes en español; diseño adaptable desde 360 px hasta escritorio.
2. React + TypeScript + Vite + Bootstrap 5; una única PWA, no apps web/nativa separadas.
3. Supabase Auth, PostgreSQL, Storage privado y políticas RLS. Nunca confiar solo en controles de la interfaz.
4. No insertar datos reales ni presentar el prototipo como sistema oficial de la Alcaldía. Cualquier datos de zona/inspección de ejemplo deben estar claramente identificados como ficticios.
5. No implementar IA predictiva, diagnóstico profesional, notificaciones automáticas, mapas de calor, integración institucional, trabajo completo offline ni informes PDF avanzados: están fuera de alcance.
6. No guardar contraseñas en tablas propias; las gestiona Supabase Auth. Jamás incluir la `service_role`/secret key en frontend o repositorio.
7. No conceder borrado físico habitual de zonas, perfiles, inspecciones, fotos o historial. Preferir desactivación lógica; preservar trazabilidad.
8. Todo cambio de estado debe actualizar estado e historial en una única operación transaccional. El Inspector registra seguimientos, pero no puede cerrar ni reabrir inspecciones.
9. El Administrador supervisa y consulta; no crea ni modifica zonas, inspecciones o seguimientos. El Inspector crea y edita zonas asignadas, registra sus inspecciones y sus seguimientos.
10. Las asignaciones de zonas, invitaciones y permisos deben estar protegidos por RLS y una Edge Function segura; nunca exponer `service_role`.
11. Máximo cinco fotografías por inspección; JPG/PNG/WebP; validar y comprimir a aproximadamente 1 MB en cliente y restringir en Storage.
12. No declarar una función terminada solo porque tenga UI. Verificar persistencia, permisos, errores y pruebas; actualizar documentación.

## Flujo de trabajo para cada cambio

- Primero resume el objetivo y qué archivos tocarás.
- Haz un cambio pequeño y coherente; reutiliza convenciones existentes.
- Ejecuta `npm run check` y corrige sus errores antes de finalizar.
- Para cambios de datos/seguridad, actualiza la migración o crea otra migración incremental; no pedir al usuario que haga cambios manuales no documentados.
- Añade o actualiza pruebas de aceptación, incluida una prueba negativa por cada permiso nuevo.
- No inventes claves de entorno, IDs de Supabase, despliegues, cuentas ni resultados de pruebas. Indica qué no se pudo verificar.
- Conserva código legible; evita mega-componentes, `any` injustificados, duplicar lógica y dependencias que no aporten al alcance.
- El alcance actual contempla consulta pública de solo lectura, Administrador e Inspector. No reintroducir Consultor ni registro público de cuentas sin una decisión explícita.
