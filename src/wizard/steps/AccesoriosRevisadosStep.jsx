import { ACCESORIOS_CATALOG } from '../accesoriosCatalog'
import { useServicioWizard } from '../ServicioWizardContext'

// Solo para servicios de tipo "revision": mismo catálogo que
// "Accesorios instalados", pero para dejar constancia de qué YA tenía la
// unidad al llegar. A diferencia de ese paso, aquí no se piden fotos.
export function AccesoriosRevisadosStep() {
  const {
    accesoriosRevisados,
    toggleAccesorioRevisado,
    setAccesorioRevisadoEtiqueta,
    agregarOtroAccesorioRevisado,
  } = useServicioWizard()

  function rowFor(key) {
    return accesoriosRevisados.find((a) => a.accesorio_key === key)
  }

  const fijos = ACCESORIOS_CATALOG.filter((item) => !item.esPersonalizado)
  const otros = accesoriosRevisados
    .filter((a) => a.es_personalizado)
    .sort((a, b) => a.accesorio_key.localeCompare(b.accesorio_key, undefined, { numeric: true }))

  return (
    <div className="panel">
      <p className="text-sm muted" style={{ marginTop: 0 }}>
        Marca los accesorios que la unidad ya tenía instalados al llegar. Esto
        no pide fotos — las fotos solo aplican a lo que instales en este servicio.
      </p>
      {fijos.map((item) => {
        const row = rowFor(item.key)
        if (!row) return null
        return (
          <div className="checklist-item" key={item.key}>
            <input
              id={`acc-rev-${item.key}`}
              type="checkbox"
              checked={!!row.checked}
              onChange={(e) => toggleAccesorioRevisado(item.key, e.target.checked)}
            />
            <label htmlFor={`acc-rev-${item.key}`}>{item.label}</label>
          </div>
        )
      })}
      {otros.map((row) => (
        <div className="checklist-item" key={row.accesorio_key}>
          <input
            id={`acc-rev-${row.accesorio_key}`}
            type="checkbox"
            checked={!!row.checked}
            onChange={(e) => toggleAccesorioRevisado(row.accesorio_key, e.target.checked)}
          />
          <label htmlFor={`acc-rev-${row.accesorio_key}`}>Otro:</label>
          <input
            type="text"
            placeholder="Especifica el accesorio"
            value={row.etiqueta ?? ''}
            onChange={(e) => setAccesorioRevisadoEtiqueta(row.accesorio_key, e.target.value)}
          />
        </div>
      ))}
      <button type="button" className="btn" onClick={agregarOtroAccesorioRevisado}>
        + Agregar otro
      </button>
    </div>
  )
}
