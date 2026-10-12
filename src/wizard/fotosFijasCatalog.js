// Slots de foto fijos del paso 8 (siempre se muestran, sin importar accesorios).
// No incluye "accesorios instalados" genérico: eso lo cubren los slots dinámicos
// por accesorio (ver accesoriosCatalog.js) para no pedir la misma foto 2 veces.
export const FOTOS_FIJAS_CATALOG = [
  { key: 'unidad_completa', label: 'Fotografía de la unidad completa' },
  { key: 'placas', label: 'Fotografía de placas' },
  { key: 'vin_serie', label: 'Fotografía de VIN / Número de serie' },
  { key: 'imei_gps', label: 'Fotografía del IMEI del GPS' },
  { key: 'ubicacion_gps', label: 'Fotografía de la ubicación del GPS' },
  { key: 'conexiones', label: 'Fotografía de las conexiones realizadas' },
  { key: 'tablero_armado', label: 'Fotografía de tablero armado' },
  { key: 'entrega_final', label: 'Fotografía de la entrega final' },
  { key: 'antena_gps', label: 'Fotografía de la antena GPS' },
  // Solo aplica a paquetes "Protocolo" (con o sin RFID) -- ver fotosFijasParaServicio.
  { key: 'buzzer', label: 'Fotografía del buzzer', soloProtocolo: true },
]

const PAQUETES_PROTOCOLO = ['protocolo_sin_rfid', 'protocolo_con_rfid']

// Para "solar" el resto del checklist (recepción, instalación, pruebas,
// entrega, otros datos, accesorios) se queda igual que cualquier otro tipo
// de servicio -- solo las fotos obligatorias del paso de evidencias cambian
// a estas 3, en vez del catálogo normal (placas, VIN, antenas, etc.).
export const FOTOS_SOLAR_CATALOG = [
  { key: 'imei_gps', label: 'Fotografía del IMEI del GPS' },
  { key: 'caja_solar', label: 'Fotografía de la caja' },
  { key: 'equipo_asegurado', label: 'Fotografía del equipo asegurado' },
]

/** Fotos fijas que aplican para un servicio dado -- todas las de siempre, más
 * "buzzer" cuando el paquete contratado es alguna variante de "Protocolo",
 * o el catálogo reducido de "solar" cuando el tipo de servicio es ese. */
export function fotosFijasParaServicio(servicio) {
  if (servicio?.tipo_servicio === 'solar') return FOTOS_SOLAR_CATALOG
  const esProtocolo = PAQUETES_PROTOCOLO.includes(servicio?.tipo_paquete)
  return FOTOS_FIJAS_CATALOG.filter((f) => !f.soloProtocolo || esProtocolo)
}
