-- Paso extra "Accesorios revisados", solo para servicios de tipo "revision":
-- mismo catálogo que accesorios_instalados, pero es un checklist aparte (no
-- pide fotos) para dejar registro de qué accesorios YA tenía la unidad al
-- llegar, sin mezclarlo con los accesorios que el técnico instala hoy.
create table accesorios_revisados (
  id                uuid primary key default gen_random_uuid(),
  servicio_id       uuid not null references servicios(id) on delete cascade,
  accesorio_key     text not null,
  etiqueta          text not null default '',
  checked           boolean not null default false,
  es_personalizado  boolean not null default false,
  updated_at        timestamptz not null default now(),
  unique (servicio_id, accesorio_key)
);

alter table accesorios_revisados enable row level security;

create policy accesorios_revisados_select on accesorios_revisados
  for select to authenticated
  using (is_admin() or owns_servicio(servicio_id));

create policy accesorios_revisados_insert on accesorios_revisados
  for insert to authenticated
  with check (is_admin() or (owns_servicio(servicio_id) and servicio_no_terminal(servicio_id)));

create policy accesorios_revisados_update on accesorios_revisados
  for update to authenticated
  using (is_admin() or (owns_servicio(servicio_id) and servicio_no_terminal(servicio_id)))
  with check (is_admin() or (owns_servicio(servicio_id) and servicio_no_terminal(servicio_id)));

create trigger accesorios_revisados_set_updated_at before update on accesorios_revisados
  for each row execute function set_updated_at();
