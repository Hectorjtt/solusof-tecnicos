-- Solusof Técnicos — esquema inicial
-- Roles: 'admin' y 'tecnico'. Nada en el checklist es obligatorio -> todo nullable.

create extension if not exists pgcrypto;

-- =========================================================
-- profiles — 1:1 con auth.users, guarda rol y datos de contacto
-- =========================================================
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('admin', 'tecnico')),
  nombre      text not null,
  telefono    text,
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- =========================================================
-- servicios — la orden de trabajo (encabezado + datos cliente/vehículo)
-- =========================================================
create table servicios (
  id                    uuid primary key default gen_random_uuid(),
  numero_servicio       bigint generated always as identity,
  status                text not null default 'asignado'
                          check (status in ('asignado', 'en_progreso', 'finalizado', 'aprobado', 'rechazado')),

  -- Datos del cliente
  cliente_nombre        text not null,
  cliente_telefono      text,
  cliente_correo        text,
  cliente_direccion     text,

  -- Datos del vehículo / unidad
  unidad_razon_social   text,
  marca                 text,
  modelo                text,
  anio                  text,
  placas                text,
  color                 text,
  vin_serie             text,
  tipo_unidad           text check (tipo_unidad in ('particular', 'transporte', 'carga', 'maquinaria', 'otra')),
  tipo_unidad_otra      text,
  kilometraje           numeric,
  imei_gps              text,
  gps_serie             text,
  gps_tipo              text,

  -- Asignación
  tecnico_id            uuid references profiles(id),
  creado_por            uuid not null references profiles(id),

  -- Cierre / revisión admin
  motivo_rechazo        text,
  revisado_por          uuid references profiles(id),
  revisado_en           timestamptz,

  -- Firma del técnico (única firma digital del flujo)
  firma_tecnico_storage_path text,
  firma_tecnico_nombre       text,
  firma_tecnico_en           timestamptz,

  created_at            timestamptz not null default now(),
  iniciado_en            timestamptz,
  finalizado_en          timestamptz,
  updated_at             timestamptz not null default now()
);

create index servicios_tecnico_status_idx on servicios (tecnico_id, status);

-- =========================================================
-- Tablas hijas del checklist — una fila 1:1 por servicio, servicio_id es la PK.
-- Todo nullable: "nada es obligatorio". upsert(on_conflict=servicio_id) = autoguardado.
-- =========================================================

-- Paso 1: Recepción y verificación inicial
create table recepcion_verificacion (
  servicio_id           uuid primary key references servicios(id) on delete cascade,
  unidad_buen_estado    boolean,
  fotos_unidad_tomadas  boolean,
  foto_placas_tomada    boolean,
  foto_vin_tomada       boolean,
  foto_imei_tomada      boolean,
  voltaje_bateria       numeric,
  enciende_equipo       boolean,
  gps_tiene_senal       boolean,
  observaciones         text,
  updated_at            timestamptz not null default now()
);

-- Paso 2: Instalación del GPS
create table instalacion_gps (
  servicio_id                  uuid primary key references servicios(id) on delete cascade,
  lugar_oculto_seguro          boolean,
  fijacion_correcta            boolean,
  conexion_alimentacion        boolean,
  conexion_tierra              boolean,
  conexion_ignicion            boolean,
  fusible_proteccion           boolean,
  cableado_aislado             boolean,
  cableado_asegurado           boolean,
  antena_gps_instalada         boolean,
  antena_gsm_instalada         boolean,
  verificacion_funcionamiento  boolean,
  observaciones                text,
  updated_at                   timestamptz not null default now()
);

-- Paso 4: Pruebas de funcionamiento
create table pruebas_funcionamiento (
  servicio_id                 uuid primary key references servicios(id) on delete cascade,
  senal_gps                   boolean,
  senal_gsm_lte                boolean,
  reporte_ubicacion           boolean,
  encendido_apagado           boolean,
  entradas_salidas            boolean,
  funcionamiento_accesorios   boolean,
  consumo_corriente            boolean,
  prueba_plataforma_app       boolean,
  prueba_boton_panico         boolean,
  corte_motor                 boolean,
  observaciones                text,
  updated_at                   timestamptz not null default now()
);

-- Paso 5: Entrega del servicio
create table entrega_servicio (
  servicio_id                  uuid primary key references servicios(id) on delete cascade,
  cliente_informado            boolean,
  usuario_password_entregado   boolean,
  gps_en_linea_verificado      boolean,
  servicio_aceptado_cliente    boolean,
  updated_at                   timestamptz not null default now()
);

-- Paso 7: Material utilizado + Otros datos + Anomalías/Observaciones
create table otros_datos (
  servicio_id             uuid primary key references servicios(id) on delete cascade,
  -- Material utilizado
  fusibles                numeric,
  portafusibles           numeric,
  terminales              numeric,
  cinchos                 numeric,
  corrugado               numeric,
  cinta_automotriz        numeric,
  sim                     numeric,
  otros_material          text,
  -- Otros datos
  voltaje_bateria_inicial numeric,
  voltaje_bateria_final   numeric,
  tiempo_instalacion      text,
  condiciones_climaticas  text,
  -- Anomalías / Observaciones
  anomalias_observaciones text,
  updated_at              timestamptz not null default now()
);

-- =========================================================
-- Paso 3: Accesorios instalados — normalizada (1 fila por accesorio).
-- Es la fuente de verdad que el paso 8 lee para generar sus fotos dinámicas.
-- =========================================================
create table accesorios_instalados (
  id                uuid primary key default gen_random_uuid(),
  servicio_id       uuid not null references servicios(id) on delete cascade,
  accesorio_key     text not null,
  etiqueta          text not null default '',
  checked           boolean not null default false,
  es_personalizado  boolean not null default false,
  updated_at        timestamptz not null default now(),
  unique (servicio_id, accesorio_key)
);

-- =========================================================
-- Paso 8: Evidencias fotográficas — 1 fila por slot (fijo o de accesorio).
-- =========================================================
create table fotos (
  id             uuid primary key default gen_random_uuid(),
  servicio_id    uuid not null references servicios(id) on delete cascade,
  slot_key       text not null,
  slot_tipo      text not null check (slot_tipo in ('fija', 'accesorio')),
  etiqueta       text not null,
  storage_path   text,
  subido_en      timestamptz,
  subido_por     uuid references profiles(id),
  created_at     timestamptz not null default now(),
  unique (servicio_id, slot_key)
);

-- =========================================================
-- Trigger genérico para mantener updated_at al día en updates.
-- =========================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger servicios_set_updated_at before update on servicios
  for each row execute function set_updated_at();
create trigger recepcion_set_updated_at before update on recepcion_verificacion
  for each row execute function set_updated_at();
create trigger instalacion_set_updated_at before update on instalacion_gps
  for each row execute function set_updated_at();
create trigger pruebas_set_updated_at before update on pruebas_funcionamiento
  for each row execute function set_updated_at();
create trigger entrega_set_updated_at before update on entrega_servicio
  for each row execute function set_updated_at();
create trigger otros_datos_set_updated_at before update on otros_datos
  for each row execute function set_updated_at();
create trigger accesorios_set_updated_at before update on accesorios_instalados
  for each row execute function set_updated_at();

-- =========================================================
-- Storage bucket para fotos y firma
-- =========================================================
insert into storage.buckets (id, name, public)
values ('evidencias', 'evidencias', false)
on conflict (id) do nothing;
