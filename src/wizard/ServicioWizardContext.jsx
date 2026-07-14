import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react'
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

export function ServicioWizardProvider({ servicioId, children, poll = false }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [servicio, setServicio] = useState(null)
  const [childData, setChildData] = useState({})
  const [accesorios, setAccesorios] = useState([])
  const [fotos, setFotos] = useState([])
  const timers = useRef({})
  const fotosRef = useRef(fotos)
  fotosRef.current = fotos
  const syncRunId = useRef(0)

  // Trae servicio + checklist + accesorios + fotos, sin la semilla de catálogo
  // (esa solo hace falta una vez). La usa tanto la carga inicial como el
  // respaldo por polling de abajo.
  const fetchAll = useCallback(async () => {
    const full = await getServicioCompleto(servicioId)
    setServicio(full)
    const nextChild = {}
    for (const t of CHILD_TABLES) nextChild[t] = full[t] ?? {}
    setChildData(nextChild)
    const [accRes, fotoRes] = await Promise.all([
      supabase.from('accesorios_instalados').select('*').eq('servicio_id', servicioId).order('updated_at'),
      supabase.from('fotos').select('*').eq('servicio_id', servicioId),
    ])
    setAccesorios(accRes.data ?? [])
    setFotos(fotoRes.data ?? [])
    return full
  }, [servicioId])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
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
      return await fetchAll()
    } catch (e) {
      setError(e.message ?? 'No se pudo cargar el servicio.')
      return null
    } finally {
      setLoading(false)
    }
  }, [servicioId, fetchAll])

  useEffect(() => {
    load()
  }, [load])

  // Respaldo por si el realtime se desconecta sin avisar (pasa en websockets
  // de larga duración, sobre todo en celular): mientras alguien tiene la
  // pantalla abierta viendo un servicio ajeno en vivo (ej. el admin viendo al
  // técnico trabajar), se refresca solo cada rato aunque el push falle.
  useEffect(() => {
    if (!poll) return
    const intervalId = setInterval(() => {
      fetchAll().catch(() => {})
    }, 12000)
    return () => clearInterval(intervalId)
  }, [poll, fetchAll])

  // Realtime scoped a este servicio: refleja cambios hechos desde otra pestaña/dispositivo
  // (ej. admin viendo en vivo mientras el técnico llena el checklist).
  useEffect(() => {
    let channel = supabase
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
    for (const t of CHILD_TABLES) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: t, filter: `servicio_id=eq.${servicioId}` },
        (payload) => setChildData((d) => ({ ...d, [t]: payload.new ?? {} })),
      )
    }
    channel.subscribe()
    return () => supabase.removeChannel(channel)
  }, [servicioId])

  // Sincronía paso 3 -> paso 8: reconcilia los slots de foto por accesorio cada
  // vez que cambia la lista de accesorios (marcado/desmarcado, o etiqueta editada).
  // Solo mientras el servicio sigue editable -- de lo contrario, con el admin
  // usando este mismo contexto para solo *ver* un servicio ya aprobado/rechazado
  // (is_admin() se salta el RLS), esto podría borrar fotos ya cerradas por una
  // simple inconsistencia histórica sin que nadie haya tocado nada.
  //
  // Debounced + con "run id": si el técnico marca varios accesorios seguidos,
  // cada click (más su eco por realtime) antes disparaba su propia corrida
  // async en paralelo -- una corrida con un snapshot de "fotos" desactualizado
  // podía no ver la fila que OTRA corrida ya había insertado, perdiendo fotos.
  // Ahora se espera a que se asienten los cambios y solo corre la última.
  useEffect(() => {
    if (loading) return
    if (servicio && ['aprobado', 'rechazado'].includes(servicio.status)) return
    clearTimeout(timers.current.__syncFotos)
    const timeoutId = setTimeout(() => {
      const runId = ++syncRunId.current
      const wanted = accesorios.filter((a) => a.checked && a.etiqueta && a.etiqueta.trim() !== '')
      // La mayoría de los accesorios piden 1 foto (slot_key = "accesorio:<key>"),
      // pero algunos (ej. sensor de puerta) piden varias -- ver "subfotos" en
      // accesoriosCatalog.js. Cada uno genera su propio slot fijo con etiqueta fija.
      const wantedSlots = wanted.flatMap((a) => {
        const catalogo = ACCESORIOS_CATALOG.find((c) => c.key === a.accesorio_key)
        if (catalogo?.subfotos) {
          return catalogo.subfotos.map((sf) => ({
            slotKey: `accesorio:${a.accesorio_key}:${sf.key}`,
            etiqueta: sf.label,
          }))
        }
        return [{ slotKey: `accesorio:${a.accesorio_key}`, etiqueta: a.etiqueta }]
      })
      const wantedKeys = new Set(wantedSlots.map((s) => s.slotKey))

      ;(async () => {
        for (const { slotKey, etiqueta } of wantedSlots) {
          if (runId !== syncRunId.current) return // una corrida más nueva ya está en curso
          const existente = fotosRef.current.find((f) => f.slot_key === slotKey)
          if (!existente) {
            const { data, error } = await supabase
              .from('fotos')
              .insert({ servicio_id: servicioId, slot_key: slotKey, slot_tipo: 'accesorio', etiqueta })
              .select()
              .single()
            if (error && error.code !== '23505') console.error('[sync fotos] insert falló', error)
            if (data && runId === syncRunId.current) {
              setFotos((prev) => (prev.some((f) => f.id === data.id) ? prev : [...prev, data]))
            }
          } else if (existente.etiqueta !== etiqueta) {
            await supabase.from('fotos').update({ etiqueta }).eq('id', existente.id)
            if (runId === syncRunId.current) {
              setFotos((prev) => prev.map((f) => (f.id === existente.id ? { ...f, etiqueta } : f)))
            }
          }
        }
        for (const f of fotosRef.current.filter((f) => f.slot_tipo === 'accesorio')) {
          if (runId !== syncRunId.current) return
          if (!wantedKeys.has(f.slot_key)) {
            if (f.storage_path) await eliminarArchivo(f.storage_path)
            await supabase.from('fotos').delete().eq('id', f.id)
            if (runId === syncRunId.current) setFotos((prev) => prev.filter((x) => x.id !== f.id))
          }
        }
      })()
    }, 400)
    timers.current.__syncFotos = timeoutId
    return () => clearTimeout(timeoutId)
    // Se reacciona solo a cambios de "accesorios" a propósito: es el disparador
    // de la sincronía; "fotos" se lee de fotosRef (siempre al día) en cada corrida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accesorios, loading, servicioId])

  // Estable entre renders (useCallback) para que los campos memoizados (React.memo)
  // no se re-rendericen solo porque el padre volvió a renderizar -- esto es lo que
  // hacía sentir "pesado" el tap de checkboxes en el celular.
  const updateField = useCallback(
    (table, key, value, { immediate = false } = {}) => {
      setChildData((d) => ({ ...d, [table]: { ...d[table], [key]: value } }))
      const timerKey = `${table}:${key}`
      clearTimeout(timers.current[timerKey])
      timers.current[timerKey] = setTimeout(
        () => {
          // El builder de supabase-js es "thenable": la petición HTTP solo se
          // dispara cuando algo llama a .then()/await sobre él. Sin esto, la
          // llamada de abajo solo ARMABA la petición y nunca la mandaba --
          // el campo se veía guardado en pantalla pero nunca llegaba a la base.
          supabase
            .from(table)
            .upsert({ servicio_id: servicioId, [key]: value }, { onConflict: 'servicio_id' })
            .then(({ error }) => {
              if (error) console.error('[updateField] no se pudo guardar', table, key, error)
            })
        },
        immediate ? 0 : 550,
      )
    },
    [servicioId],
  )

  const toggleAccesorio = useCallback(
    (accesorioKey, checked) => {
      setAccesorios((prev) =>
        prev.map((a) => (a.accesorio_key === accesorioKey ? { ...a, checked } : a)),
      )
      supabase
        .from('accesorios_instalados')
        .update({ checked })
        .eq('servicio_id', servicioId)
        .eq('accesorio_key', accesorioKey)
        .then(({ error }) => {
          if (error) console.error('[toggleAccesorio] no se pudo guardar', accesorioKey, error)
        })
    },
    [servicioId],
  )

  const setAccesorioEtiqueta = useCallback(
    (accesorioKey, etiqueta) => {
      setAccesorios((prev) =>
        prev.map((a) => (a.accesorio_key === accesorioKey ? { ...a, etiqueta } : a)),
      )
      const timerKey = `acc:${accesorioKey}`
      clearTimeout(timers.current[timerKey])
      timers.current[timerKey] = setTimeout(() => {
        supabase
          .from('accesorios_instalados')
          .update({ etiqueta })
          .eq('servicio_id', servicioId)
          .eq('accesorio_key', accesorioKey)
          .then(({ error }) => {
            if (error) console.error('[setAccesorioEtiqueta] no se pudo guardar', accesorioKey, error)
          })
      }, 550)
    },
    [servicioId],
  )

  const updateFotoLocal = useCallback((fotoRow) => {
    setFotos((prev) => prev.map((f) => (f.id === fotoRow.id ? fotoRow : f)))
  }, [])

  const patchServicioLocal = useCallback((patch) => {
    setServicio((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const value = useMemo(
    () => ({
      loading,
      error,
      servicio,
      childData,
      accesorios,
      fotos,
      updateField,
      toggleAccesorio,
      setAccesorioEtiqueta,
      updateFotoLocal,
      patchServicioLocal,
      reload: load,
    }),
    [loading, error, servicio, childData, accesorios, fotos, updateField, toggleAccesorio, setAccesorioEtiqueta, updateFotoLocal, patchServicioLocal, load],
  )

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>
}

export function useServicioWizard() {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error('useServicioWizard debe usarse dentro de <ServicioWizardProvider>')
  return ctx
}
