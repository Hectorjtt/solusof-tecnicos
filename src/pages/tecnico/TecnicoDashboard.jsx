import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Topbar } from '../../components/Topbar'
import { ServicioCard } from '../../components/ServicioCard'
import { useAuth } from '../../auth/AuthContext'
import { useOnNuevoServicio } from '../../auth/RealtimeProvider'
import { listMisServicios } from '../../lib/servicios'

const ACTIVOS = ['asignado', 'en_progreso']
const CERRADOS = ['finalizado', 'aprobado', 'rechazado']

export default function TecnicoDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [servicios, setServicios] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  const cargar = useCallback(async () => {
    if (!user) return
    const data = await listMisServicios(user.id)
    setServicios(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    cargar()
  }, [cargar])

  // Nuevo servicio asignado en vivo -> refresca la lista (simple y confiable).
  useOnNuevoServicio(cargar)

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return servicios
    return servicios.filter((s) =>
      [s.cliente_nombre, s.unidad_razon_social, s.placas, s.marca, s.modelo]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q)),
    )
  }, [servicios, busqueda])

  const activos = filtrados.filter((s) => ACTIVOS.includes(s.status))
  const cerrados = filtrados.filter((s) => CERRADOS.includes(s.status))

  return (
    <div className="app-shell">
      <Topbar title="Mis servicios" />
      <div className="container">
        <input
          type="text"
          placeholder="Buscar por cliente, unidad/económico, placas…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ minHeight: 44, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, width: '100%', marginBottom: 14, boxSizing: 'border-box' }}
        />
        {loading ? (
          <div className="center-screen">
            <div className="spinner" />
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.04em' }}>
              Activos
            </h2>
            {activos.length === 0 && (
              <div className="empty-state">
                {busqueda.trim() ? 'Sin resultados para tu búsqueda.' : 'No tienes servicios pendientes.'}
              </div>
            )}
            <div className="stack">
              {activos.map((s) => (
                <ServicioCard
                  key={s.id}
                  servicio={s}
                  esNuevo={s.status === 'asignado'}
                  onClick={() => navigate(`/tecnico/servicios/${s.id}`)}
                />
              ))}
            </div>

            {cerrados.length > 0 && (
              <>
                <h2 style={{ marginTop: 24, fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.04em' }}>
                  Historial
                </h2>
                <div className="stack">
                  {cerrados.map((s) => (
                    <ServicioCard key={s.id} servicio={s} onClick={() => navigate(`/tecnico/servicios/${s.id}`)} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
