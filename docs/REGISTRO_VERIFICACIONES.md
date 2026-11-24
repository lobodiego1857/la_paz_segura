# Registro de verificaciones

Este documento separa los resultados que el usuario informó durante el desarrollo de las verificaciones ejecutadas por el equipo. Un resultado informado por el usuario no sustituye las comprobaciones negativas por RLS ni las pruebas de aceptación completas.

## Resultados informados por el usuario

| Área | Resultado informado | Alcance que aún falta |
|---|---|---|
| Acceso | El usuario informó que ya probó el inicio de sesión. | Conservar evidencia de credenciales inválidas y cuenta pendiente/desactivada si se requiere cerrar PR-01 y PR-02 formalmente. |
| Roles | El usuario informó que probó la asignación de roles, incluido el rol Administrador y los demás roles previstos. | Conservar evidencia de las operaciones permitidas y denegadas para cada rol mediante la interfaz y RLS. |
| Zonas | Aparecieron las categorías; el mapa cargó; seleccionar el mapa permitió registrar coordenadas. El usuario informó que creó una zona y quedó registrada. | Confirmar asignaciones y rechazo de acceso de un Inspector a zonas de otro Inspector mediante pruebas negativas. |
| Inspecciones | El usuario informó que registró una inspección y que sus datos quedaron guardados. | PR-04 requiere comprobar dos fotos, Storage privado, errores de carga y acceso por rol. |
| Resumen | El usuario confirmó que Inicio muestra el resumen y se ve correctamente. | Confirmar los totales con cada rol y una respuesta de error ante falta de permisos/conexión. |
| CSV | El usuario confirmó que el archivo se descarga. En Excel las filas aparecían dentro de una sola celda. Se cambió el separador a `;` con la indicación `sep=;`; la apertura en columnas tras ese cambio está pendiente de confirmación. | Volver a abrir en Excel y confirmar las columnas. |
| Informe imprimible | Se añadió una vista diseñada con opción de imprimir/guardar como PDF. | El usuario aún no confirma el resultado de impresión ni del PDF. |
| Políticas y Storage | El usuario informó que el panel mostró 14 políticas públicas y 2 de Storage; también configuró el bucket `evidencias` como privado, con límite de 1 MB y MIME JPG/PNG/WebP. | Comprobar efectividad con sesiones de cada rol; los conteos de políticas por sí solos no demuestran que las reglas sean correctas. |

## Estado de aceptación

Ningún PR se considera aceptado solo por la inspección del código o una compilación. PR-01 a PR-15 siguen pendientes de completar con la matriz de `PRUEBAS_ACEPTACION.md`; algunos pasos felices de PR-01, PR-03 y persistencia de PR-04 fueron reportados por el usuario, pero no cubren por sí solos los casos completos.

## Comprobación local registrada

En los cambios recientes se ejecutó `npm.cmd run check`. TypeScript, la compilación de Vite y la generación del service worker terminaron correctamente. Esto comprueba tipos y compilación; no ejecuta las pruebas de aceptación contra Supabase ni verifica la impresión/PDF en el navegador.
