import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Topbar } from '../../components/Topbar'
import { ServicioResumen } from '../../components/ServicioResumen'
import { useAuth } from '../../auth/AuthContext'
import { ServicioWizardProvider, useServicioWizard } from '../../wizard/ServicioWizardContext'
import { aprobarServicio, rechazarServicio, guardarReportePdfPath, sincronizarAprobacionConOS } from '../../lib/servicios'
import { subirArchivo, reportePdfPath, getSignedUrl } from '../../lib/storage'
import { STATUS_LABEL } from '../../lib/estado'

// Lista fija de quién puede quedar registrado como aprobador — son personas
// del negocio, no necesariamente cuentas de esta app (por eso es una lista
// fija en vez de sacarla de "profiles").
const APROBADORES = [
  'Victor Espinosa',
  'Raul Ornelas',
  'Carlos Fragoso',
  'Danae Vergara',
  'Arnoldo Cuevas',
  'Aaron Angeles',
  'Hector Tamez',
  'Eduardo Estrada',
  'Enrique Hernandez',
  'Adan Cruzado',
  'Adrian Zarrabal',
]

// Únicos que pueden seguir editando un servicio ya "aprobado" (para todos los
// demás, aprobado queda cerrado -- ver datosEditable más abajo).
const PUEDEN_EDITAR_APROBADOS = ['hector', 'hector tamez', 'raul ornelas']
function puedeEditarAprobados(nombre) {
  return PUEDEN_EDITAR_APROBADOS.includes((nombre || '').trim().toLowerCase())
}

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

function AdminServicioDetalleInner() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { id } = useParams()
  const { loading, error: loadError, servicio, reload } = useServicioWizard()
  const [mostrarAprobacion, setMostrarAprobacion] = useState(false)
  const [aprobador, setAprobador] = useState('')
  const [mostrarRechazo, setMostrarRechazo] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [generandoPdf, setGenerandoPdf] = useState(false)
  const [error, setError] = useState('')

  async function generarYSubirPdf(servicioCompleto) {
    const { generarReportePDF, nombreArchivoReporte } = await import('../../lib/pdfReporte')
    const blob = await generarReportePDF(servicioCompleto)
    const path = reportePdfPath(servicioCompleto.id)
    await subirArchivo(path, new File([blob], 'reporte.pdf', { type: 'application/pdf' }))
    await guardarReportePdfPath(servicioCompleto.id, path)
    return { blob, nombre: nombreArchivoReporte(servicioCompleto) }
  }

  async function aprobar() {
    if (!aprobador) return
    setError('')
    setProcesando(true)
    try {
      await aprobarServicio(id, profile.id, aprobador)
      sincronizarAprobacionConOS(id)
      setMostrarAprobacion(false)
      setAprobador('')
      const actualizado = await reload()
      setGenerandoPdf(true)
      try {
        const { blob, nombre } = await generarYSubirPdf(actualizado)
        descargarBlob(blob, nombre)
        await reload()
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
      // Hector Tamez / Raul Ornelas pueden editar un servicio ya aprobado --
      // para que "Descargar PDF" refleje esos cambios, se regenera siempre
      // en vez de servir el PDF cacheado de cuando se aprobó originalmente.
      const puedeEditar = puedeEditarAprobados(profile?.nombre)
      if (servicio.reporte_pdf_storage_path && !puedeEditar) {
        const url = await getSignedUrl(servicio.reporte_pdf_storage_path)
        window.open(url, '_blank')
      } else {
        const { blob, nombre } = await generarYSubirPdf(servicio)
        descargarBlob(blob, nombre)
        await reload()
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
      await reload()
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

  if (loadError || !servicio) {
    return (
      <div className="center-screen">
        <p>{loadError ?? 'Servicio no encontrado.'}</p>
      </div>
    )
  }

  // "Aprobar/Rechazar" solo aplica mientras está pendiente de revisión, pero el
  // checklist se puede seguir corrigiendo aunque el servicio ya esté cerrado
  // (aprobado o rechazado) -- is_admin() ya se salta esa restricción en RLS.
  const puedeRevisar = servicio.status === 'finalizado'
  const checklistEditable = true
  // Datos del cliente/vehículo: editables mientras el servicio no esté ya
  // "aprobado" (en progreso, finalizado o rechazado sí se pueden corregir) --
  // salvo Hector Tamez / Raul Ornelas, que pueden seguir editando aunque ya
  // esté aprobado.
  const esEditorPrivilegiado = puedeEditarAprobados(profile?.nombre)
  const datosEditable = servicio.status !== 'aprobado' || esEditorPrivilegiado

  return (
    <div className="app-shell">
      <Topbar title={`Servicio #${servicio.numero_servicio}`} />
      <div className="container">
        <div className="panel row-between">
          <button type="button" className="btn btn-primary" onClick={() => navigate('/admin')}>
            Volver
          </button>
          <div className="row">
            {servicio.status === 'aprobado' && (
              <button type="button" className="btn" onClick={descargarPdf} disabled={generandoPdf}>
                {generandoPdf ? 'Generando…' : 'Descargar PDF'}
              </button>
            )}
            <span className={`badge badge-${servicio.status}`}>{STATUS_LABEL[servicio.status]}</span>
          </div>
        </div>

        {servicio.status === 'rechazado' && servicio.motivo_rechazo && (
          <div className="panel">
            <strong>Motivo de rechazo:</strong> {servicio.motivo_rechazo}
          </div>
        )}

        {servicio.status === 'aprobado' && servicio.aprobado_por_nombre && (
          <div className="panel">
            <strong>Aprobado por:</strong> {servicio.aprobado_por_nombre}
          </div>
        )}

        {checklistEditable && (
          <div className="panel">
            <p className="text-sm muted" style={{ margin: 0 }}>
              Puedes corregir el checklist: marca lo que el técnico haya olvidado,
              desmarca lo que sobre y edita los textos. Los cambios se guardan solos.
            </p>
          </div>
        )}

        <ServicioResumen checklistEditable={checklistEditable} datosEditable={datosEditable} fotosEditable={datosEditable} />

        {puedeRevisar && (
          <div className="panel">
            <h2>Revisión</h2>
            {error && <p className="field-error">{error}</p>}
            {generandoPdf && <p className="text-sm muted">Generando el PDF del reporte…</p>}
            {!mostrarRechazo && !mostrarAprobacion && (
              <div className="row">
                <button type="button" className="btn btn-ok" onClick={() => setMostrarAprobacion(true)} disabled={procesando}>
                  Aprobar
                </button>
                <button type="button" className="btn btn-danger" onClick={() => setMostrarRechazo(true)} disabled={procesando}>
                  Rechazar
                </button>
              </div>
            )}
            {mostrarAprobacion && (
              <div>
                <div className="field">
                  <label htmlFor="aprobador">¿Quién está aprobando este servicio?</label>
                  <select id="aprobador" value={aprobador} onChange={(e) => setAprobador(e.target.value)}>
                    <option value="">Selecciona…</option>
                    {APROBADORES.map((nombre) => (
                      <option key={nombre} value={nombre}>
                        {nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="row">
                  <button
                    type="button"
                    className="btn btn-ok"
                    onClick={aprobar}
                    disabled={procesando || !aprobador}
                  >
                    {procesando ? 'Procesando…' : 'Confirmar aprobación'}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setMostrarAprobacion(false)
                      setAprobador('')
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            {mostrarRechazo && (
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

export default function AdminServicioDetalle() {
  const { id } = useParams()
  return (
    <ServicioWizardProvider servicioId={id} poll>
      <AdminServicioDetalleInner />
    </ServicioWizardProvider>
  )
}
