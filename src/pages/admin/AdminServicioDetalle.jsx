import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Topbar } from '../../components/Topbar'
import { ServicioResumen } from '../../components/ServicioResumen'
import { useAuth } from '../../auth/AuthContext'
import { getServicioCompleto, aprobarServicio, rechazarServicio, guardarReportePdfPath } from '../../lib/servicios'
import { subirArchivo, reportePdfPath, getSignedUrl } from '../../lib/storage'
import { STATUS_LABEL } from '../../lib/estado'

function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function AdminServicioDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [servicio, setServicio] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mostrarRechazo, setMostrarRechazo] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [generandoPdf, setGenerandoPdf] = useState(false)
  const [error, setError] = useState('')

  async function cargar() {
    setLoading(true)
    try {
      const data = await getServicioCompleto(id)
      setServicio(data)
      return data
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function generarYSubirPdf(servicioCompleto) {
    const { generarReportePDF, nombreArchivoReporte } = await import('../../lib/pdfReporte')
    const blob = await generarReportePDF(servicioCompleto)
    const path = reportePdfPath(servicioCompleto.id)
    await subirArchivo(path, new File([blob], 'reporte.pdf', { type: 'application/pdf' }))
    await guardarReportePdfPath(servicioCompleto.id, path)
    return { blob, nombre: nombreArchivoReporte(servicioCompleto) }
  }

  async function aprobar() {
    setError('')
    setProcesando(true)
    try {
      await aprobarServicio(id, profile.id)
      const actualizado = await cargar()
      setGenerandoPdf(true)
      try {
        const { blob, nombre } = await generarYSubirPdf(actualizado)
        descargarBlob(blob, nombre)
        await cargar()
      } catch (pdfErr) {
        setError('El servicio se aprobó, pero no se pudo generar el PDF: ' + (pdfErr.message ?? pdfErr))
      } finally {
        setGenerandoPdf(false)
      }
    } catch (e) {
      setError(e.message ?? 'No se pudo aprobar.')
    } finally {
      setProcesando(false)
    }
  }

  async function descargarPdf() {
    setError('')
    setGenerandoPdf(true)
    try {
      if (servicio.reporte_pdf_storage_path) {
        const url = await getSignedUrl(servicio.reporte_pdf_storage_path)
        window.open(url, '_blank')
      } else {
        const { blob, nombre } = await generarYSubirPdf(servicio)
        descargarBlob(blob, nombre)
        await cargar()
      }
    } catch (e) {
      setError('No se pudo generar el PDF: ' + (e.message ?? e))
    } finally {
      setGenerandoPdf(false)
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
          <div className="row">
            {servicio.status === 'aprobado' && (
              <button type="button" className="btn" onClick={descargarPdf} disabled={generandoPdf}>
                {generandoPdf ? 'Generando…' : 'Descargar PDF'}
              </button>
            )}
            <button type="button" className="btn" onClick={() => navigate('/admin')}>
              Volver
            </button>
          </div>
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
            {generandoPdf && <p className="text-sm muted">Generando el PDF del reporte…</p>}
            {!mostrarRechazo ? (
              <div className="row">
                <button type="button" className="btn btn-ok" onClick={aprobar} disabled={procesando}>
                  {procesando ? 'Procesando…' : 'Aprobar'}
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

        {error && !puedeRevisar && <p className="field-error" style={{ margin: '0 16px 16px' }}>{error}</p>}
      </div>
    </div>
  )
}
