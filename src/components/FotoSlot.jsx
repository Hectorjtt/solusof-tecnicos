import { useFotoUpload } from '../wizard/hooks/useFotoUpload'

const STATUS_LABEL = {
  subiendo: 'Subiendo…',
  error: 'Reintentar',
  subida: '',
  idle: '',
}

export function FotoSlot({ servicioId, foto }) {
  const { status, previewUrl, remoteUrl, handleFile, retry, quitar } = useFotoUpload(
    servicioId,
    foto,
  )
  const img = previewUrl ?? remoteUrl
  const inputId = `foto-${foto.id}`
  const galleryId = `foto-gal-${foto.id}`

  return (
    <div className={`foto-slot ${img ? 'has-photo' : ''}`}>
      {status !== 'idle' && (
        <span
          className="foto-slot-status"
          style={{
            background: status === 'error' ? 'var(--danger)' : 'var(--accent)',
            color: '#fff',
          }}
        >
          {STATUS_LABEL[status]}
        </span>
      )}

      {img ? (
        <>
          <img src={img} alt={foto.etiqueta} />
          <div className="foto-slot-actions">
            {status === 'error' ? (
              <button type="button" className="btn btn-primary" style={{ minHeight: 32, padding: '4px 10px' }} onClick={retry}>
                Reintentar
              </button>
            ) : (
              <button type="button" className="btn" style={{ minHeight: 32, padding: '4px 10px' }} onClick={quitar}>
                Quitar
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <span aria-hidden style={{ fontSize: 22 }}>
            📷
          </span>
          <span className="foto-slot-label">{foto.etiqueta}</span>
          <div className="row" style={{ gap: 6 }}>
            <label htmlFor={inputId} className="btn btn-ghost" style={{ minHeight: 32, padding: '4px 8px', fontSize: '0.75rem' }}>
              Cámara
            </label>
            <label htmlFor={galleryId} className="btn btn-ghost" style={{ minHeight: 32, padding: '4px 8px', fontSize: '0.75rem' }}>
              Galería
            </label>
          </div>
        </>
      )}

      <input
        id={inputId}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        id={galleryId}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  )
}
