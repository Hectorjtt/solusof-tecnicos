-- Día y hora en que se planea hacer el servicio (lo captura el admin al
-- crearlo) -- distinto de created_at (cuándo se dio de alta la orden) e
-- iniciado_en (cuándo el técnico realmente empezó a trabajar en ella).
alter table servicios add column fecha_programada timestamptz;
