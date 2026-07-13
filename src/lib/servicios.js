import { supabase } from './supabaseClient'

const SERVICIO_COMPLETO_SELECT = `
  *,
  tecnico:tecnico_id ( id, nombre, telefono ),
  creador:creado_por ( id, nombre ),
  recepcion_verificacion ( * ),
  instalacion_gps ( * ),
  pruebas_funcionamiento ( * ),
  entrega_servicio ( * ),
  otros_datos ( * ),
  accesorios_instalados ( * ),
  fotos ( * )
`

// Tablas hijas 1:1 con servicios (servicio_id es PK y FK a la vez). PostgREST
// normalmente las embebe como objeto único, pero según el estado de su caché
// de esquema a veces las devuelve como arreglo de un solo elemento -- sin
// normalizar esto, cualquier consumidor que lea servicio[tabla].campo ve
// "undefined" para todo (checklist completo se ve vacío) aunque sí esté
// guardado en la base.
const FLAT_CHILD_TABLES = [
  'recepcion_verificacion',
  'instalacion_gps',
  'pruebas_funcionamiento',
  'entrega_servicio',
  'otros_datos',
]

function normalizarEmbeds1a1(servicio) {
  for (const t of FLAT_CHILD_TABLES) {
    if (Array.isArray(servicio[t])) servicio[t] = servicio[t][0] ?? null
  }
  return servicio
}

export async function listTecnicos() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nombre, telefono, activo')
    .eq('role', 'tecnico')
    .eq('activo', true)
    .order('nombre')
  if (error) throw error
  return data
}

export async function crearServicio(payload) {
  const { data, error } = await supabase.from('servicios').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function listServicios({ status } = {}) {
  let query = supabase
    .from('servicios')
    .select('*, tecnico:tecnico_id ( id, nombre )')
    .order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function listMisServicios(tecnicoId) {
  const { data, error } = await supabase
    .from('servicios')
    .select('*')
    .eq('tecnico_id', tecnicoId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getServicioCompleto(id) {
  const { data, error } = await supabase
    .from('servicios')
    .select(SERVICIO_COMPLETO_SELECT)
    .eq('id', id)
    .single()
  if (error) throw error
  return normalizarEmbeds1a1(data)
}

export async function iniciarServicio(id) {
  const { data, error } = await supabase
    .from('servicios')
    .update({ status: 'en_progreso', iniciado_en: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function finalizarServicio(id, { tecnico, cliente }) {
  const ahora = new Date().toISOString()
  const { data, error } = await supabase
    .from('servicios')
    .update({
      status: 'finalizado',
      finalizado_en: ahora,
      firma_tecnico_storage_path: tecnico.storagePath,
      firma_tecnico_nombre: tecnico.nombre,
      firma_tecnico_en: ahora,
      firma_cliente_storage_path: cliente.storagePath,
      firma_cliente_nombre: cliente.nombre,
      firma_cliente_en: ahora,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function aprobarServicio(id, revisorId) {
  const { data, error } = await supabase
    .from('servicios')
    .update({
      status: 'aprobado',
      revisado_por: revisorId,
      revisado_en: new Date().toISOString(),
      motivo_rechazo: null,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function guardarReportePdfPath(id, path) {
  const { data, error } = await supabase
    .from('servicios')
    .update({ reporte_pdf_storage_path: path })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function rechazarServicio(id, revisorId, motivo) {
  const { data, error } = await supabase
    .from('servicios')
    .update({
      status: 'rechazado',
      revisado_por: revisorId,
      revisado_en: new Date().toISOString(),
      motivo_rechazo: motivo,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
