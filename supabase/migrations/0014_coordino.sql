-- "Coordinó" -- mismo campo que ya existe en OS (Servicios.html/Agendar.html),
-- ahora también capturable desde Técnicos y sincronizado hacia allá.
alter table servicios add column coordino text;
