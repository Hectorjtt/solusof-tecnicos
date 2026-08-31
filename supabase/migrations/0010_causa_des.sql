-- "Causa Des": solo aplica cuando el servicio es de tipo "desinstalacion"
-- (mismo campo que ya existe en OS/Servicios.html para ese caso).
alter table servicios
  add column causa_des text;
