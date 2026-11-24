# La Paz Segura — proyecto inicial editable

**Versión:** 0.1.0 · **Estado:** estructura inicial de desarrollo; no es la aplicación final.  
**Fecha límite indicada:** 10 de noviembre de 2026.  
**Alcance:** prototipo académico con datos ficticios, sin representar un inventario oficial ni emitir diagnósticos o predicciones.

## Qué contiene esta primera entrega

- Proyecto React + TypeScript + Vite que se ejecuta localmente en Windows.
- Interfaz inicial adaptable con navegación de los cinco módulos de la propuesta.
- Los borradores de formularios permanecen al cambiar entre secciones mientras la aplicación siga abierta; solo se guardan en Supabase al enviar el formulario. Un borrador no enviado se pierde al recargar la página o cerrar sesión.
- Al recargar una pestaña con sesión activa, Supabase restaura el usuario autenticado y se conserva la vista pública o personal seleccionada; no se guardan contraseñas en la aplicación.
- Configuración inicial PWA (la instalación y pruebas finales requieren validar HTTPS y dispositivos compatibles).
- Cliente Supabase que detecta `.env.local` y usa Auth para iniciar/cerrar sesión y registrar cuentas pendientes de aprobación.
- Control de acceso que consulta el perfil del usuario y no muestra el panel a cuentas inactivas.
- Primera migración SQL con seis tablas, roles, restricciones, Row Level Security, bucket privado y función transaccional de seguimiento.
- Documentos de alcance, plan y casos de aceptación para que cualquier agente de IA respete el documento aprobado.
- Registro de verificaciones reportadas y pendientes en `docs/REGISTRO_VERIFICACIONES.md`.

El acceso y la administración básica de cuentas están implementados en el cliente, pero **PR-01, PR-02 y las pruebas de roles aún requieren validación con cuentas reales del proyecto Supabase**. No se deben considerar aceptados hasta verificar persistencia, errores y rechazo efectivo por RLS. El módulo de zonas permite consultar categorías, registrar ubicaciones, verlas en un mapa y, para el Administrador, editarlas o desactivarlas; PR-03 y PR-07 aún requieren pruebas por rol. El módulo de inspecciones permite registrar observaciones, prioridad operativa y hasta cinco fotos comprimidas, guardadas en el bucket privado y consultables con enlaces firmados; **PR-04, PR-08 y PR-14 aún no se han verificado en el proyecto**. El seguimiento e historial consulta actuaciones y llama la función transaccional `registrar_seguimiento`; **PR-05, PR-11, PR-12, PR-13 y PR-15 aún requieren pruebas positivas y negativas por rol en Supabase**. La consulta incluye filtros por zona, categoría, estado y fechas, además de conteos por estado. Inicio muestra totales consultados bajo la sesión actual con RLS; estos resúmenes aún requieren validación con todas las cuentas/roles. La exportación CSV de las filas visibles incluye separador compatible con Excel en configuración regional española; la descarga abre correctamente, pero todavía falta confirmar que Excel distribuya las columnas en celdas separadas. La opción Panel e informes abre la consulta filtrable y el informe diseñado para imprimir o guardar como PDF desde el navegador; su presentación de impresión aún requiere verificación manual. No se han insertado zonas, inspecciones ni fotos de demostración por parte del código.

## Requisitos en Windows

Se recomienda instalar la versión LTS vigente de Node.js (Node 24 LTS a la fecha de preparación), que incluye npm, y Git para Windows. No es necesario instalar Visual Studio completo; Visual Studio Code es suficiente.

1. Comprueba lo que ya tienes. Abre **PowerShell** y ejecuta, una línea por vez:

   ```powershell
   node --version
   npm --version
   git --version
   ```

   Si un comando indica que no se reconoce, instala el componente que falta y cierra/abre de nuevo PowerShell. Descargas oficiales: [Node.js](https://nodejs.org/en/download) y [Git para Windows](https://git-scm.com/download/win).

2. Descomprime la carpeta `la-paz-segura-starter` en una ruta sencilla, por ejemplo `C:\Proyectos\la-paz-segura`.
3. Abre VS Code → **File / Open Folder** → selecciona `la-paz-segura-starter`.
4. En VS Code, abre **Terminal → New Terminal** y confirma que la terminal esté en la carpeta del proyecto.
5. Ejecuta:

   ```powershell
   npm install
   npm run dev
   ```

6. Abre la dirección que Vite muestre; el valor previsto es `http://127.0.0.1:5173`.
7. Para comprobar el código y la compilación:

   ```powershell
   npm run check
   ```

## Base de datos Supabase

La propuesta aprobada contempla Supabase Auth, PostgreSQL y almacenamiento de fotografías. El frontend se inicia en local, pero **Supabase Cloud requiere conexión a internet**; no es una base de datos local. Si luego se requiere un entorno completamente local, habrá que decidir explícitamente montar Supabase con Docker y ampliar la configuración.

1. Crea un proyecto Supabase propio en el panel oficial. Para respetar el presupuesto, empieza con el plan gratuito y revisa los límites actuales.
2. Abre el SQL Editor y ejecuta los archivos `supabase/migrations/202610180001_init.sql`, `supabase/migrations/202611090001_roles_asignaciones.sql` y `supabase/migrations/202611100001_consulta_publica.sql`, completos y en ese orden.
3. En Supabase → Authentication, crea el primer usuario de forma manual (el administrador inicial se configura manualmente según la propuesta).
4. Después de confirmar el correo/cuenta, localiza su UUID en Auth → Users y ejecuta en SQL Editor, sustituyendo el UUID:

   ```sql
   update public.perfiles
   set rol = 'administrador', activo = true
   where id_usuario = 'REEMPLAZA-CON-EL-UUID-DEL-ADMIN';
   ```

5. En el panel del proyecto, copia la URL y la **publishable key**. Nunca copies una `service_role`/secret key en el navegador.
6. Copia `.env.example` a `.env.local` y completa:

   ```dotenv
   VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=TU_PUBLISHABLE_KEY
   ```

7. Detén y vuelve a iniciar `npm run dev`.

Para habilitar «Agregar inspector», ejecuta `supabase functions deploy invitar-inspector` desde la raíz del proyecto con Supabase CLI enlazado a tu proyecto. Supabase proporciona `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` al entorno de la función; si tu proyecto no los muestra, configúralos desde los secretos de Edge Functions. Esas claves se quedan exclusivamente en Supabase y nunca se copian a `.env.local` ni al frontend.

No existe registro público: el Administrador invita Inspectores desde el panel mediante la Edge Function `invitar-inspector`; la función usa Auth Admin en Supabase y la clave `service_role` nunca se incluye en el frontend. Las reglas RLS de la base de datos son obligatorias y no deben reemplazarse por ocultar botones.

## Alcance aprobado: lo que debe cumplir la entrega

- Consulta pública sin inicio de sesión, además de los roles Administrador e Inspector. La consulta pública solo lee zonas activas e inspecciones con historial; el Administrador supervisa y el Inspector realiza el trabajo técnico.
- Tablas `perfiles`, `tipos_riesgo`, `zonas`, `inspecciones`, `fotografias`, `seguimientos`.
- Zonas con categoría principal, coordenadas, dirección/referencia y desactivación lógica.
- Inspecciones con fecha, observaciones, prioridad operativa Baja/Media/Alta, recomendaciones y hasta cinco fotografías JPG/PNG/WebP comprimidas a aproximadamente 1 MB.
- Estados Pendiente, En seguimiento y Cerrada. Solo Administrador cierra; se exige comentario. Solo Administrador puede reabrir.
- El Inspector registra zonas nuevas, pero no edita/desactiva zonas; actualiza el seguimiento de sus propias inspecciones.
- Historial cronológico con usuario, fecha, estado, comentario, acción, fecha prevista y resultado cuando corresponda.
- Acceso a imágenes desde un bucket privado.
- Adaptación desde 360 px a escritorio; GPS opcional con selección manual de mapa/coordenadas como alternativa.
- Datos de zonas, inspecciones y fotografías de demostración deben ser ficticios y declararse como tales.
- La propuesta final contempla PWA instalable y publicación HTTPS. La decisión inicial de trabajar localmente se cumple en la fase de desarrollo; confirmar publicación antes de la entrega.

## Versiones y respaldo

Guarda el código en Git. No subir `.env.local`, contraseñas, tokens, datos personales reales ni claves secretas. El archivo `.env.example` debe incluir solo nombres de variables vacías.

## Referencias oficiales

- [Node.js: descargas](https://nodejs.org/en/download)
- [Vite: guía de inicio](https://vite.dev/guide/)
- [React](https://react.dev/)
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase: claves de API](https://supabase.com/docs/guides/api/api-keys)
- [Leaflet](https://leafletjs.com/)
