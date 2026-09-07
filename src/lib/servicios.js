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
  accesorios_revisados ( * ),
  accesorios_desinstalados ( * ),
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

// Avisa a SolusofOscuro (OS, repo Firebase aparte) que se creó este servicio,
// para que aparezca ahí como pendiente por aprobar. No debe tronar el flujo
// de creación si falla (red, OS caído, etc.) -- el servicio en Técnicos ya
// quedó bien guardado sin importar esto.
export async function sincronizarServicioConOS(servicioId) {
  try {
    const { error } = await supabase.functions.invoke('sync-servicio-a-os', {
      body: { servicioId },
    })
    if (error) throw error
  } catch (err) {
    console.error('No se pudo sincronizar el servicio con OS:', err)
  }
}

// Avisa a OS que se aprobó el servicio, para llenar allá "Usuario Elaboró
// Reporte" y "SOP Atendió" con el nombre de quien aprobó. Igual que arriba,
// no debe tronar el flujo de aprobación si falla.
export async function sincronizarAprobacionConOS(servicioId) {
  try {
    const { error } = await supabase.functions.invoke('sync-aprobacion-a-os', {
      body: { servicioId },
    })
    if (error) throw error
  } catch (err) {
    console.error('No se pudo sincronizar la aprobación con OS:', err)
  }
}

// Avisa a OS que se "eliminó" (ocultó) el servicio, para que borre su copia
// (pendiente o ya aprobado, lo que exista). Igual que arriba, no debe tronar
// el flujo si falla.
export async function sincronizarEliminacionConOS(servicioId) {
  try {
    const { error } = await supabase.functions.invoke('sync-eliminacion-a-os', {
      body: { servicioId },
    })
    if (error) throw error
  } catch (err) {
    console.error('No se pudo sincronizar la eliminación con OS:', err)
  }
}

export async function listServicios({ status, oculto = false } = {}) {
  let query = supabase
    .from('servicios')
    .select('*, tecnico:tecnico_id ( id, nombre )')
    .order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)
  if (oculto !== null) query = query.eq('oculto', oculto)
  const { data, error } = await query
  if (error) throw error
  return data
}

// "Eliminar" un servicio == ocultarlo (nunca se borra el registro de verdad,
// así se puede recuperar). Restringido en la UI a un puñado de personas, ver
// PUEDEN_ELIMINAR en AdminDashboard.jsx. También avisa a OS para que borre
// su copia (fire-and-forget, no bloquea el flujo si OS falla).
export async function ocultarServicio(id) {
  const { error } = await supabase.from('servicios').update({ oculto: true }).eq('id', id)
  if (error) throw error
  sincronizarEliminacionConOS(id)
}

// Al restaurar, se vuelve a mandar a OS como si se acabara de sincronizar
// (mismo endpoint que al crear/editar) -- reaparece ahí con los datos tal
// como estén ahora mismo en Técnicos.
export async function restaurarServicio(id) {
  const { error } = await supabase.from('servicios').update({ oculto: false }).eq('id', id)
  if (error) throw error
  sincronizarServicioConOS(id)
}

export async function listMisServicios(tecnicoId) {
  const { data, error } = await supabase
    .from('servicios')
    .select('*')
    .eq('tecnico_id', tecnicoId)
    .eq('oculto', false)
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

export async function aprobarServicio(id, revisorId, aprobadoPorNombre) {
  const { data, error } = await supabase
    .from('servicios')
    .update({
      status: 'aprobado',
      revisado_por: revisorId,
      revisado_en: new Date().toISOString(),
      motivo_rechazo: null,
      aprobado_por_nombre: aprobadoPorNombre,
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
