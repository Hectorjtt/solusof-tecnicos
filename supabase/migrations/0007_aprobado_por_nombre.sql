-- Nombre de la persona (de una lista fija, no una cuenta del sistema) que
-- aprueba un servicio finalizado. Separado de "revisado_por" (que sigue
-- guardando el id de la cuenta admin que hizo clic en Aprobar).
alter table servicios
  add column aprobado_por_nombre text;
