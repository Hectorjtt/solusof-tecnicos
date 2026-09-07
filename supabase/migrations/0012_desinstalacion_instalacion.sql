-- Nuevo tipo de servicio "desinstalacion_instalacion": se quita un equipo y
-- se instala otro en la misma visita. Necesita su propio IMEI (el que se
-- quita, aparte del imei_gps que ya representa el que se instala) y su
-- propio checklist de accesorios desinstalados (aparte de
-- accesorios_instalados, que en este tipo representa lo que se instala).
alter table servicios add column imei_gps_desinstalacion text;

-- Mismo esquema/políticas que accesorios_revisados (0006), solo que aquí
-- deja constancia de qué accesorios se retiraron de la unidad.
create table accesorios_desinstalados (
  id                uuid primary key default gen_random_uuid(),
  servicio_id       uuid not null references servicios(id) on delete cascade,
  accesorio_key     text not null,
  etiqueta          text not null default '',
  checked           boolean not null default false,
  es_personalizado  boolean not null default false,
  updated_at        timestamptz not null default now(),
  unique (servicio_id, accesorio_key)
);

alter table accesorios_desinstalados enable row level security;

create policy accesorios_desinstalados_select on accesorios_desinstalados
  for select to authenticated
  using (is_admin() or owns_servicio(servicio_id));

create policy accesorios_desinstalados_insert on accesorios_desinstalados
  for insert to authenticated
  with check (is_admin() or (owns_servicio(servicio_id) and servicio_no_terminal(servicio_id)));

create policy accesorios_desinstalados_update on accesorios_desinstalados
  for update to authenticated
  using (is_admin() or (owns_servicio(servicio_id) and servicio_no_terminal(servicio_id)))
  with check (is_admin() or (owns_servicio(servicio_id) and servicio_no_terminal(servicio_id)));

create trigger accesorios_desinstalados_set_updated_at before update on accesorios_desinstalados
  for each row execute function set_updated_at();
