import { STATUS_LABEL, TIPO_SERVICIO_LABEL, formatFecha } from '../lib/estado'

// "Hoy 3:00 p.m." en vez de la fecha completa cuando el día programado es hoy
// -- para detectar de un vistazo qué servicios tocan hoy en la lista.
function formatFechaProgramada(iso) {
  const d = new Date(iso)
  const hora = d.toLocaleTimeString('es-MX', { timeStyle: 'short' })
  const esHoy = d.toDateString() === new Date().toDateString()
  if (esHoy) return `Hoy, ${hora}`
  return `${d.toLocaleDateString('es-MX', { dateStyle: 'medium' })}, ${hora}`
}

/** onEliminar/onRestaurar son opcionales -- solo se pasan cuando quien ve la
 * lista tiene permiso (ver PUEDEN_ELIMINAR en AdminDashboard.jsx). Cuando se
 * pasan, el botón detiene la propagación del click para no abrir el detalle
 * del servicio de paso. */
export function ServicioCard({ servicio, onClick, esNuevo, onEliminar, onRestaurar }) {
  return (
    <div className="card" onClick={onClick} role="button" tabIndex={0}>
      <div className="card-row">
        <div style={{ minWidth: 0 }}>
          <div className="card-title">{servicio.cliente_nombre}</div>
          <div className="card-sub">
            {[
              servicio.tipo_servicio && TIPO_SERVICIO_LABEL[servicio.tipo_servicio],
              servicio.unidad_razon_social,
              servicio.placas,
            ]
              .filter(Boolean)
              .join(' · ')}
          </div>
        </div>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <span className={`badge badge-${servicio.status}`}>{STATUS_LABEL[servicio.status]}</span>
          {onEliminar && (
            <button
              type="button"
              className="btn-icon"
              title="Eliminar (ocultar) servicio"
              onClick={(e) => {
                e.stopPropagation()
                onEliminar(servicio)
              }}
            >
              🗑️
            </button>
          )}
          {onRestaurar && (
            <button
              type="button"
              className="btn-icon"
              title="Restaurar servicio"
              onClick={(e) => {
                e.stopPropagation()
                onRestaurar(servicio)
              }}
            >
              ↩️
            </button>
          )}
        </div>
      </div>
      <div className="text-sm muted" style={{ marginTop: 8 }}>
        {servicio.fecha_programada
          ? `Programado: ${formatFechaProgramada(servicio.fecha_programada)}`
          : formatFecha(servicio.created_at)}
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
