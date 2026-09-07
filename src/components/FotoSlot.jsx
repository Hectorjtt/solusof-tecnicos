import { useFotoUpload } from '../wizard/hooks/useFotoUpload'

const STATUS_LABEL = {
  subiendo: 'Subiendo…',
  error: 'Reintentar',
  subida: '',
  idle: '',
}

/** onOpen es opcional: si se pasa y la foto ya está subida (no en proceso ni
 * con error), la imagen se puede abrir en grande (ver FotoLightbox en
 * ServicioResumen.jsx) sin interferir con "Quitar"/"Reintentar". */
export function FotoSlot({ servicioId, foto, onOpen }) {
  const { status, previewUrl, remoteUrl, handleFile, retry, quitar } = useFotoUpload(
    servicioId,
    foto,
  )
  const img = previewUrl ?? remoteUrl
  const inputId = `foto-${foto.id}`
  const galleryId = `foto-gal-${foto.id}`
  const puedeAbrir = Boolean(onOpen && img && foto.storage_path && status !== 'subiendo')

  return (
    <div className={`foto-slot ${img ? 'has-photo' : ''}`}>
      <div className="foto-slot-media">
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
            <img
              src={img}
              alt={foto.etiqueta}
              style={puedeAbrir ? { cursor: 'pointer' } : undefined}
              onClick={puedeAbrir ? () => onOpen(foto) : undefined}
            />
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
      <span className="foto-slot-caption">{foto.etiqueta}</span>
    </div>
  )
}
