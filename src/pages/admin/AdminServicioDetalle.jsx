import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Topbar } from '../../components/Topbar'
import { ServicioResumen } from '../../components/ServicioResumen'
import { useAuth } from '../../auth/AuthContext'
import { getServicioCompleto, aprobarServicio, rechazarServicio } from '../../lib/servicios'
import { STATUS_LABEL } from '../../lib/estado'

export default function AdminServicioDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [servicio, setServicio] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mostrarRechazo, setMostrarRechazo] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')

  async function cargar() {
    setLoading(true)
    try {
      const data = await getServicioCompleto(id)
      setServicio(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function aprobar() {
    setError('')
    setProcesando(true)
    try {
      await aprobarServicio(id, profile.id)
      await cargar()
    } catch (e) {
      setError(e.message ?? 'No se pudo aprobar.')
    } finally {
      setProcesando(false)
    }
  }

  async function rechazar() {
    if (!motivo.trim()) return
    setError('')
    setProcesando(true)
    try {
      await rechazarServicio(id, profile.id, motivo)
      setMostrarRechazo(false)
      setMotivo('')
      await cargar()
    } catch (e) {
      setError(e.message ?? 'No se pudo rechazar.')
    } finally {
      setProcesando(false)
    }
  }

  if (loading) {
    return (
      <div className="center-screen">
        <div className="spinner" />
      </div>
    )
  }

  if (!servicio) {
    return (
      <div className="center-screen">
        <p>Servicio no encontrado.</p>
      </div>
    )
  }

  const puedeRevisar = servicio.status === 'finalizado'

  return (
    <div className="app-shell">
      <Topbar title={`Servicio #${servicio.numero_servicio}`} />
      <div className="container">
        <div className="panel row-between">
          <span className={`badge badge-${servicio.status}`}>{STATUS_LABEL[servicio.status]}</span>
          <button type="button" className="btn" onClick={() => navigate('/admin')}>
            Volver
          </button>
        </div>

        {servicio.status === 'rechazado' && servicio.motivo_rechazo && (
          <div className="panel">
            <strong>Motivo de rechazo:</strong> {servicio.motivo_rechazo}
          </div>
        )}

        <ServicioResumen servicio={servicio} />

        {puedeRevisar && (
          <div className="panel">
            <h2>Revisión</h2>
            {error && <p className="field-error">{error}</p>}
            {!mostrarRechazo ? (
              <div className="row">
                <button type="button" className="btn btn-ok" onClick={aprobar} disabled={procesando}>
                  Aprobar
                </button>
                <button type="button" className="btn btn-danger" onClick={() => setMostrarRechazo(true)} disabled={procesando}>
                  Rechazar
                </button>
              </div>
            ) : (
              <div>
                <div className="field">
                  <label htmlFor="motivo">Motivo de rechazo</label>
                  <textarea id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                </div>
                <div className="row">
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={rechazar}
                    disabled={procesando || !motivo.trim()}
                  >
                    Confirmar rechazo
                  </button>
                  <button type="button" className="btn" onClick={() => setMostrarRechazo(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
