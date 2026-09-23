-- Un cliente puede tener varios correos a los que mandarle el reporte
-- (ej. contacto administrativo + contacto operativo). Reemplaza el campo de
-- un solo correo por una lista.
alter table servicios add column cliente_correos text[];

update servicios
set cliente_correos = array[cliente_correo]
where cliente_correo is not null and trim(cliente_correo) <> '';

alter table servicios drop column cliente_correo;
