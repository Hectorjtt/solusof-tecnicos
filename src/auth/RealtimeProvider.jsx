import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'

const RealtimeContext = createContext({ lastServicioEvent: null })

const NOTIFY_RATIONALE_KEY = 'solusof_notif_prompted'

function tryNotifyOS(title, body) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  if (document.visibilityState === 'visible') return // ya se ve el toast en pantalla
  try {
    new Notification(title, { body, icon: '/img/logo-solusof.png' })
  } catch {
    // algunos navegadores móviles solo permiten notificar vía Service Worker;
    // se deja como best-effort, el toast en pantalla sigue siendo el mecanismo confiable
  }
}

/**
 * Mantiene una suscripción realtime a "servicios" asignados al técnico logueado
 * y muestra un aviso inmediato cuando llega uno nuevo. Montado una vez arriba del
 * árbol (no por pantalla) para que el aviso llegue sin importar dónde esté el técnico.
 */
export function RealtimeProvider({ children }) {
  const { user, role } = useAuth()
  const [lastServicioEvent, setLastServicioEvent] = useState(null)
  const [toast, setToast] = useState(null)
  const promptedRef = useRef(false)

  useEffect(() => {
    if (role !== 'tecnico' || !user) return

    // Pide permiso de notificación una sola vez, después de saber quién es (no en frío al cargar).
    if (
      !promptedRef.current &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'default' &&
      !localStorage.getItem(NOTIFY_RATIONALE_KEY)
    ) {
      promptedRef.current = true
      localStorage.setItem(NOTIFY_RATIONALE_KEY, '1')
      Notification.requestPermission().catch(() => {})
    }

    const channel = supabase
      .channel(`servicios-tecnico-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'servicios',
          filter: `tecnico_id=eq.${user.id}`,
        },
        (payload) => {
          const servicio = payload.new
          setLastServicioEvent({ type: 'nuevo', servicio, at: Date.now() })
          setToast(`Nuevo servicio: ${servicio.cliente_nombre ?? 'sin nombre'}`)
          tryNotifyOS('Nuevo servicio asignado', servicio.cliente_nombre ?? '')
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'servicios',
          filter: `tecnico_id=eq.${user.id}`,
        },
        (payload) => {
          setLastServicioEvent({ type: 'actualizado', servicio: payload.new, at: Date.now() })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [role, user])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4500)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <RealtimeContext.Provider value={{ lastServicioEvent }}>
      {children}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </RealtimeContext.Provider>
  )
}

export function useRealtimeServicios() {
  return useContext(RealtimeContext)
}

/** Utilidad para pantallas que quieren reaccionar sin usar el contexto directo. */
export function useOnNuevoServicio(callback) {
  const { lastServicioEvent } = useRealtimeServicios()
  const cbRef = useRef(callback)
  cbRef.current = callback

  const seenRef = useRef(0)
  useEffect(() => {
    if (!lastServicioEvent || lastServicioEvent.at === seenRef.current) return
    seenRef.current = lastServicioEvent.at
    cbRef.current(lastServicioEvent)
  }, [lastServicioEvent])
}
