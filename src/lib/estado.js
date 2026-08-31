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

export const TIPO_PAQUETE_LABEL = {
  basico: 'Básico',
  basico_audio: 'Básico con Audio',
  pt: 'PT',
  sensores_combustible: 'Sensores Combustible',
  mdvr_truper: 'MDVR Truper',
  mdvr_solusof: 'MDVR Solusof',
  dashcam: 'Dashcam',
  otro: 'Otro',
}

export const TIPOS_PAQUETE = Object.entries(TIPO_PAQUETE_LABEL).map(([value, label]) => ({ value, label }))

export const MODELOS_GPS = [
  'Queclink GV310LAU',
  'Queclink CV100LG',
  'Meitrack T333',
  'JC450',
  'JC261',
  'EPCOM XMR404HD',
  'JM-LL303',
  'JT808',
  'Queclink CV200XEU/XNA',
  'Queclink GL320MG',
  'Queclink GL521MG',
  'Queclink GL601CEU',
  'Queclink GV620MG',
  'Queclink GV57MG',
  'Streamax AD PLUS 2.0',
  'Suntech ST330',
  'Suntech ST3300',
  'Suntech ST4300',
  'Suntech ST4305',
  'Teltonika FMC125',
  'Teltonika FMU130',
  'VL103',
  'VL110C',
]

export function formatFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}
