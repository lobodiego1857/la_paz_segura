# Requisitos y decisiones del proyecto

## Fuente de verdad

La fuente funcional es la propuesta aprobada `Propuesta_La_Paz_Segura_corregida.docx`. Este archivo resume sus decisiones para desarrollo. Si aparece una contradicción, no ocultarla: revisar la propuesta y documentar la decisión en esta página.

## Objetivo

Construir un sistema web progresivo para registrar, georreferenciar y dar seguimiento a inspecciones preventivas en zonas seleccionadas de La Paz. Conserva observaciones, fotografías, usuarios y el historial de actuaciones. No predice desastres, no diagnostica peligros, no certifica seguridad y no representa a una plataforma oficial municipal.

## Roles y permisos de la etapa actual

| Acción | Público | Administrador | Inspector |
|---|---|---|---|
| Consultar información | Solo lectura pública | Todas las zonas e inspecciones | Zonas asignadas e inspecciones propias |
| Registrar zona nueva | No | No | Sí |
| Editar zona | No | No | Sí, si está asignada |
| Registrar y editar inspección | No | No | Sí, en zonas asignadas |
| Registrar seguimiento | No | No | Sí, de sus inspecciones |
| Cerrar o reabrir inspección | No | No | No |
| Invitar inspectores, asignar zonas y administrar cuentas | No | Sí | No |
| Ver panel e informes | Consulta pública limitada | Información general | Información asignada |

No existe registro público de cuentas. Cualquier visitante puede consultar una vista pública de solo lectura con zonas activas e historial visible. El Administrador invita al Inspector mediante una Edge Function que usa Auth Admin en el servidor; la `service_role` nunca llega al navegador. El primer Administrador se configura manualmente.

## Cinco módulos

1. Acceso y usuarios.
2. Zonas y ubicación geográfica.
3. Inspecciones y evidencias fotográficas.
4. Seguimiento e historial.
5. Consulta, filtros y panel resumen.

## Modelo relacional (seis tablas)

- `perfiles`: usuario Auth, nombre, correo, rol, activo, fecha.
- `tipos_riesgo`: catálogo, con las categorías Deslizamiento, Derrumbe, Grieta, Filtración, Inundación y Otro.
- `zonas`: nombre, dirección, referencia, categoría, latitud, longitud, descripción, activa, fecha.
- `inspecciones`: zona, inspector, fecha, observaciones, nivel de atención, recomendaciones, estado, fecha actualización.
- `fotografias`: inspección, ruta del bucket privado, descripción, fecha.
- `seguimientos`: inspección, usuario, estado resultante, comentario, fecha, acción, fecha prevista y resultado.

Las zonas y perfiles se desactivan, no se borran en el uso normal. El historial no se sobrescribe ni elimina de manera rutinaria. El cambio del estado actual y la entrada histórica deben ser atómicos.

## Reglas de entrada

- `nivel_atencion`: Baja, Media o Alta; representa prioridad operativa, no un diagnóstico técnico.
- Estados exactos: `Pendiente`, `En seguimiento`, `Cerrada`.
- Toda actuación/actualización de estado necesita comentario. En esta etapa el Inspector solo puede avanzar sus casos; no puede cerrar ni reabrir.
- Inspecciones propias editables por Inspector únicamente mientras sigan Pendientes (según alcance opcional RI-09); Administrador puede editar todas.
- Hasta cinco imágenes por inspección, formatos JPG/PNG/WebP, compresión en cliente, tamaño objetivo máximo aproximado 1 MB.
- Si GPS no está disponible, se permite seleccionar el mapa o introducir coordenadas manualmente.
- Lectura/guardado requiere internet; la PWA no debe prometer funcionamiento completo sin conexión.
- Categorías/rótulos operativos no pueden interpretarse como clasificación científica oficial.

## Alcance, por prioridad

**Alta:** acceso/roles, zonas con coordenadas/mapa, inspecciones y fotos, acciones de seguimiento, estados, historial y permisos.

**Media:** GPS, geocodificación inversa editable, filtros, PWA instalable y panel de totales.

**Baja si queda tiempo:** gráficos, exportación CSV y edición de inspecciones ya registradas. Aunque el usuario pidió CSV, no debe poner en riesgo el núcleo funcional.

**Fuera de alcance:** predicción de desastres, diagnóstico profesional, integración con Alcaldía, notificaciones automáticas, offline completo, PDF avanzado, mapas de calor, apps nativas separadas.

## Decisiones adicionales indicadas por el usuario

- Sistema de desarrollo: Windows.
- Fecha de entrega: 10 de noviembre de 2026.
- Presupuesto para servicios externos: cero; favorecer planes gratuitos y transparentar límites.
- Enfoque actual de ejecución: local durante desarrollo.
- Datos de demostración: ficticios.
- CSV: deseado si el flujo principal y las pruebas ya están correctos.

**Punto pendiente:** la propuesta aprobada plantea entrega publicada por HTTPS e instalación PWA; el usuario indicó inicialmente publicación solo local. Desarrollar localmente ahora y resolver publicación HTTPS como decisión pendiente antes de la entrega, sin asumir que se ha cambiado el documento.
