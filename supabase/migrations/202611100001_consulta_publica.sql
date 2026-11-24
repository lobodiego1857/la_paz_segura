-- Consulta pública de solo lectura para la página abierta.
begin;

grant select on public.tipos_riesgo to anon;
grant select (id_zona, nombre, direccion, referencia, id_tipo_riesgo, latitud, longitud, descripcion, activa, fecha_registro)
  on public.zonas to anon;
grant select (id_inspeccion, id_zona, fecha_inspeccion, observaciones, nivel_atencion, recomendaciones, estado, fecha_actualizacion)
  on public.inspecciones to anon;
grant select (id_seguimiento, id_inspeccion, estado_nuevo, comentario, fecha_cambio, accion, fecha_prevista, resultado)
  on public.seguimientos to anon;

drop policy if exists tipos_riesgo_public_select on public.tipos_riesgo;
create policy tipos_riesgo_public_select on public.tipos_riesgo
for select to anon
using (true);

drop policy if exists zonas_public_select on public.zonas;
create policy zonas_public_select on public.zonas
for select to anon
using (activa = true);

drop policy if exists inspecciones_public_select on public.inspecciones;
create policy inspecciones_public_select on public.inspecciones
for select to anon
using (
  exists (
    select 1
    from public.zonas z
    where z.id_zona = inspecciones.id_zona
      and z.activa = true
  )
);

drop policy if exists seguimientos_public_select on public.seguimientos;
create policy seguimientos_public_select on public.seguimientos
for select to anon
using (
  exists (
    select 1
    from public.inspecciones i
    join public.zonas z on z.id_zona = i.id_zona
    where i.id_inspeccion = seguimientos.id_inspeccion
      and z.activa = true
  )
);

revoke insert, update, delete on public.tipos_riesgo, public.zonas, public.inspecciones, public.fotografias, public.seguimientos
  from anon;

commit;
