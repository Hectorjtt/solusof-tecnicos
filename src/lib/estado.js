export const STATUS_LABEL = {
  asignado: 'Asignado',
  en_progreso: 'En progreso',
  finalizado: 'Finalizado',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
}

export const STATUS_LIST = ['asignado', 'en_progreso', 'finalizado', 'aprobado', 'rechazado']

export const TIPO_SERVICIO_LABEL = {
  instalacion: 'Instalación',
  revision: 'Revisión',
  reinstalacion: 'Reinstalación',
  desinstalacion: 'Desinstalación',
}

export const TIPO_SERVICIO_TITULO = {
  instalacion: 'Reporte de instalación',
  revision: 'Reporte de revisión',
  reinstalacion: 'Reporte de reinstalación',
  desinstalacion: 'Reporte de desinstalación',
}

export function formatFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}
