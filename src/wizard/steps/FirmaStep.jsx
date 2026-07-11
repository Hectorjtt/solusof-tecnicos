import { useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { useAuth } from '../../auth/AuthContext'
import { firmaPath, subirArchivo } from '../../lib/storage'
import { finalizarServicio } from '../../lib/servicios'
import { useServicioWizard } from '../ServicioWizardContext'

export function FirmaStep({ servicioId, onFinalizado }) {
  const { profile } = useAuth()
  const { patchServicioLocal } = useServicioWizard()
  const sigRef = useRef(null)
  const [nombre, setNombre] = useState(profile?.nombre ?? '')
  const [vacio, setVacio] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  function limpiar() {
    sigRef.current?.clear()
    setVacio(true)
  }

  async function finalizar() {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      setError('Falta la firma para poder finalizar el servicio.')
      return
    }
    setError('')
    setEnviando(true)
    try {
      // getTrimmedCanvas() depende de "trim-canvas", que no interopera bien con el
      // pre-bundling de Vite (falla en runtime); usamos el canvas sin recortar.
      const canvas = sigRef.current.getCanvas()
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      const path = firmaPath(servicioId)
      await subirArchivo(path, blob)
      const actualizado = await finalizarServicio(servicioId, { storagePath: path, nombre })
      patchServicioLocal(actualizado)
      onFinalizado?.(actualizado)
    } catch (e) {
      setError(e.message ?? 'No se pudo finalizar el servicio. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="panel">
      <div className="field">
        <label htmlFor="firma-nombre">Nombre del técnico</label>
        <input
          id="firma-nombre"
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
      </div>

      <label className="text-sm muted">Firma</label>
      <div className="firma-canvas-wrap">
        <SignatureCanvas
          ref={sigRef}
          penColor="#16213a"
          canvasProps={{ className: 'firma-canvas' }}
          onBegin={() => setVacio(false)}
        />
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <button type="button" className="btn" onClick={limpiar} disabled={vacio}>
          Limpiar
        </button>
      </div>

      {error && <p className="field-error">{error}</p>}

      <button
        type="button"
        className="btn btn-primary btn-block btn-lg"
        style={{ marginTop: 18 }}
        onClick={finalizar}
        disabled={enviando}
      >
        {enviando ? 'Finalizando…' : 'Finalizar servicio'}
      </button>
    </div>
  )
}
