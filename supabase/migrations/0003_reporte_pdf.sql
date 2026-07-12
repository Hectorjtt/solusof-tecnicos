-- Tipo de servicio (para el título del reporte en PDF) y ruta del PDF generado al aprobar.
alter table servicios
  add column tipo_servicio text check (tipo_servicio in ('instalacion', 'revision', 'desinstalacion', 'reinstalacion')),
  add column reporte_pdf_storage_path text;
