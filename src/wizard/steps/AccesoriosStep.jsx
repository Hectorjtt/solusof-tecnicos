import { ACCESORIOS_CATALOG } from '../accesoriosCatalog'
import { useServicioWizard } from '../ServicioWizardContext'

export function AccesoriosStep() {
  const { accesorios, toggleAccesorio, setAccesorioEtiqueta } = useServicioWizard()

  function rowFor(key) {
    return accesorios.find((a) => a.accesorio_key === key)
  }

  return (
    <div className="panel">
      <p className="text-sm muted" style={{ marginTop: 0 }}>
        Lo que marques aquí genera automáticamente su foto pendiente en el
        paso de evidencias fotográficas.
      </p>
      {ACCESORIOS_CATALOG.map((item) => {
        const row = rowFor(item.key)
        if (!row) return null
        if (item.esPersonalizado) {
          return (
            <div className="checklist-item" key={item.key}>
              <input
                id={`acc-${item.key}`}
                type="checkbox"
                checked={!!row.checked}
                onChange={(e) => toggleAccesorio(item.key, e.target.checked)}
              />
              <label htmlFor={`acc-${item.key}`}>Otro:</label>
              <input
                type="text"
                placeholder="Especifica el accesorio"
                value={row.etiqueta ?? ''}
                onChange={(e) => setAccesorioEtiqueta(item.key, e.target.value)}
              />
            </div>
          )
        }
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
    </div>
  )
}
