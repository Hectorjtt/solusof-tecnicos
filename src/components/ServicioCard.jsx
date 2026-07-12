import { STATUS_LABEL, formatFecha } from '../lib/estado'

export function ServicioCard({ servicio, onClick, esNuevo }) {
  return (
    <div className="card" onClick={onClick} role="button" tabIndex={0}>
      <div className="card-row">
        <div style={{ minWidth: 0 }}>
          <div className="card-title">{servicio.cliente_nombre}</div>
          <div className="card-sub">
            {[servicio.marca, servicio.modelo].filter(Boolean).join(' ')}
            {servicio.placas ? ` · ${servicio.placas}` : ''}
          </div>
        </div>
        <span className={`badge badge-${servicio.status}`}>{STATUS_LABEL[servicio.status]}</span>
      </div>
      <div className="text-sm muted" style={{ marginTop: 8 }}>
        {formatFecha(servicio.created_at)}
        {servicio.tecnico?.nombre ? ` · Técnico: ${servicio.tecnico.nombre}` : ''}
      </div>
      {esNuevo && (
        <span className="badge badge-asignado" style={{ marginTop: 8, display: 'inline-block' }}>
          Nuevo
        </span>
      )}
    </div>
  )
}
