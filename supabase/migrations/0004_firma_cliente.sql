-- Firma del cliente (además de la firma del técnico), capturada al finalizar el servicio.
alter table servicios
  add column firma_cliente_storage_path text,
  add column firma_cliente_nombre text,
  add column firma_cliente_en timestamptz;
