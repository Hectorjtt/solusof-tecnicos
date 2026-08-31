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

// Aplica a "revision" Y "reinstalacion" (en OS/Servicios.html ambos
// conceptos comparten el mismo "Causa Rev").
export const CAUSAS_REV = [
  'Revisión General',
  'Falla accesorio',
  'Bloqueo movimiento',
  'Re activación',
]

// Solo aplica cuando el servicio es de tipo "desinstalacion" -- mismas
// opciones que ya usa OS/Servicios.html para "Causa Des".
export const CAUSAS_DES = [
  'Cambio equipo unidad',
  'Venta unidad',
  'Siniestro',
  'Baja Servicio',
  'Adeudo',
]

export const TIPO_PAQUETE_LABEL = {
  basico_termometro: 'BASICO CON TERMOMETRO',
  teltonika_2_sensores_combustible: 'TELTONIKA CON 2 SENSORES COMBUSTIBLE',
  canbus_ble_info_computadora: 'CANBUS BLE INFO COMPUTADORA UNDIAD',
  basico: 'BASICO',
  teltonika_basico: 'TELTONIKA BASICO',
  basico_gv310_audio_combustible: 'BASICO GV310 CON AIDIO Y SENSOR DE COMBUSTIBLE',
  dvr_truper: 'DVR TRUPER',
  protocolo_sin_rfid: 'PROTOCOLO SIN RFID',
  dash_cam: 'DASH CAM',
  basico_audio_gv310: 'BASICO CON AUDIO GV310',
  protocolo_con_rfid: 'PROTOCOLO CON RFID',
}

export const TIPOS_PAQUETE = Object.entries(TIPO_PAQUETE_LABEL).map(([value, label]) => ({ value, label }))

export const MODELOS_GPS = [
  'EPCOM XMR404HD',
  'JC261',
  'JC450',
  'JM-LL303',
  'JT808',
  'Meitrack T333',
  'Queclink CV100LG',
  'Queclink CV200XEU/XNA',
  'Queclink GL320MG',
  'Queclink GL521MG',
  'Queclink GL601CEU',
  'Queclink GV310LAU',
  'Queclink GV57MG',
  'Queclink GV620MG',
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
