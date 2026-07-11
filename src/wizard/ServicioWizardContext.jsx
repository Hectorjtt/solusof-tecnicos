import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getServicioCompleto } from '../lib/servicios'
import { eliminarArchivo } from '../lib/storage'
import { ACCESORIOS_CATALOG } from './accesoriosCatalog'
import { FOTOS_FIJAS_CATALOG } from './fotosFijasCatalog'

const CHILD_TABLES = [
  'recepcion_verificacion',
  'instalacion_gps',
  'pruebas_funcionamiento',
  'entrega_servicio',
  'otros_datos',
]

const WizardContext = createContext(null)

function mergeRow(prev, payload) {
  if (payload.eventType === 'DELETE') return prev.filter((r) => r.id !== payload.old.id)
  const idx = prev.findIndex((r) => r.id === payload.new.id)
  if (idx === -1) return [...prev, payload.new]
  const next = [...prev]
  next[idx] = payload.new
  return next
}

export function ServicioWizardProvider({ servicioId, children }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [servicio, setServicio] = useState(null)
  const [childData, setChildData] = useState({})
  const [accesorios, setAccesorios] = useState([])
  const [fotos, setFotos] = useState([])
  const [saveStatus, setSaveStatus] = useState({})
  const timers = useRef({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const full = await getServicioCompleto(servicioId)
      setServicio(full)
      const nextChild = {}
      for (const t of CHILD_TABLES) nextChild[t] = full[t] ?? {}
      setChildData(nextChild)

      // Semilla idempotente: garantiza que existan las filas de catálogo sin pisar las ya guardadas.
      await supabase.from('accesorios_instalados').upsert(
        ACCESORIOS_CATALOG.map((a) => ({
          servicio_id: servicioId,
          accesorio_key: a.key,
          etiqueta: a.esPersonalizado ? '' : a.label,
          es_personalizado: !!a.esPersonalizado,
        })),
        { onConflict: 'servicio_id,accesorio_key', ignoreDuplicates: true },
      )
      await supabase.from('fotos').upsert(
        FOTOS_FIJAS_CATALOG.map((f) => ({
          servicio_id: servicioId,
          slot_key: f.key,
          slot_tipo: 'fija',
          etiqueta: f.label,
        })),
        { onConflict: 'servicio_id,slot_key', ignoreDuplicates: true },
      )

      const [accRes, fotoRes] = await Promise.all([
        supabase
          .from('accesorios_instalados')
          .select('*')
          .eq('servicio_id', servicioId)
          .order('updated_at'),
        supabase.from('fotos').select('*').eq('servicio_id', servicioId),
      ])
      setAccesorios(accRes.data ?? [])
      setFotos(fotoRes.data ?? [])
    } catch (e) {
      setError(e.message ?? 'No se pudo cargar el servicio.')
    } finally {
      setLoading(false)
    }
  }, [servicioId])

  useEffect(() => {
    load()
  }, [load])

  // Realtime scoped a este servicio: refleja cambios hechos desde otra pestaña/dispositivo.
  useEffect(() => {
    const channel = supabase
      .channel(`servicio-wizard-${servicioId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'accesorios_instalados', filter: `servicio_id=eq.${servicioId}` },
        (payload) => setAccesorios((prev) => mergeRow(prev, payload)),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fotos', filter: `servicio_id=eq.${servicioId}` },
        (payload) => setFotos((prev) => mergeRow(prev, payload)),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'servicios', filter: `id=eq.${servicioId}` },
        (payload) => setServicio((prev) => (prev ? { ...prev, ...payload.new } : prev)),
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [servicioId])

  // Sincronía paso 3 -> paso 8: reconcilia los slots de foto por accesorio cada
  // vez que cambia la lista de accesorios (marcado/desmarcado, o etiqueta editada).
  useEffect(() => {
    if (loading) return
    const wanted = accesorios.filter((a) => a.checked && a.etiqueta && a.etiqueta.trim() !== '')
    const wantedKeys = new Set(wanted.map((a) => `accesorio:${a.accesorio_key}`))
    const existentes = fotos.filter((f) => f.slot_tipo === 'accesorio')

    ;(async () => {
      for (const a of wanted) {
        const slotKey = `accesorio:${a.accesorio_key}`
        const existente = existentes.find((f) => f.slot_key === slotKey)
        if (!existente) {
          const { data } = await supabase
            .from('fotos')
            .insert({ servicio_id: servicioId, slot_key: slotKey, slot_tipo: 'accesorio', etiqueta: a.etiqueta })
            .select()
            .single()
          if (data) setFotos((prev) => (prev.some((f) => f.id === data.id) ? prev : [...prev, data]))
        } else if (existente.etiqueta !== a.etiqueta) {
          await supabase.from('fotos').update({ etiqueta: a.etiqueta }).eq('id', existente.id)
          setFotos((prev) => prev.map((f) => (f.id === existente.id ? { ...f, etiqueta: a.etiqueta } : f)))
        }
      }
      for (const f of existentes) {
        if (!wantedKeys.has(f.slot_key)) {
          if (f.storage_path) await eliminarArchivo(f.storage_path)
          await supabase.from('fotos').delete().eq('id', f.id)
          setFotos((prev) => prev.filter((x) => x.id !== f.id))
        }
      }
    })()
    // Se reacciona solo a cambios de "accesorios" a propósito: es el disparador
    // de la sincronía; "fotos" se lee del closure más reciente en cada corrida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accesorios, loading, servicioId])

  function updateField(table, key, value, { immediate = false } = {}) {
    setChildData((d) => ({ ...d, [table]: { ...d[table], [key]: value } }))
    const timerKey = `${table}:${key}`
    setSaveStatus((s) => ({ ...s, [timerKey]: 'saving' }))
    clearTimeout(timers.current[timerKey])
    timers.current[timerKey] = setTimeout(
      async () => {
        const { error: err } = await supabase
          .from(table)
          .upsert({ servicio_id: servicioId, [key]: value }, { onConflict: 'servicio_id' })
        setSaveStatus((s) => ({ ...s, [timerKey]: err ? 'error' : 'saved' }))
      },
      immediate ? 0 : 550,
    )
  }

  async function toggleAccesorio(accesorioKey, checked) {
    setAccesorios((prev) =>
      prev.map((a) => (a.accesorio_key === accesorioKey ? { ...a, checked } : a)),
    )
    await supabase
      .from('accesorios_instalados')
      .update({ checked })
      .eq('servicio_id', servicioId)
      .eq('accesorio_key', accesorioKey)
  }

  function setAccesorioEtiqueta(accesorioKey, etiqueta) {
    setAccesorios((prev) =>
      prev.map((a) => (a.accesorio_key === accesorioKey ? { ...a, etiqueta } : a)),
    )
    const timerKey = `acc:${accesorioKey}`
    clearTimeout(timers.current[timerKey])
    timers.current[timerKey] = setTimeout(async () => {
      await supabase
        .from('accesorios_instalados')
        .update({ etiqueta })
        .eq('servicio_id', servicioId)
        .eq('accesorio_key', accesorioKey)
    }, 550)
  }

  function updateFotoLocal(fotoRow) {
    setFotos((prev) => prev.map((f) => (f.id === fotoRow.id ? fotoRow : f)))
  }

  function patchServicioLocal(patch) {
    setServicio((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  const value = {
    loading,
    error,
    servicio,
    childData,
    accesorios,
    fotos,
    saveStatus,
    updateField,
    toggleAccesorio,
    setAccesorioEtiqueta,
    updateFotoLocal,
    patchServicioLocal,
    reload: load,
  }

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>
}

export function useServicioWizard() {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error('useServicioWizard debe usarse dentro de <ServicioWizardProvider>')
  return ctx
}
