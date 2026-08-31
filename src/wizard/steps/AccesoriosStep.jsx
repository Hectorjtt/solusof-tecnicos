import { ACCESORIOS_CATALOG } from '../accesoriosCatalog'
import { useServicioWizard } from '../ServicioWizardContext'

export function AccesoriosStep() {
  const { accesorios, toggleAccesorio, setAccesorioEtiqueta, agregarOtroAccesorio } = useServicioWizard()

  function rowFor(key) {
    return accesorios.find((a) => a.accesorio_key === key)
  }

  const fijos = ACCESORIOS_CATALOG.filter((item) => !item.esPersonalizado)
  // Los "Otro" no están limitados al catálogo fijo (otro_1, otro_2) - se puede
  // agregar más con el botón de abajo, así que se listan directo de lo que
  // ya exista en la base para este servicio.
  const otros = accesorios
    .filter((a) => a.es_personalizado)
    .sort((a, b) => a.accesorio_key.localeCompare(b.accesorio_key, undefined, { numeric: true }))

  return (
    <div className="panel">
      <p className="text-sm muted" style={{ marginTop: 0 }}>
        Lo que marques aquí genera automáticamente su foto pendiente en el
        paso de evidencias fotográficas.
      </p>
      {fijos.map((item) => {
        const row = rowFor(item.key)
        if (!row) return null
        return (
          <div className="checklist-item" key={item.key}>
            <input
              id={`acc-${item.key}`}
              type="checkbox"
              checked={!!row.checked}
              onChange={(e) => toggleAccesorio(item.key, e.target.checked)}
            />
            <label htmlFor={`acc-${item.key}`}>{item.label}</label>
          </div>
        )
      })}
      {otros.map((row) => (
        <div className="checklist-item" key={row.accesorio_key}>
          <input
            id={`acc-${row.accesorio_key}`}
            type="checkbox"
            checked={!!row.checked}
            onChange={(e) => toggleAccesorio(row.accesorio_key, e.target.checked)}
          />
          <label htmlFor={`acc-${row.accesorio_key}`}>Otro:</label>
          <input
            type="text"
            placeholder="Especifica el accesorio"
            value={row.etiqueta ?? ''}
            onChange={(e) => setAccesorioEtiqueta(row.accesorio_key, e.target.value)}
          />
        </div>
      ))}
      <button type="button" className="btn" onClick={agregarOtroAccesorio}>
        + Agregar otro
      </button>
    </div>
  )
}
