-- "Material utilizado" pasa de cantidad (numeric) a checkbox (boolean).
-- Cualquier cantidad > 0 ya registrada se conserva como marcado; null/0 queda sin marcar.
alter table otros_datos
  alter column fusibles type boolean using (fusibles is not null and fusibles > 0),
  alter column portafusibles type boolean using (portafusibles is not null and portafusibles > 0),
  alter column terminales type boolean using (terminales is not null and terminales > 0),
  alter column cinchos type boolean using (cinchos is not null and cinchos > 0),
  alter column corrugado type boolean using (corrugado is not null and corrugado > 0),
  alter column cinta_automotriz type boolean using (cinta_automotriz is not null and cinta_automotriz > 0),
  alter column sim type boolean using (sim is not null and sim > 0);
