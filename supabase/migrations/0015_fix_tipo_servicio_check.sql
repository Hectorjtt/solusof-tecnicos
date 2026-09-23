-- El check constraint de tipo_servicio (0003_reporte_pdf.sql) se quedó con
-- los 4 tipos originales y nunca se actualizó cuando se agregó
-- "desinstalacion_instalacion" -- por eso fallaba al crear ese tipo de
-- servicio ("violates check constraint servicios_tipo_servicio_check").
alter table servicios drop constraint servicios_tipo_servicio_check;
alter table servicios add constraint servicios_tipo_servicio_check
  check (tipo_servicio in ('instalacion', 'revision', 'desinstalacion', 'reinstalacion', 'desinstalacion_instalacion'));
