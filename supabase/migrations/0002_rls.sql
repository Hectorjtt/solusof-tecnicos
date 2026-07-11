-- Row Level Security — admin ve/edita todo, técnico solo lo suyo.

-- =========================================================
-- Helpers (security definer: pueden leer profiles/servicios sin
-- volver a disparar RLS recursivamente sobre sí mismos)
-- =========================================================
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

create or replace function owns_servicio(sid uuid)
returns boolean as $$
  select exists (
    select 1 from servicios where id = sid and tecnico_id = auth.uid()
  );
$$ language sql security definer stable;

create or replace function servicio_no_terminal(sid uuid)
returns boolean as $$
  select exists (
    select 1 from servicios
    where id = sid and status not in ('aprobado', 'rechazado')
  );
$$ language sql security definer stable;

-- =========================================================
-- profiles
-- =========================================================
alter table profiles enable row level security;

create policy profiles_select on profiles
  for select to authenticated using (true);

create policy profiles_update_admin on profiles
  for update to authenticated
  using (is_admin())
  with check (is_admin());

-- Sin policy de insert/delete para 'authenticated': la creación de cuentas
-- pasa exclusivamente por la Edge Function create-technician (service role).

-- =========================================================
-- servicios
-- =========================================================
alter table servicios enable row level security;

create policy servicios_select on servicios
  for select to authenticated
  using (is_admin() or tecnico_id = auth.uid());

create policy servicios_insert_admin on servicios
  for insert to authenticated
  with check (is_admin());

create policy servicios_update on servicios
  for update to authenticated
  using (
    is_admin()
    or (tecnico_id = auth.uid() and status not in ('aprobado', 'rechazado'))
  )
  with check (is_admin() or tecnico_id = auth.uid());

-- Sin policy de delete: nadie borra órdenes de servicio desde la app.

-- =========================================================
-- Tablas hijas del checklist (1:1 con servicios) + accesorios + fotos
-- Mismo patrón para las 7: lectura si es admin o dueño; escritura además
-- exige que el servicio padre no esté en estado terminal.
-- =========================================================
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'recepcion_verificacion',
    'instalacion_gps',
    'pruebas_funcionamiento',
    'entrega_servicio',
    'otros_datos',
    'accesorios_instalados',
    'fotos'
  ])
  loop
    execute format('alter table %I enable row level security;', t);

    execute format(
      'create policy %I_select on %I for select to authenticated using (is_admin() or owns_servicio(servicio_id));',
      t, t
    );

    execute format(
      'create policy %I_insert on %I for insert to authenticated with check (is_admin() or (owns_servicio(servicio_id) and servicio_no_terminal(servicio_id)));',
      t, t
    );

    execute format(
      'create policy %I_update on %I for update to authenticated using (is_admin() or (owns_servicio(servicio_id) and servicio_no_terminal(servicio_id))) with check (is_admin() or (owns_servicio(servicio_id) and servicio_no_terminal(servicio_id)));',
      t, t
    );
  end loop;
end $$;

-- fotos también necesita DELETE (se borra el slot al desmarcar un accesorio)
create policy fotos_delete on fotos
  for delete to authenticated
  using (is_admin() or (owns_servicio(servicio_id) and servicio_no_terminal(servicio_id)));

-- =========================================================
-- Storage — bucket "evidencias"
-- rutas: servicios/{servicio_id}/fotos/{slot_key}.jpg
--        servicios/{servicio_id}/firma.png
-- storage.foldername(name) = array de carpetas, ej. {'servicios','<uuid>','fotos'}
-- =========================================================
create policy evidencias_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'evidencias'
    and (
      is_admin()
      or owns_servicio(((storage.foldername(name))[2])::uuid)
    )
  );

create policy evidencias_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'evidencias'
    and (
      is_admin()
      or (
        owns_servicio(((storage.foldername(name))[2])::uuid)
        and servicio_no_terminal(((storage.foldername(name))[2])::uuid)
      )
    )
  );

create policy evidencias_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'evidencias'
    and (
      is_admin()
      or (
        owns_servicio(((storage.foldername(name))[2])::uuid)
        and servicio_no_terminal(((storage.foldername(name))[2])::uuid)
      )
    )
  );

create policy evidencias_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'evidencias'
    and (
      is_admin()
      or (
        owns_servicio(((storage.foldername(name))[2])::uuid)
        and servicio_no_terminal(((storage.foldername(name))[2])::uuid)
      )
    )
  );
