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
]
