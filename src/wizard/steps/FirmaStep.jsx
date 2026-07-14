import { useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { useAuth } from '../../auth/AuthContext'
import { firmaPath, firmaClientePath, subirArchivo } from '../../lib/storage'
import { finalizarServicio } from '../../lib/servicios'
import { useServicioWizard } from '../ServicioWizardContext'

function FirmaPad({ sigRef, onBegin }) {
  return (
    <div className="firma-canvas-wrap">
      <SignatureCanvas
        ref={sigRef}
        penColor="#16213a"
        canvasProps={{ className: 'firma-canvas' }}
        onBegin={onBegin}
        // Por default, react-signature-canvas borra el lienzo en CUALQUIER evento
        // "resize" de window -- y en celular, el teclado abriendo/cerrando (al
        // tocar el campo de nombre) cuenta como resize. Con dos firmas en la misma
        // pantalla, tocar el campo de nombre del técnico borraba la firma del
        // cliente ya puesta (y viceversa). Desactivado: nuestro canvas no depende
        // de recalcular tamaño en caliente.
        clearOnResize={false}
      />
    </div>
  )
}

export function FirmaStep({ servicioId, onFinalizado }) {
  const { profile } = useAuth()
  const { reload, fotos } = useServicioWizard()
  const sigTecnicoRef = useRef(null)
  const sigClienteRef = useRef(null)
  const [nombreTecnico, setNombreTecnico] = useState(profile?.nombre ?? '')
  // No se autollena con el cliente_nombre general del servicio: quien firma
  // en el sitio puede ser otra persona (empleado, chofer, etc.), así que el
  // técnico siempre escribe el nombre real de quien está firmando.
  const [nombreCliente, setNombreCliente] = useState('')
  const [vacioTecnico, setVacioTecnico] = useState(true)
  const [vacioCliente, setVacioCliente] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const fotosFaltantes = fotos.filter((f) => !f.storage_path)

  function limpiarTecnico() {
    sigTecnicoRef.current?.clear()
    setVacioTecnico(true)
  }

  function limpiarCliente() {
    sigClienteRef.current?.clear()
    setVacioCliente(true)
  }

  async function firmaABlob(sigRef) {
    // getTrimmedCanvas() depende de "trim-canvas", que no interopera bien con el
    // pre-bundling de Vite (falla en runtime); usamos el canvas sin recortar.
    const canvas = sigRef.current.getCanvas()
    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  }

  async function finalizar() {
    if (fotosFaltantes.length > 0) {
      setError(
        `Faltan ${fotosFaltantes.length} foto(s) por tomar: ${fotosFaltantes.map((f) => f.etiqueta).join(', ')}.`,
      )
      return
    }
    if (!sigTecnicoRef.current || sigTecnicoRef.current.isEmpty()) {
      setError('Falta la firma del técnico para poder finalizar el servicio.')
      return
    }
    if (!nombreCliente.trim()) {
      setError('Falta el nombre de quien firma como cliente.')
      return
    }
    if (!sigClienteRef.current || sigClienteRef.current.isEmpty()) {
      setError('Falta la firma del cliente para poder finalizar el servicio.')
      return
    }
    setError('')
    setEnviando(true)
    try {
      const [blobTecnico, blobCliente] = await Promise.all([
        firmaABlob(sigTecnicoRef),
        firmaABlob(sigClienteRef),
      ])
      const pathTecnico = firmaPath(servicioId)
      const pathCliente = firmaClientePath(servicioId)
      await Promise.all([subirArchivo(pathTecnico, blobTecnico), subirArchivo(pathCliente, blobCliente)])
      await finalizarServicio(servicioId, {
        tecnico: { storagePath: pathTecnico, nombre: nombreTecnico },
        cliente: { storagePath: pathCliente, nombre: nombreCliente },
      })
      // Recarga completa (no solo el patch de campos top-level de "servicios"):
      // el resumen que se muestra justo después necesita el checklist/accesorios
      // ya guardados, y el estado del contexto no se actualiza solo con eso.
      const actualizado = await reload()
      onFinalizado?.(actualizado)
    } catch (e) {
      setError(e.message ?? 'No se pudo finalizar el servicio. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="panel">
      {fotosFaltantes.length > 0 && (
        <p className="field-error">
          Faltan {fotosFaltantes.length} foto(s) por tomar antes de poder finalizar:{' '}
          {fotosFaltantes.map((f) => f.etiqueta).join(', ')}. Regresa al paso "Evidencias
          fotográficas".
        </p>
      )}

      <h3 style={{ marginTop: 0 }}>Firma del técnico</h3>
      <div className="field">
        <label htmlFor="firma-nombre-tecnico">Nombre del técnico</label>
        <input
          id="firma-nombre-tecnico"
          type="text"
          value={nombreTecnico}
          onChange={(e) => setNombreTecnico(e.target.value)}
        />
      </div>
      <label className="text-sm muted">Firma</label>
      <FirmaPad sigRef={sigTecnicoRef} onBegin={() => setVacioTecnico(false)} />
      <div className="row" style={{ marginTop: 10, marginBottom: 20 }}>
        <button type="button" className="btn" onClick={limpiarTecnico} disabled={vacioTecnico}>
          Limpiar
        </button>
      </div>

      <h3>Firma del cliente</h3>
      <p className="text-sm muted" style={{ marginTop: 0 }}>
        Pásale el celular al cliente para que confirme el servicio con su firma.
      </p>
      <div className="field">
        <label htmlFor="firma-nombre-cliente">Nombre de quien firma</label>
        <input
          id="firma-nombre-cliente"
          type="text"
          placeholder="Nombre de la persona que va a firmar"
          value={nombreCliente}
          onChange={(e) => setNombreCliente(e.target.value)}
        />
      </div>
      <label className="text-sm muted">Firma</label>
      <FirmaPad sigRef={sigClienteRef} onBegin={() => setVacioCliente(false)} />
      <div className="row" style={{ marginTop: 10 }}>
        <button type="button" className="btn" onClick={limpiarCliente} disabled={vacioCliente}>
          Limpiar
        </button>
      </div>

      {error && <p className="field-error">{error}</p>}

      <button
        type="button"
        className="btn btn-primary btn-block btn-lg"
        style={{ marginTop: 18 }}
        onClick={finalizar}
        disabled={enviando || fotosFaltantes.length > 0}
      >
        {enviando ? 'Finalizando…' : 'Finalizar servicio'}
      </button>
    </div>
  )
}
