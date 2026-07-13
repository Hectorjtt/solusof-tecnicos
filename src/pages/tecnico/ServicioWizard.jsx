import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Topbar } from '../../components/Topbar'
import { ServicioResumen } from '../../components/ServicioResumen'
import { ServicioWizardProvider, useServicioWizard } from '../../wizard/ServicioWizardContext'
import { ServicioWizardShell } from '../../wizard/ServicioWizardShell'
import { iniciarServicio } from '../../lib/servicios'
import { STATUS_LABEL } from '../../lib/estado'

function TarjetaIniciar({ servicio, onIniciado }) {
  const [iniciando, setIniciando] = useState(false)
  const [error, setError] = useState('')

  async function handleIniciar() {
    setError('')
    setIniciando(true)
    try {
      const actualizado = await iniciarServicio(servicio.id)
      onIniciado(actualizado)
    } catch (e) {
      setError(e.message ?? 'No se pudo iniciar el servicio.')
    } finally {
      setIniciando(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <div className="panel">
        <h2>Datos del cliente</h2>
        <p>
          <strong>{servicio.cliente_nombre}</strong>
          <br />
          {servicio.cliente_telefono}
          <br />
          {servicio.cliente_direccion}
        </p>
      </div>
      <div className="panel">
        <h2>Datos del vehículo / unidad</h2>
        <p>
          {servicio.marca} {servicio.modelo} {servicio.anio && `(${servicio.anio})`}
          <br />
          Placas: {servicio.placas || '—'}
          <br />
          VIN/Serie: {servicio.vin_serie || '—'}
          <br />
          IMEI del GPS: {servicio.imei_gps || '—'}
        </p>
      </div>
      {error && <p className="field-error">{error}</p>}
      <button
        type="button"
        className="btn btn-primary btn-block btn-lg"
        onClick={handleIniciar}
        disabled={iniciando}
      >
        {iniciando ? 'Iniciando…' : 'Iniciar servicio'}
      </button>
    </div>
  )
}

function ServicioWizardInner() {
  const navigate = useNavigate()
  const { loading, error, servicio, patchServicioLocal } = useServicioWizard()

  if (loading) {
    return (
      <div className="center-screen">
        <div className="spinner" />
      </div>
    )
  }

  if (error || !servicio) {
    return (
      <div className="center-screen">
        <p className="field-error">{error ?? 'Servicio no encontrado.'}</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Topbar title={`Servicio #${servicio.numero_servicio}`} />

      <div className="container" style={{ flex: 'none', paddingBottom: 0 }}>
        <div className="panel row-between">
          <button type="button" className="btn btn-primary" onClick={() => navigate('/tecnico')}>
            Volver
          </button>
          <span className={`badge badge-${servicio.status}`}>{STATUS_LABEL[servicio.status]}</span>
        </div>
      </div>

      {servicio.status === 'asignado' && (
        <TarjetaIniciar servicio={servicio} onIniciado={patchServicioLocal} />
      )}

      {servicio.status === 'en_progreso' && <ServicioWizardShell servicioId={servicio.id} />}

      {['finalizado', 'aprobado', 'rechazado'].includes(servicio.status) && (
        <div className="container">
          {servicio.status === 'rechazado' && servicio.motivo_rechazo && (
            <div className="panel">
              <strong>Motivo de rechazo:</strong> {servicio.motivo_rechazo}
            </div>
          )}
          <ServicioResumen fotosEditable={servicio.status === 'finalizado'} />
          <button
            type="button"
            className="btn btn-block"
            style={{ marginTop: 14 }}
            onClick={() => navigate('/tecnico')}
          >
            Volver a mis servicios
          </button>
        </div>
      )}
    </div>
  )
}

export default function ServicioWizardPage() {
  const { id } = useParams()
  return (
    <ServicioWizardProvider servicioId={id}>
      <ServicioWizardInner />
    </ServicioWizardProvider>
  )
}
