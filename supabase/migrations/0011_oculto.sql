-- "Eliminar" un servicio en realidad solo lo oculta (soft delete): se puede
-- recuperar después en vez de perder el historial para siempre.
alter table servicios add column oculto boolean not null default false;
