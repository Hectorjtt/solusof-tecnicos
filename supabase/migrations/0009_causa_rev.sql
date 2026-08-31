-- "Causa Rev": solo aplica cuando el servicio es de tipo "revision" (mismo
-- campo que ya existe en OS/Servicios.html para ese caso).
alter table servicios
  add column causa_rev text;
