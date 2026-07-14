// Config de campos por paso del checklist. Cada entrada es { key, label, type }.
// type: 'checkbox' | 'number' | 'text' | 'textarea'. Nada es obligatorio.

export const RECEPCION_FIELDS = [
  { key: 'unidad_buen_estado', label: 'Unidad en buen estado general', type: 'checkbox' },
  {
    key: 'fotos_unidad_tomadas',
    label: 'Se toman fotografías de la unidad (frontal, lateral, trasera)',
    type: 'checkbox',
  },
  { key: 'foto_placas_tomada', label: 'Se toma fotografía de placas', type: 'checkbox' },
  {
    key: 'foto_vin_tomada',
    label: 'Se toma fotografía de VIN / Número de serie',
    type: 'checkbox',
  },
  { key: 'foto_imei_tomada', label: 'Se toma fotografía del IMEI del GPS', type: 'checkbox' },
  { key: 'voltaje_bateria', label: 'Voltaje de batería', type: 'number', suffix: 'V' },
  { key: 'enciende_equipo', label: 'Se verifica que encienda el equipo', type: 'checkbox' },
  { key: 'gps_tiene_senal', label: 'Se verifica que el GPS tenga señal', type: 'checkbox' },
  { key: 'observaciones', label: 'Observaciones', type: 'textarea' },
]

export const INSTALACION_FIELDS = [
  {
    key: 'lugar_oculto_seguro',
    label: 'Selección del lugar de instalación (oculto y seguro)',
    type: 'checkbox',
  },
  { key: 'fijacion_correcta', label: 'Fijación del equipo correctamente', type: 'checkbox' },
  { key: 'conexion_alimentacion', label: 'Conexión de alimentación (+)', type: 'checkbox' },
  { key: 'conexion_tierra', label: 'Conexión de tierra (-)', type: 'checkbox' },
  { key: 'conexion_ignicion', label: 'Conexión de ignición (ACC)', type: 'checkbox' },
  { key: 'fusible_proteccion', label: 'Instalación de fusible de protección', type: 'checkbox' },
  {
    key: 'cableado_aislado',
    label: 'Aislamiento y protección del cableado',
    type: 'checkbox',
  },
  {
    key: 'cableado_asegurado',
    label: 'Cableado asegurado y sin interferencia',
    type: 'checkbox',
  },
  {
    key: 'antena_gps_instalada',
    label: 'Antena GPS instalada correctamente',
    type: 'checkbox',
  },
  {
    key: 'antena_gsm_instalada',
    label: 'Antena GSM instalada correctamente',
    type: 'checkbox',
  },
  {
    key: 'verificacion_funcionamiento',
    label: 'Verificación de funcionamiento',
    type: 'checkbox',
  },
  { key: 'observaciones', label: 'Observaciones', type: 'textarea' },
]

export const PRUEBAS_FIELDS = [
  { key: 'senal_gps', label: 'Se verifica señal GPS', type: 'checkbox' },
  { key: 'senal_gsm_lte', label: 'Se verifica señal GSM / LTE', type: 'checkbox' },
  { key: 'reporte_ubicacion', label: 'Se verifica reporte de ubicación', type: 'checkbox' },
  { key: 'encendido_apagado', label: 'Se verifica encendido y apagado', type: 'checkbox' },
  { key: 'entradas_salidas', label: 'Se verifican entradas y salidas', type: 'checkbox' },
  {
    key: 'funcionamiento_accesorios',
    label: 'Se verifica funcionamiento de accesorios',
    type: 'checkbox',
  },
  { key: 'consumo_corriente', label: 'Se verifica consumo de corriente', type: 'checkbox' },
  { key: 'prueba_plataforma_app', label: 'Prueba de plataforma / App', type: 'checkbox' },
  { key: 'prueba_boton_panico', label: 'Prueba de botón de pánico', type: 'checkbox' },
  { key: 'corte_motor', label: 'Corte de motor (si aplica)', type: 'checkbox' },
  { key: 'observaciones', label: 'Observaciones', type: 'textarea' },
]

export const ENTREGA_FIELDS = [
  {
    key: 'cliente_informado',
    label: 'Cliente informado sobre el funcionamiento del GPS',
    type: 'checkbox',
  },
  {
    key: 'usuario_password_entregado',
    label: 'Se entregó usuario y contraseña (si aplica)',
    type: 'checkbox',
  },
  {
    key: 'gps_en_linea_verificado',
    label: 'Se verificó que el GPS esté en línea en la plataforma',
    type: 'checkbox',
  },
  {
    key: 'servicio_aceptado_cliente',
    label: 'Servicio concluido y aceptado por el cliente',
    type: 'checkbox',
  },
]

export const OTROS_DATOS_GROUPS = [
  {
    title: 'Material utilizado',
    fields: [
      { key: 'fusibles', label: 'Fusibles', type: 'checkbox' },
      { key: 'portafusibles', label: 'Portafusibles', type: 'checkbox' },
      { key: 'terminales', label: 'Terminales', type: 'checkbox' },
      { key: 'cinchos', label: 'Cinchos', type: 'checkbox' },
      { key: 'corrugado', label: 'Corrugado', type: 'checkbox' },
      { key: 'cinta_automotriz', label: 'Cinta automotriz', type: 'checkbox' },
      { key: 'sim', label: 'SIM', type: 'checkbox' },
      { key: 'otros_material', label: 'Otros', type: 'text' },
    ],
  },
  {
    title: 'Otros datos',
    fields: [
      { key: 'voltaje_bateria_inicial', label: 'Voltaje de batería inicial', type: 'number', suffix: 'V' },
      { key: 'voltaje_bateria_final', label: 'Voltaje de batería final', type: 'number', suffix: 'V' },
      { key: 'tiempo_instalacion', label: 'Tiempo de instalación', type: 'text' },
      { key: 'condiciones_climaticas', label: 'Condiciones climáticas', type: 'text' },
    ],
  },
  {
    title: 'Anomalías / Observaciones',
    fields: [{ key: 'anomalias_observaciones', label: '', type: 'textarea' }],
  },
]

export const CHECKLIST_STEPS = [
  { key: 'recepcion', table: 'recepcion_verificacion', label: 'Recepción y verificación inicial', fields: RECEPCION_FIELDS },
  { key: 'instalacion', table: 'instalacion_gps', label: 'Instalación del GPS', fields: INSTALACION_FIELDS },
  { key: 'accesorios', table: 'accesorios_instalados', label: 'Accesorios instalados' },
  { key: 'pruebas', table: 'pruebas_funcionamiento', label: 'Pruebas de funcionamiento', fields: PRUEBAS_FIELDS },
  { key: 'entrega', table: 'entrega_servicio', label: 'Entrega del servicio', fields: ENTREGA_FIELDS },
  { key: 'otros_datos', table: 'otros_datos', label: 'Otros datos', groups: OTROS_DATOS_GROUPS },
  { key: 'evidencias', label: 'Evidencias fotográficas' },
  { key: 'firma', label: 'Firma digital' },
]
