import { useCallback, useEffect, useState } from 'react'
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

  const activos = servicios.filter((s) => ACTIVOS.includes(s.status))
  const cerrados = servicios.filter((s) => CERRADOS.includes(s.status))

  return (
    <div className="app-shell">
      <Topbar title="Mis servicios" />
      <div className="container">
        {loading ? (
          <div className="center-screen">
            <div className="spinner" />
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.04em' }}>
              Activos
            </h2>
            {activos.length === 0 && <div className="empty-state">No tienes servicios pendientes.</div>}
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
