-- Lista de comprobación manual inicial. Ejecutar con cuidado en proyecto de desarrollo.
-- No asumir que el estado de la UI demuestra la seguridad; usar cuentas de cada rol.

-- 1) Verifica RLS activado para las seis tablas:
select n.nspname as esquema, c.relname as tabla, c.relrowsecurity as rls_activo
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('perfiles','tipos_riesgo','zonas','inspecciones','fotografias','seguimientos')
order by c.relname;

-- 2) Verifica que las categorías estén cargadas:
select id_tipo_riesgo, nombre from public.tipos_riesgo order by id_tipo_riesgo;

-- 3) Comprueba que la llave no sea pública y que el bucket sea privado:
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'evidencias';

-- 4) Cuenta de prueba: revisar en el panel que el perfil recién creado empieza
--    con rol='inspector' y activo=false. Luego asignar roles solo desde Admin.

-- Las pruebas de permisos deben realizarse autenticándose como Administrador,
-- Inspector de cuenta A, Inspector de cuenta B y Consultor; documentar éxito/fallo.
