-- Ajuste incremental para separar supervisión administrativa y trabajo técnico.
begin;

alter table public.perfiles drop constraint if exists perfiles_rol_check;
update public.perfiles set rol = 'inspector' where rol = 'consultor';
alter table public.perfiles add constraint perfiles_rol_check check (rol in ('administrador', 'inspector'));

create table if not exists public.zonas_inspectores (
  id_zona bigint not null references public.zonas(id_zona),
  id_inspector uuid not null references public.perfiles(id_usuario),
  fecha_asignacion timestamptz not null default now(),
  primary key (id_zona, id_inspector)
);

create index if not exists idx_zonas_inspectores_inspector
  on public.zonas_inspectores(id_inspector, id_zona);

create or replace function public.inspector_tiene_zona(p_id_zona bigint, p_id_usuario uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.zonas_inspectores zi
    join public.perfiles p on p.id_usuario = zi.id_inspector
    where zi.id_zona = p_id_zona
      and zi.id_inspector = p_id_usuario
      and p.rol = 'inspector'
      and p.activo = true
  );
$$;

revoke all on function public.inspector_tiene_zona(bigint, uuid) from public, anon;
grant execute on function public.inspector_tiene_zona(bigint, uuid) to authenticated;

create or replace function public.asignar_zona_al_inspector_creador()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.tiene_rol(array['inspector']) then
    insert into public.zonas_inspectores (id_zona, id_inspector)
    values (new.id_zona, auth.uid())
    on conflict do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.asignar_zona_al_inspector_creador() from public, anon, authenticated;
drop trigger if exists on_zona_created_assign_inspector on public.zonas;
create trigger on_zona_created_assign_inspector
after insert on public.zonas
for each row execute function public.asignar_zona_al_inspector_creador();

alter table public.zonas_inspectores enable row level security;
drop policy if exists zonas_inspectores_select on public.zonas_inspectores;
create policy zonas_inspectores_select on public.zonas_inspectores
for select to authenticated
using (
  public.tiene_rol(array['administrador'])
  or id_inspector = auth.uid()
);
drop policy if exists zonas_inspectores_admin_insert on public.zonas_inspectores;
create policy zonas_inspectores_admin_insert on public.zonas_inspectores
for insert to authenticated
with check (
  public.tiene_rol(array['administrador'])
  and exists (
    select 1 from public.perfiles p
    where p.id_usuario = id_inspector and p.rol = 'inspector' and p.activo = true
  )
);
drop policy if exists zonas_inspectores_admin_delete on public.zonas_inspectores;
create policy zonas_inspectores_admin_delete on public.zonas_inspectores
for delete to authenticated
using (public.tiene_rol(array['administrador']));

drop policy if exists zonas_select_activos on public.zonas;
create policy zonas_select_activos on public.zonas
for select to authenticated
using (
  public.tiene_rol(array['administrador'])
  or public.inspector_tiene_zona(id_zona)
);
drop policy if exists zonas_insert_admin_inspector on public.zonas;
create policy zonas_insert_inspector on public.zonas
for insert to authenticated
with check (public.tiene_rol(array['inspector']));
drop policy if exists zonas_update_admin on public.zonas;
create policy zonas_update_inspector_asignado on public.zonas
for update to authenticated
using (public.inspector_tiene_zona(id_zona))
with check (public.inspector_tiene_zona(id_zona));

drop policy if exists inspecciones_select_activos on public.inspecciones;
create policy inspecciones_select_permitidas on public.inspecciones
for select to authenticated
using (
  public.tiene_rol(array['administrador'])
  or (
    public.tiene_rol(array['inspector'])
    and public.inspector_tiene_zona(id_zona)
    and id_usuario = auth.uid()
  )
);
drop policy if exists inspecciones_insert_admin_inspector on public.inspecciones;
create policy inspecciones_insert_inspector on public.inspecciones
for insert to authenticated
with check (
  public.tiene_rol(array['inspector'])
  and id_usuario = auth.uid()
  and public.inspector_tiene_zona(id_zona)
);
drop policy if exists inspecciones_update_admin_o_propias_pendientes on public.inspecciones;
create policy inspecciones_update_inspector_propia_pendiente on public.inspecciones
for update to authenticated
using (
  public.tiene_rol(array['inspector'])
  and id_usuario = auth.uid()
  and public.inspector_tiene_zona(id_zona)
  and estado = 'Pendiente'
)
with check (
  public.tiene_rol(array['inspector'])
  and id_usuario = auth.uid()
  and public.inspector_tiene_zona(id_zona)
  and estado = 'Pendiente'
);

drop policy if exists fotografias_select_activos on public.fotografias;
create policy fotografias_select_permitidas on public.fotografias
for select to authenticated
using (
  public.tiene_rol(array['administrador'])
  or exists (
    select 1 from public.inspecciones i
    where i.id_inspeccion = fotografias.id_inspeccion
      and i.id_usuario = auth.uid()
      and public.inspector_tiene_zona(i.id_zona)
  )
);
drop policy if exists fotografias_insert_propietario on public.fotografias;
create policy fotografias_insert_inspector on public.fotografias
for insert to authenticated
with check (
  public.tiene_rol(array['inspector'])
  and exists (
    select 1 from public.inspecciones i
    where i.id_inspeccion = fotografias.id_inspeccion
      and i.id_usuario = auth.uid()
      and public.inspector_tiene_zona(i.id_zona)
  )
);

drop policy if exists seguimientos_select_activos on public.seguimientos;
create policy seguimientos_select_permitidos on public.seguimientos
for select to authenticated
using (
  public.tiene_rol(array['administrador'])
  or exists (
    select 1 from public.inspecciones i
    where i.id_inspeccion = seguimientos.id_inspeccion
      and i.id_usuario = auth.uid()
      and public.inspector_tiene_zona(i.id_zona)
  )
);

create or replace function public.registrar_seguimiento(
  p_id_inspeccion bigint,
  p_estado_nuevo text,
  p_comentario text,
  p_accion text default null,
  p_fecha_prevista date default null,
  p_resultado text default null
)
returns bigint
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_usuario uuid := auth.uid();
  v_propietario uuid;
  v_zona bigint;
  v_estado_actual text;
  v_id_seguimiento bigint;
begin
  if not public.tiene_rol(array['inspector']) then
    raise exception 'Solo un Inspector activo puede registrar seguimientos.' using errcode = '42501';
  end if;
  if p_estado_nuevo not in ('Pendiente', 'En seguimiento', 'Cerrada') then
    raise exception 'Estado de seguimiento no válido.' using errcode = '22023';
  end if;
  if p_comentario is null or length(btrim(p_comentario)) = 0 then
    raise exception 'El comentario es obligatorio para registrar una actuación.' using errcode = '23514';
  end if;
  select i.id_usuario, i.id_zona, i.estado
    into v_propietario, v_zona, v_estado_actual
    from public.inspecciones i
   where i.id_inspeccion = p_id_inspeccion
   for update;
  if not found or v_propietario <> v_usuario or not public.inspector_tiene_zona(v_zona) then
    raise exception 'El Inspector solo puede actualizar sus inspecciones asignadas.' using errcode = '42501';
  end if;
  if p_estado_nuevo = 'Cerrada' or (v_estado_actual = 'Cerrada' and p_estado_nuevo <> 'Cerrada') then
    raise exception 'El Inspector no puede cerrar ni reabrir inspecciones.' using errcode = '42501';
  end if;
  update public.inspecciones
     set estado = p_estado_nuevo, fecha_actualizacion = now()
   where id_inspeccion = p_id_inspeccion;
  insert into public.seguimientos
    (id_inspeccion, id_usuario, estado_nuevo, comentario, accion, fecha_prevista, resultado)
  values
    (p_id_inspeccion, v_usuario, p_estado_nuevo, btrim(p_comentario),
     nullif(btrim(p_accion), ''), p_fecha_prevista, nullif(btrim(p_resultado), ''))
  returning id_seguimiento into v_id_seguimiento;
  return v_id_seguimiento;
end;
$$;

revoke all on function public.registrar_seguimiento(bigint, text, text, text, date, text) from public, anon;
grant execute on function public.registrar_seguimiento(bigint, text, text, text, date, text) to authenticated;

grant select on public.zonas_inspectores to authenticated;
grant insert, delete on public.zonas_inspectores to authenticated;

drop policy if exists evidencias_lectura_activos on storage.objects;
create policy evidencias_lectura_asignadas on storage.objects
for select to authenticated
using (
  bucket_id = 'evidencias'
  and (
    public.tiene_rol(array['administrador'])
    or exists (
      select 1
      from public.inspecciones i
      where i.id_inspeccion = case
        when (storage.foldername(name))[2] ~ '^[0-9]+$'
        then ((storage.foldername(name))[2])::bigint
        else null
      end
      and i.id_usuario = auth.uid()
      and public.inspector_tiene_zona(i.id_zona)
    )
  )
);
drop policy if exists evidencias_carga_propietario on storage.objects;
create policy evidencias_carga_inspector on storage.objects
for insert to authenticated
with check (
  bucket_id = 'evidencias'
  and public.tiene_rol(array['inspector'])
  and exists (
    select 1
    from public.inspecciones i
    where i.id_inspeccion = case
      when (storage.foldername(name))[2] ~ '^[0-9]+$'
      then ((storage.foldername(name))[2])::bigint
      else null
    end
    and i.id_usuario = auth.uid()
    and public.inspector_tiene_zona(i.id_zona)
  )
);

commit;
