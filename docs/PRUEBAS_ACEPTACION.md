# Pruebas de aceptación heredadas de la propuesta

| ID | Prueba | Rol | Resultado exigido |
|---|---|---|---|
| PR-01 | Inicio de sesión válido e inválido | Todos | Acceso correcto o error comprensible en español. |
| PR-02 | Invitación nueva sin activación | Inspector invitado | No consulta datos hasta activación por Admin. |
| PR-03 | Registrar zona y coordenadas | Inspector | Zona registrada aparece en el mapa y queda asignada al Inspector. |
| PR-04 | Registrar inspección con dos fotos desde celular | Inspector | Registro y fotos visibles desde la zona/historial; Administrador solo consulta. |
| PR-05 | Cambiar estado a En seguimiento | Inspector | Inspector puede actualizar sus inspecciones; cierre y reapertura no están permitidos. |
| PR-06 | Intentar crear inspección | Administrador | Rechazo visible y rechazo real por base de datos. |
| PR-07 | Intentar editar una zona ajena | Inspector | Rechazo en la base de datos; solo puede editar zonas asignadas. |
| PR-08 | Subir tipo o tamaño no permitido | Inspector | Mensaje comprensible; archivo rechazado. |
| PR-09 | Vista de 360 px y escritorio | Todos | Sin cortes; controles táctiles utilizables. |
| PR-10 | Instalar PWA en pantalla de inicio | Todos | Icono e inicio instalado en dispositivo compatible, mediante HTTPS. |
| PR-11 | Inspector cierra inspección propia | Inspector | Rechazo; puede añadir actuación permitida sin cerrar. |
| PR-12 | Cambiar estado actual | Inspector/Admin | Estado e historial se actualizan juntos; no hay discrepancia. |
| PR-13 | Acceso a datos con rol sin permiso | Administrador/Inspector | RLS rechaza operaciones fuera de sus responsabilidades aunque se llame directamente a API. |
| PR-14 | Falla carga de una fotografía | Inspector | Mensaje de error, sin referencia a objeto inexistente. |
| PR-15 | Inspector intenta cerrar | Inspector | Cierre rechazado y mensaje comprensible. |
| PR-16 | Cambiar de sección con un formulario sin enviar | Inspector/Administrador | Al regresar, el borrador sigue visible; navegar no lo guarda en Supabase ni lo borra. Se conserva mientras la aplicación siga abierta y no se cierre sesión. |
| PR-17 | Acceder al área personal con una sesión previa | Todos | Se cierra la sesión anterior y se solicita correo y contraseña; no se abre un rol directamente. Si falla el cierre, se muestra un error y no se concede el acceso. |
| PR-18 | Recargar la página con sesión activa | Inspector/Administrador | Se restaura la sesión y el área personal sin pedir credenciales nuevamente; si la sesión expiró, se muestra el formulario de acceso. |
| PR-19 | Volver a la consulta pública desde el área personal | Todos | El mapa recupera su tamaño y muestra los puntos de las zonas activas después de volver a hacerse visible. |

## Casos adicionales de seguridad

- Perfil inactivo no lee zonas, inspecciones, metadatos ni objetos del bucket privado.
- Administrador no puede insertar/actualizar zonas, inspecciones ni seguimientos, aunque manipule peticiones.
- Inspector no puede consultar ni modificar zonas asignadas a otro Inspector.
- La Edge Function de invitación rechaza llamadas sin sesión de Administrador activo.
- Inspector no puede seguir ni editar inspecciones ajenas.
- La app no tiene permiso para borrar físicamente tablas/filas históricas mediante la API normal.
- La función `registrar_seguimiento` no acepta comentario vacío y rechaza el cierre/reapertura del Inspector.
- Una sexta foto es rechazada en base de datos, además de la validación de interfaz.
- La clave secreta/service_role no está en el bundle ni en archivos versionados.
- Un visitante sin autenticación puede consultar zonas activas e inspecciones públicas, pero no puede modificar datos ni consultar perfiles.

Marcar un caso como aprobado solo cuando exista evidencia de ejecución; no marcar por inspección visual del código solamente.
