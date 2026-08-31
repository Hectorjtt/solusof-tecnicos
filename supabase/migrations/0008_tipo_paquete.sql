-- "Tipo" de paquete/kit de instalación (Básico, Básico con Audio, PT,
-- Sensores Combustible, MDVR Truper, MDVR Solusof, Dashcam, Otro).
alter table servicios
  add column tipo_paquete text,
  add column tipo_paquete_otro text;
