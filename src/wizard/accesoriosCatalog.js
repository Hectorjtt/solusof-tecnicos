// Fuente única de verdad para el paso 3 (Accesorios instalados). El paso 8
// (fotos) NO duplica esta lista: lee directo de la tabla accesorios_instalados
// filtrando checked=true, y usa esta misma etiqueta para mostrar el slot.
export const ACCESORIOS_CATALOG = [
  { key: 'boton_panico', label: 'Botón de pánico' },
  { key: 'relevador_bloqueo', label: 'Relevador / Bloqueo' },
  { key: 'relevador_marcha', label: 'Relevador / Marcha' },
  { key: 'relevador_buzzer', label: 'Relevador / Buzzer' },
  {
    key: 'sensor_puerta',
    label: 'Sensor de puerta',
    // Este accesorio pide 2 fotos (no 1): una por cada sensor instalado.
    // "Sensor de puerta trasera" es aparte (más abajo): es su propio
    // accesorio con su propio check, no una subfoto de este.
    subfotos: [
      { key: 'piloto', label: 'Sensor de puerta piloto' },
      { key: 'copiloto', label: 'Sensor de puerta copiloto' },
    ],
  },
  { key: 'sensor_puerta_trasera', label: 'Sensor de puerta trasera' },
  { key: 'sensor_combustible_tq1', label: 'Sensor de combustible TQ1' },
  { key: 'sensor_combustible_tq2', label: 'Sensor de combustible TQ2' },
  { key: 'sensor_temperatura', label: 'Sensor de temperatura' },
  { key: 'microfono', label: 'Micrófono' },
  { key: 'bocina', label: 'Bocina' },
  { key: 'camara', label: 'Cámara' },
  { key: 'buzzer_alarma', label: 'Buzzer / Alarma' },
  { key: 'luces_auxiliares', label: 'Luces auxiliares' },
  { key: 'sensor_5ta_rueda', label: 'Sensor de 5ta rueda' },
  { key: 'sensor_uso_rudo', label: 'Sensor de uso rudo' },
  { key: 'otro_1', label: '', esPersonalizado: true },
  { key: 'otro_2', label: '', esPersonalizado: true },
]
